"use client";

import { useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { IMAGE_SPECS, SPEC_TO_PURPOSE, listSpecs } from "@/lib/image-specs";

const MIME_TO_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const TEST_SKU_ID = "test-sku";

function loadImage(src) {
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

async function sha256Hex(blob) {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function UploadTestArea({ accessKey }) {
  const [specId, setSpecId] = useState("banner-desktop");
  const [sourceUrl, setSourceUrl] = useState(null);
  const sourceImgRef = useRef(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const spec = IMAGE_SPECS[specId];

  function resetFile() {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(null);
    sourceImgRef.current = null;
    setCroppedPixels(null);
    setResult(null);
    setMessage(null);
  }

  async function onFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setMessage(null);
    setResult(null);

    const ext = MIME_TO_EXT[file.type];
    if (!ext || !spec.formats.includes(ext)) {
      setMessage({ kind: "error", text: `文件类型不支持：需要 ${spec.formats.join("/")}` });
      return;
    }
    if (file.size > spec.maxBytes) {
      setMessage({ kind: "error", text: `文件 ${file.size} 字节超过上限 ${spec.maxBytes} 字节` });
      return;
    }

    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      if (img.naturalWidth < spec.minWidth || img.naturalHeight < spec.minHeight) {
        URL.revokeObjectURL(url);
        setMessage({
          kind: "error",
          text: `源图 ${img.naturalWidth}×${img.naturalHeight} 小于最小要求 ${spec.minWidth}×${spec.minHeight}，不做放大`,
        });
        return;
      }
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      setSourceUrl(url);
      sourceImgRef.current = img;
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedPixels(null);
    } catch (err) {
      URL.revokeObjectURL(url);
      setMessage({ kind: "error", text: err?.message || "读取图片失败" });
    }
  }

  async function upload() {
    if (!sourceImgRef.current || !croppedPixels) return;
    setBusy(true);
    setMessage(null);
    try {
      const { x, y, width, height } = croppedPixels;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("浏览器不支持 Canvas");
      ctx.drawImage(sourceImgRef.current, x, y, width, height, 0, 0, canvas.width, canvas.height);

      let mime = spec.exportFormat === "png" ? "image/png" : "image/webp";
      let blob = await toBlob(canvas, mime);
      if (!blob && spec.exportFormat !== "png") {
        mime = "image/jpeg";
        blob = await toBlob(canvas, mime);
      }
      if (!blob) throw new Error("导出裁剪图片失败");
      const extension = MIME_TO_EXT[mime];
      const checksum = await sha256Hex(blob);

      const purpose = SPEC_TO_PURPOSE[specId];
      const tokenRes = await fetch(`/admin/${encodeURIComponent(accessKey)}/api/upload-token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          purpose,
          extension,
          contentType: blob.type,
          skuId: purpose === "card" || purpose === "detail" ? TEST_SKU_ID : undefined,
        }),
      });
      const tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) throw new Error(tokenData?.error || `申请直传地址失败（${tokenRes.status}）`);

      const putRes = await fetch(tokenData.uploadUrl, {
        method: "PUT",
        headers: { "content-type": blob.type },
        body: blob,
      });
      if (!putRes.ok) throw new Error(`直传失败（${putRes.status}）`);

      const validateRes = await fetch(`/admin/${encodeURIComponent(accessKey)}/api/images/validate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ objectKey: tokenData.objectKey, specId, checksum }),
      });
      const validateData = await validateRes.json().catch(() => ({}));
      if (!validateRes.ok) throw new Error(validateData?.error || `校验失败（${validateRes.status}）`);

      setResult(validateData);
      setMessage({ kind: "ok", text: `上传并校验成功：${validateData.objectKey}` });
    } catch (err) {
      setMessage({ kind: "error", text: err?.message || "上传失败" });
    } finally {
      setBusy(false);
    }
  }

  async function cleanup() {
    if (!result?.objectKey) return;
    setBusy(true);
    try {
      const res = await fetch(`/admin/${encodeURIComponent(accessKey)}/api/images/cleanup`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ objectKey: result.objectKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `删除失败（${res.status}）`);
      setMessage({ kind: "ok", text: `已删除测试对象：${result.objectKey}` });
      setResult(null);
    } catch (err) {
      setMessage({ kind: "error", text: err?.message || "删除失败" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-upload-area">
      <div className="admin-upload-field">
        <label htmlFor="upload-spec">上传区</label>
        <select
          id="upload-spec"
          className="admin-upload-select"
          value={specId}
          onChange={(event) => {
            setSpecId(event.target.value);
            resetFile();
          }}
        >
          {listSpecs().map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}（{item.ratio.width}:{item.ratio.height}，最小 {item.minWidth}×{item.minHeight}）
            </option>
          ))}
        </select>
      </div>

      <div className="admin-upload-field">
        <label htmlFor="upload-file">选择图片</label>
        <input
          id="upload-file"
          className="admin-upload-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChange}
          disabled={busy}
        />
      </div>

      {sourceUrl && (
        <div className="admin-crop-card">
          <div className="admin-crop-box">
            <Cropper
              image={sourceUrl}
              crop={crop}
              zoom={zoom}
              aspect={spec.ratio.width / spec.ratio.height}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_area, areaPixels) => setCroppedPixels(areaPixels)}
              showGrid
            />
          </div>
          <div className="admin-crop-zoom">
            <span>缩放</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
            <span>{zoom.toFixed(2)}x</span>
          </div>
          <div className="admin-upload-actions">
            <button type="button" className="admin-check-button" onClick={upload} disabled={busy || !croppedPixels}>
              {busy ? "处理中…" : "确认并上传"}
            </button>
            <button type="button" className="admin-check-button admin-button-ghost" onClick={resetFile} disabled={busy}>
              重新选择
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className={message.kind === "ok" ? "admin-check-ok" : "admin-check-error"}>{message.text}</p>
      )}

      {result && (
        <div className="admin-result">
          <h3>校验结果</h3>
          <p>objectKey：{result.objectKey}</p>
          <p>
            尺寸：{result.width}×{result.height}（{result.format}）
          </p>
          <p>大小：{result.byteSize} 字节</p>
          <button type="button" className="admin-check-button admin-button-ghost" onClick={cleanup} disabled={busy}>
            删除测试对象
          </button>
        </div>
      )}
    </div>
  );
}
