// 浏览器端 OSS 直传辅助（阶段 C · C2/C3 共用）
// 流程：裁剪导出 -> 计算 SHA-256 -> 申请签名直传地址 -> fetch PUT -> 服务端校验

export const MIME_TO_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// 中台图片预览地址：mock/ 前缀是本地种子图，其余走 /oss/ 代理
export function previewUrl(objectKey) {
  if (!objectKey) return null;
  if (objectKey.startsWith("mock/")) {
    return `/products/${objectKey.split("/").pop()}`;
  }
  return `/oss/${objectKey}`;
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("无法解码该图片"));
    img.src = src;
  });
}

function toBlob(canvas, mime) {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, 0.9));
}

export async function sha256Hex(blob) {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function exportCroppedImage(sourceImg, croppedPixels, exportFormat) {
  const { x, y, width, height } = croppedPixels;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("浏览器不支持 Canvas");
  ctx.drawImage(sourceImg, x, y, width, height, 0, 0, canvas.width, canvas.height);

  let mime = exportFormat === "png" ? "image/png" : "image/webp";
  let blob = await toBlob(canvas, mime);
  if (!blob && exportFormat !== "png") {
    mime = "image/jpeg";
    blob = await toBlob(canvas, mime);
  }
  if (!blob) throw new Error("导出裁剪图片失败");
  // 部分浏览器（如 WebKit）对 WebP 导出会返回 type 为空的 Blob，
  // 而签名 URL 是按 mime 计算的；这里把 Blob 类型固定为签名用的 mime。
  if (blob.type !== mime) {
    blob = new Blob([blob], { type: mime });
  }
  const extension = MIME_TO_EXT[mime];
  return { blob, extension, mime };
}

export async function requestUploadToken({ accessKey, purpose, extension, contentType, skuId }) {
  const res = await fetch(`/admin/${encodeURIComponent(accessKey)}/api/upload-token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      purpose,
      extension,
      contentType,
      skuId,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `申请直传地址失败（${res.status}）`);
  return data;
}

export async function putToOss(uploadUrl, blob, contentType) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": contentType || blob.type || "application/octet-stream" },
    body: blob,
  });
  if (!res.ok) throw new Error(`直传失败（${res.status}）`);
}

export async function validateUpload({ accessKey, objectKey, specId, checksum }) {
  const res = await fetch(`/admin/${encodeURIComponent(accessKey)}/api/images/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ objectKey, specId, checksum }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `校验失败（${res.status}）`);
  return data;
}

export async function uploadCroppedImage({ accessKey, specId, purpose, skuId, sourceImg, croppedPixels, exportFormat }) {
  const { blob, extension, mime } = await exportCroppedImage(sourceImg, croppedPixels, exportFormat);
  const checksum = await sha256Hex(blob);
  const token = await requestUploadToken({ accessKey, purpose, extension, contentType: mime, skuId });
  await putToOss(token.uploadUrl, blob, mime);
  return validateUpload({ accessKey, objectKey: token.objectKey, specId, checksum });
}
