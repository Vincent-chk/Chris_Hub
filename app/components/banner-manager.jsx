"use client";

import { useEffect, useState } from "react";
import ImageUploadField from "@/app/components/image-upload-field";

function emptyBanner() {
  return {
    id: undefined,
    desktopImageCn: null,
    desktopImageEn: null,
    mobileImageCn: null,
    mobileImageEn: null,
    enabled: false,
  };
}

export default function BannerManager({ accessKey }) {
  const [banners, setBanners] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(kind, text) {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 4000);
  }

  async function load() {
    try {
      const res = await fetch(`/admin/${encodeURIComponent(accessKey)}/api/banners`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "读取失败");
      setBanners(data.items || []);
    } catch (err) {
      showToast("error", err?.message || "读取 Banner 失败");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessKey]);

  function patchBanner(index, patch) {
    setBanners((prev) => prev.map((banner, i) => (i === index ? { ...banner, ...patch } : banner)));
  }

  function addBanner() {
    if (banners.length >= 5) {
      showToast("error", "Banner 数量已达上限（5 张），可先删除旧 Banner 后再新增");
      return;
    }
    setBanners((prev) => [...prev, emptyBanner()]);
  }

  async function save(banner, index) {
    setBusy(true);
    try {
      const url = banner.id
        ? `/admin/${encodeURIComponent(accessKey)}/api/banners/${banner.id}`
        : `/admin/${encodeURIComponent(accessKey)}/api/banners`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          desktopImageCn: banner.desktopImageCn,
          desktopImageEn: banner.desktopImageEn,
          mobileImageCn: banner.mobileImageCn,
          mobileImageEn: banner.mobileImageEn,
          enabled: banner.enabled,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `保存失败（${res.status}）`);
      patchBanner(index, data.banner);
      showToast("ok", "Banner 已保存");
    } catch (err) {
      showToast("error", err?.message || "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function remove(banner, index) {
    if (!banner.id) {
      setBanners((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    if (!window.confirm("确认删除该 Banner？删除后不可恢复。")) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/admin/${encodeURIComponent(accessKey)}/api/banners/${banner.id}/delete`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `删除失败（${res.status}）`);
      setBanners((prev) => prev.filter((_, i) => i !== index));
      showToast("ok", "Banner 已删除");
    } catch (err) {
      showToast("error", err?.message || "删除失败");
    } finally {
      setBusy(false);
    }
  }

  async function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= banners.length) return;
    const next = [...banners];
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true);
    try {
      const res = await fetch(`/admin/${encodeURIComponent(accessKey)}/api/banners/reorder`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: next.map((banner) => banner.id).filter(Boolean) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `排序失败（${res.status}）`);
      setBanners(data.items || next);
    } catch (err) {
      showToast("error", err?.message || "排序失败");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return <p className="admin-lead">加载中…</p>;
  }

  return (
    <div className="admin-upload-area">
      <div className="admin-form-actions" style={{ marginBottom: 18 }}>
        <button type="button" className="admin-check-button" onClick={addBanner} disabled={busy}>
          新增 Banner
        </button>
        <span className="admin-hint">{banners.length} / 5 张</span>
      </div>

      {banners.map((banner, index) => (
        <div className="admin-sku-card" key={banner.id || `new-${index}`}>
          <div className="admin-sku-head">
            <strong>Banner {index + 1}</strong>
            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={banner.enabled}
                onChange={(e) => patchBanner(index, { enabled: e.target.checked })}
              />
              启用
            </label>
            <div className="admin-sku-actions">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0 || busy} aria-label="前移">
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === banners.length - 1 || busy}
                aria-label="后移"
              >
                ↓
              </button>
              <button type="button" onClick={() => remove(banner, index)} disabled={busy} aria-label="删除">
                删除
              </button>
            </div>
          </div>

          <div className="admin-grid">
            <ImageUploadField
              accessKey={accessKey}
              specId="banner-desktop"
              label="中文桌面图 *"
              maxCount={1}
              images={banner.desktopImageCn ? [banner.desktopImageCn] : []}
              onChange={(arr) => patchBanner(index, { desktopImageCn: arr[0] ?? null })}
            />
            <ImageUploadField
              accessKey={accessKey}
              specId="banner-desktop"
              label="英文桌面图 *"
              maxCount={1}
              images={banner.desktopImageEn ? [banner.desktopImageEn] : []}
              onChange={(arr) => patchBanner(index, { desktopImageEn: arr[0] ?? null })}
            />
            <ImageUploadField
              accessKey={accessKey}
              specId="banner-mobile"
              label="中文移动图（可选）"
              maxCount={1}
              images={banner.mobileImageCn ? [banner.mobileImageCn] : []}
              onChange={(arr) => patchBanner(index, { mobileImageCn: arr[0] ?? null })}
            />
            <ImageUploadField
              accessKey={accessKey}
              specId="banner-mobile"
              label="英文移动图（可选）"
              maxCount={1}
              images={banner.mobileImageEn ? [banner.mobileImageEn] : []}
              onChange={(arr) => patchBanner(index, { mobileImageEn: arr[0] ?? null })}
            />
          </div>

          <div className="admin-upload-actions">
            <button type="button" className="admin-check-button" onClick={() => save(banner, index)} disabled={busy}>
              {busy ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      ))}

      {!banners.length && <p className="admin-hint">还没有 Banner，点击"新增 Banner"创建。</p>}

      {toast && (
        <div className={`admin-toast ${toast.kind === "ok" ? "is-ok" : "is-error"}`} role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}
