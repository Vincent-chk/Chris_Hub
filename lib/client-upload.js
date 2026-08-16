// 浏览器端 OSS 直传辅助（阶段 C · C2/C3 共用）
// 流程：裁剪导出 -> 计算 SHA-256 -> 申请签名直传地址 -> fetch PUT -> 服务端校验
import { getSpec } from "./image-specs.js";

export const MIME_TO_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const MB = 1024 * 1024;

// 浏览器端自适应压缩参数（方案 A，零依赖 Canvas）
export const COMPRESS_TARGET_RATIO = 0.9; // 压缩目标 = 大小上限 × 0.9，留出编码余量
export const MIN_COMPRESS_QUALITY = 0.5; // 非 PNG 最低导出质量
export const QUALITY_STEP = 0.1; // 质量每次下降步长
export const DOWNSCALE_FACTOR = 0.75; // 分辨率每次缩放系数
export const MAX_COMPRESS_ATTEMPTS = 20; // 压缩循环安全上限
export const MAX_SOURCE_BYTES = 40 * MB; // 源文件安全上限（仅防浏览器卡死，超限由压缩处理）

// 中台图片预览地址：mock/ 前缀是本地种子图，其余走 /oss/ 代理
export function previewUrl(objectKey) {
  if (!objectKey) return null;
  if (objectKey.startsWith("banners/")) {
    return `/${objectKey}`;
  }
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

function toBlob(canvas, mime, quality = 0.9) {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}

export function formatMegabytes(bytes) {
  return (bytes / MB).toFixed(1);
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
  return { blob, extension, mime, canvas, width: canvas.width, height: canvas.height };
}

// 压缩决策纯函数：返回下一步压缩状态，无法继续压缩时返回 null。
// 非 PNG 先按质量阶梯降质量，降到 MIN_COMPRESS_QUALITY 仍超则降分辨率并把质量重置为 0.85；
// PNG 只降分辨率、不降质量；任何一步都不低于 minWidth/minHeight。
export function nextCompressionStep(state) {
  const { width, height, minWidth, minHeight, quality, isPng } = state;
  const canDownscale = width > minWidth || height > minHeight;
  if (isPng) {
    if (!canDownscale) return null;
    return {
      ...state,
      width: Math.max(minWidth, Math.floor(width * DOWNSCALE_FACTOR)),
      height: Math.max(minHeight, Math.floor(height * DOWNSCALE_FACTOR)),
      downscaled: true,
    };
  }
  if (quality > MIN_COMPRESS_QUALITY) {
    return { ...state, quality: Math.max(MIN_COMPRESS_QUALITY, +(quality - QUALITY_STEP).toFixed(2)) };
  }
  if (!canDownscale) return null;
  return {
    ...state,
    width: Math.max(minWidth, Math.floor(width * DOWNSCALE_FACTOR)),
    height: Math.max(minHeight, Math.floor(height * DOWNSCALE_FACTOR)),
    quality: 0.85,
    downscaled: true,
  };
}

function renderCanvas(sourceCanvas, width, height) {
  if (width === sourceCanvas.width && height === sourceCanvas.height) return sourceCanvas;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("浏览器不支持 Canvas");
  ctx.drawImage(sourceCanvas, 0, 0, width, height);
  return canvas;
}

/**
 * 浏览器端自适应压缩：把导出后的 canvas 压缩到不超过 targetBytes。
 * 返回 { blob, width, height, quality, downscaled }；无法压缩到目标大小时抛错。
 */
export async function compressCanvasToTarget(sourceCanvas, mime, targetBytes, { minWidth, minHeight }) {
  let state = {
    width: sourceCanvas.width,
    height: sourceCanvas.height,
    minWidth,
    minHeight,
    quality: 0.9,
    isPng: mime === "image/png",
    downscaled: false,
  };
  let blob = null;
  for (let attempt = 0; attempt < MAX_COMPRESS_ATTEMPTS; attempt += 1) {
    const canvas = renderCanvas(sourceCanvas, state.width, state.height);
    blob = await toBlob(canvas, mime, state.quality);
    if (blob && blob.size <= targetBytes) {
      return {
        blob,
        width: state.width,
        height: state.height,
        quality: state.quality,
        downscaled: state.downscaled,
      };
    }
    const next = nextCompressionStep(state);
    if (!next) break;
    state = next;
  }
  const limitMb = Math.round(targetBytes / COMPRESS_TARGET_RATIO / MB);
  const detail = mime === "image/png"
    ? `已降至最小尺寸 ${minWidth}×${minHeight}`
    : `已降至最小尺寸 ${minWidth}×${minHeight} 与最低质量`;
  throw new Error(`图片过大且无法自动压缩至 ${limitMb}MB 以内（${detail}），请选择更简单的图片`);
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

// 上传失败时尽力清理刚写入 OSS 的临时对象（失败仅忽略）
async function cleanupUploadedObject({ accessKey, objectKey }) {
  try {
    await fetch(`/admin/${encodeURIComponent(accessKey)}/api/images/cleanup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ objectKey }),
    });
  } catch {
    // 清理失败不影响主流程，孤儿对象由后续任务兜底
  }
}

export async function uploadCroppedImage({
  accessKey,
  specId,
  purpose,
  skuId,
  sourceImg,
  croppedPixels,
  exportFormat,
  maxBytes,
}) {
  const exported = await exportCroppedImage(sourceImg, croppedPixels, exportFormat);
  const { blob: exportedBlob, extension, mime, canvas } = exported;
  let blob = exportedBlob;
  let compression = null;
  // 导出后、上传前的自适应压缩：超上限自动压缩，压缩失败才拒绝（不产生 OSS 对象）
  if (typeof maxBytes === "number" && exportedBlob.size > maxBytes * COMPRESS_TARGET_RATIO) {
    const spec = getSpec(specId);
    const targetBytes = Math.floor(maxBytes * COMPRESS_TARGET_RATIO);
    const compressed = await compressCanvasToTarget(canvas, mime, targetBytes, {
      minWidth: spec.minWidth,
      minHeight: spec.minHeight,
    });
    blob = compressed.blob;
    compression = {
      originalSize: exportedBlob.size,
      finalSize: blob.size,
      width: compressed.width,
      height: compressed.height,
      quality: compressed.quality,
      downscaled: compressed.downscaled,
    };
  }
  const checksum = await sha256Hex(blob);
  const token = await requestUploadToken({ accessKey, purpose, extension, contentType: mime, skuId });
  try {
    await putToOss(token.uploadUrl, blob, mime);
    const meta = await validateUpload({ accessKey, objectKey: token.objectKey, specId, checksum });
    return { meta, compression };
  } catch (err) {
    await cleanupUploadedObject({ accessKey, objectKey: token.objectKey });
    throw err;
  }
}
