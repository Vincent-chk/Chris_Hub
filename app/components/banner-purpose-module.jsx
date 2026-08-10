"use client";

import { useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { IMAGE_SPECS, SPEC_TO_PURPOSE } from "@/lib/image-specs";
import { MIME_TO_EXT, loadImage, previewUrl, uploadCroppedImage } from "@/lib/client-upload";

export default function BannerPurposeModule({
  accessKey,
  label,
  hint,
  specId,
  images,
  maxCount,
  busy,
  onAdd,
  onDelete,
  onReorder,
  onReplace,
  onLimit,
}) {
  const spec = IMAGE_SPECS[specId];
  const fileInputRef = useRef(null);
  const sourceImgRef = useRef(null);
  const [mode, setMode] = useState(null); // { kind: "add" } | { kind: "replace", row }
  const [sourceUrl, setSourceUrl] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState(null);
  const [busyUpload, setBusyUpload] = useState(false);
  const [message, setMessage] = useState(null);

  function openPicker(kind, row) {
    if (busy) return;
    if (kind === "add" && images.length >= maxCount) {
      onLimit();
      return;
    }
    setMode(kind === "add" ? { kind: "add" } : { kind: "replace", row });
    setMessage(null);
    fileInputRef.current?.click();
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

  function resetCrop() {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(null);
    sourceImgRef.current = null;
    setCroppedPixels(null);
    setMode(null);
  }

  async function confirmUpload() {
    if (!sourceImgRef.current || !croppedPixels) return;
    setBusyUpload(true);
    setMessage(null);
    try {
      const meta = await uploadCroppedImage({
        accessKey,
        specId,
        purpose: SPEC_TO_PURPOSE[specId],
        sourceImg: sourceImgRef.current,
        croppedPixels,
        exportFormat: spec.exportFormat,
        maxBytes: spec.maxBytes,
      });
      if (mode?.kind === "replace") {
        await onReplace(mode.row, meta);
      } else {
        await onAdd(meta);
      }
      resetCrop();
    } catch (err) {
      setMessage({ kind: "error", text: err?.message || "上传失败" });
    } finally {
      setBusyUpload(false);
    }
  }

  function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next);
  }

  function remove(row) {
    if (!window.confirm("确认删除这张 Banner 图？删除后不可恢复。")) return;
    onDelete(row);
  }

  return (
    <div className="admin-banner-section">
      <h2>
        {label} <small>{hint}</small>
      </h2>
      <div className="admin-banner-slots">
        {images.map((row, index) => (
          <div className="admin-thumb" key={row.id || row.objectKey}>
            <img src={previewUrl(row.objectKey)} alt="" />
            <span className="admin-thumb-tools">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0 || busy || busyUpload}
                aria-label="前移"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === images.length - 1 || busy || busyUpload}
                aria-label="后移"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => openPicker("replace", row)}
                disabled={busy || busyUpload}
                aria-label="替换"
              >
                换
              </button>
              <button
                type="button"
                onClick={() => remove(row)}
                disabled={busy || busyUpload}
                aria-label="删除"
              >
                ×
              </button>
            </span>
          </div>
        ))}

        <button
          type="button"
          className="admin-add-slot"
          onClick={() => openPicker("add", null)}
          disabled={busy || busyUpload}
          aria-label="添加一张"
        >
          ＋
        </button>
        <input
          ref={fileInputRef}
          className="admin-upload-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChange}
          style={{ display: "none" }}
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
            <button
              type="button"
              className="admin-check-button"
              onClick={confirmUpload}
              disabled={busyUpload || !croppedPixels}
            >
              {busyUpload ? "上传中…" : "确认并上传"}
            </button>
            <button type="button" className="admin-check-button admin-button-ghost" onClick={resetCrop} disabled={busyUpload}>
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
