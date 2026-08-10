"use client";

import { useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { IMAGE_SPECS, SPEC_TO_PURPOSE } from "@/lib/image-specs";
import {
  MIME_TO_EXT,
  MAX_SOURCE_BYTES,
  formatMegabytes,
  loadImage,
  previewUrl,
  uploadCroppedImage,
} from "@/lib/client-upload";

export default function ImageUploadField({
  accessKey,
  specId,
  label,
  maxCount,
  images,
  onChange,
  getSkuId = () => undefined,
  compact = false,
}) {
  const spec = IMAGE_SPECS[specId];
  const sourceImgRef = useRef(null);
  const [sourceUrl, setSourceUrl] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const canAdd = images.length < maxCount;

  function resetCrop() {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(null);
    sourceImgRef.current = null;
    setCroppedPixels(null);
    setMessage(null);
  }

  async function onFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setMessage(null);

    const ext = MIME_TO_EXT[file.type];
    if (!ext || !spec.formats.includes(ext)) {
      setMessage({ kind: "error", text: `文件类型不支持：需要 ${spec.formats.join("/")}` });
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setMessage({ kind: "error", text: `源文件 ${formatMegabytes(file.size)}MB 过大（超过 40MB），请先压缩后再上传` });
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

  async function confirmUpload() {
    if (!sourceImgRef.current || !croppedPixels) return;
    setBusy(true);
    setMessage(null);
    try {
      const { meta, compression } = await uploadCroppedImage({
        accessKey,
        specId,
        purpose: SPEC_TO_PURPOSE[specId],
        skuId: getSkuId(),
        sourceImg: sourceImgRef.current,
        croppedPixels,
        exportFormat: spec.exportFormat,
        maxBytes: spec.maxBytes,
      });
      if (maxCount === 1) {
        onChange([meta]);
      } else {
        onChange([...images, meta]);
      }
      resetCrop();
      setMessage({
        kind: "ok",
        text: compression
          ? `上传成功，已自动压缩至 ${formatMegabytes(compression.finalSize)}MB（原 ${formatMegabytes(compression.originalSize)}MB）`
          : "上传成功",
      });
    } catch (err) {
      setMessage({ kind: "error", text: err?.message || "上传失败" });
    } finally {
      setBusy(false);
    }
  }

  function removeAt(index) {
    onChange(images.filter((_, i) => i !== index));
  }

  function move(index, delta) {
    const next = [...images];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="admin-upload-field">
      <label>{compact ? label : `${label}（${spec.ratio.width}:${spec.ratio.height}，最小 ${spec.minWidth}×${spec.minHeight}）`}</label>

      {images.length > 0 && (
        <div className="admin-thumb-list">
          {images.map((image, index) => (
            <div className="admin-thumb" key={image.objectKey || `img-${index}`}>
              <img src={previewUrl(image.objectKey)} alt="" />
              <span className="admin-thumb-tools">
                {maxCount !== 1 && (
                  <>
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="前移">
                      ↑
                    </button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === images.length - 1} aria-label="后移">
                      ↓
                    </button>
                  </>
                )}
                <button type="button" onClick={() => removeAt(index)} aria-label="删除">
                  ×
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {canAdd && (
        <input
          className="admin-upload-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChange}
          disabled={busy}
        />
      )}
      {!canAdd && <small className="admin-hint">已达数量上限（{maxCount} 张）</small>}

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
            <button type="button" className="admin-check-button" onClick={confirmUpload} disabled={busy || !croppedPixels}>
              {busy ? "上传中…" : "确认并上传"}
            </button>
            <button type="button" className="admin-check-button admin-button-ghost" onClick={resetCrop} disabled={busy}>
              取消
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className={message.kind === "ok" ? "admin-check-ok" : "admin-check-error"}>{message.text}</p>
      )}
    </div>
  );
}
