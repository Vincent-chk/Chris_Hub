"use client";

import { useEffect, useState } from "react";
import ImageUploadField from "@/app/components/image-upload-field";

export default function SiteSettingsManager({ accessKey }) {
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [wechatId, setWechatId] = useState("");
  const [contactTextCn, setContactTextCn] = useState("");
  const [contactTextEn, setContactTextEn] = useState("");
  const [logoImages, setLogoImages] = useState([]);
  const [qrImages, setQrImages] = useState([]);

  function showToast(kind, text) {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 4000);
  }

  async function load() {
    try {
      const res = await fetch(`/admin/${encodeURIComponent(accessKey)}/api/site-settings`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "读取失败");
      setWechatId(data.wechatId || "");
      setContactTextCn(data.contactTextCn || "");
      setContactTextEn(data.contactTextEn || "");
      setLogoImages(data.logo ? [data.logo] : []);
      setQrImages(data.qr ? [data.qr] : []);
    } catch (err) {
      showToast("error", err?.message || "读取网站设置失败");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessKey]);

  async function save() {
    setBusy(true);
    try {
      const body = {
        wechatId,
        contactTextCn,
        contactTextEn,
        logo: logoImages[0]
          ? { objectKey: logoImages[0].objectKey, checksum: logoImages[0].checksum }
          : null,
        qr: qrImages[0]
          ? { objectKey: qrImages[0].objectKey, checksum: qrImages[0].checksum }
          : null,
      };
      const res = await fetch(`/admin/${encodeURIComponent(accessKey)}/api/site-settings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `保存失败（${res.status}）`);
      await load();
      showToast("ok", "网站设置已保存，前台已生效");
    } catch (err) {
      showToast("error", err?.message || "保存失败");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return <p className="admin-lead">加载中…</p>;
  }

  return (
    <div className="admin-upload-area">
      <div className="admin-page-head">
        <h1 className="admin-title">网站设置</h1>
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">Logo（1:1 · 512×512 · PNG/WebP）</h2>
        <p className="admin-hint">未配置时前台使用默认 Logo；替换旧图会在保存后自动清理。</p>
        <ImageUploadField
          accessKey={accessKey}
          specId="logo"
          label="Logo"
          maxCount={1}
          images={logoImages}
          onChange={setLogoImages}
        />
        {logoImages.length > 0 && (
          <button
            type="button"
            className="admin-check-button admin-button-ghost"
            onClick={() => setLogoImages([])}
            disabled={busy}
          >
            恢复默认 Logo
          </button>
        )}
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">联系方式</h2>
        <div className="admin-field">
          <label className="admin-label" htmlFor="wechat-id">
            微信号（必填）
          </label>
          <input
            id="wechat-id"
            className="admin-input"
            value={wechatId}
            onChange={(event) => setWechatId(event.target.value)}
            placeholder="例如 ChrisHub_Cards"
            maxLength={64}
          />
        </div>
        <div className="admin-grid">
          <div className="admin-field">
            <label className="admin-label" htmlFor="contact-cn">
              中文联系说明
            </label>
            <textarea
              id="contact-cn"
              className="admin-textarea"
              rows={3}
              value={contactTextCn}
              onChange={(event) => setContactTextCn(event.target.value)}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="contact-en">
              英文联系说明
            </label>
            <textarea
              id="contact-en"
              className="admin-textarea"
              rows={3}
              value={contactTextEn}
              onChange={(event) => setContactTextEn(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">微信二维码（1:1 · 800×800）</h2>
        <p className="admin-hint">未配置时前台弹窗显示占位图。</p>
        <ImageUploadField
          accessKey={accessKey}
          specId="qr"
          label="微信二维码"
          maxCount={1}
          images={qrImages}
          onChange={setQrImages}
        />
        {qrImages.length > 0 && (
          <button
            type="button"
            className="admin-check-button admin-button-ghost"
            onClick={() => setQrImages([])}
            disabled={busy}
          >
            移除二维码
          </button>
        )}
      </div>

      <div className="admin-card admin-publish-bar">
        <div className="admin-form-actions">
          <button
            type="button"
            className="admin-check-button"
            onClick={save}
            disabled={busy || !wechatId.trim()}
          >
            {busy ? "保存中…" : "保存"}
          </button>
          {!wechatId.trim() && <span className="admin-hint">微信号必填</span>}
        </div>
      </div>

      {toast && (
        <div className={`admin-toast ${toast.kind === "ok" ? "is-ok" : "is-error"}`} role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}
