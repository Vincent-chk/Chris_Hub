"use client";

import { useState } from "react";

export default function DevOpsPanel({ accessKey }) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [result, setResult] = useState(null); // { scanned, referencedCount, items: [{ key, size }] }
  const [cleaned, setCleaned] = useState(false);

  function showToast(kind, text) {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 5000);
  }

  async function detect() {
    setBusy(true);
    setCleaned(false);
    try {
      const res = await fetch(`/admin/${encodeURIComponent(accessKey)}/api/devops/orphans/detect`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `检测失败（${res.status}）`);
      setResult(data);
      showToast("ok", `检测完成：孤儿 ${data.items.length} 个`);
    } catch (err) {
      setResult(null);
      showToast("error", err?.message || "检测失败");
    } finally {
      setBusy(false);
    }
  }

  async function cleanup() {
    if (!result?.items?.length) return;
    if (!window.confirm(`确认清理 ${result.items.length} 个孤儿对象？清理后不可恢复。`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/admin/${encodeURIComponent(accessKey)}/api/devops/orphans/cleanup`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `清理失败（${res.status}）`);
      setCleaned(true);
      setResult(null);
      showToast(
        "ok",
        data.failures?.length
          ? `已清理 ${data.deleted} 个，失败 ${data.failures.length} 个：${data.failures.join(", ")}`
          : `已清理 ${data.deleted} 个孤儿对象`,
      );
    } catch (err) {
      showToast("error", err?.message || "清理失败");
    } finally {
      setBusy(false);
    }
  }

  function formatMb(size) {
    return size ? `${(size / 1024 / 1024).toFixed(1)} MB` : "";
  }

  return (
    <div className="admin-wide">
      <div className="admin-page-head">
        <h1 className="admin-title">开发者运维</h1>
      </div>
      <p className="admin-lead">开发者工具 · 仅限授权人员使用，请谨慎操作。</p>

      <div className="admin-card">
        <h2 className="admin-card-title">孤儿对象检测</h2>
        <p className="admin-hint">
          扫描 OSS 桶中未被数据库引用的上传对象（sku/ banner/ site/）。清理需先检测并人工确认。
        </p>
        <div className="admin-form-actions">
          <button type="button" className="admin-check-button" onClick={detect} disabled={busy}>
            {busy ? "处理中…" : "① 检测孤儿对象"}
          </button>
        </div>

        {result && (
          <div className="devops-result">
            <p className="admin-lead">
              扫描 <strong>{result.scanned}</strong> 个对象 · 引用{" "}
              <strong>{result.referencedCount}</strong> 个 · 孤儿{" "}
              <strong className="devops-orphan-count">{result.items.length}</strong> 个
            </p>
            {result.items.length ? (
              <>
                <ul className="devops-orphan-list">
                  {result.items.map((item) => (
                    <li key={item.key}>
                      <code>{item.key}</code>
                      <span className="devops-orphan-meta">
                        {formatMb(item.size) && <span className="admin-hint">{formatMb(item.size)}</span>}
                        <span className="admin-badge devops-orphan-badge">孤儿</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="admin-form-actions">
                  <button
                    type="button"
                    className="devops-danger-button"
                    onClick={cleanup}
                    disabled={busy}
                  >
                    {busy ? "清理中…" : `② 确认清理 ${result.items.length} 个孤儿对象`}
                  </button>
                </div>
              </>
            ) : (
              <p className="admin-lead">未发现孤儿对象。</p>
            )}
          </div>
        )}

        {cleaned && (
          <p className="admin-check-ok">清理完成，可再次点击"① 检测孤儿对象"确认结果。</p>
        )}
        <p className="admin-hint">
          清理不可恢复；仅删除 sku/ banner/ site/ 且未被数据库引用的对象；test/ mock/ banners/ 不受影响。
        </p>
      </div>

      {toast && (
        <div className={`admin-toast ${toast.kind === "ok" ? "is-ok" : "is-error"}`} role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}
