"use client";

import { useEffect, useState } from "react";
import BannerPurposeModule from "@/app/components/banner-purpose-module";

const PURPOSES = [
  { id: "cn-desktop", label: "中文桌面图", hint: "必填 · 1.72:1（每 3 秒自动切换）", specId: "banner-desktop" },
  { id: "en-desktop", label: "英文桌面图", hint: "必填 · 1.72:1（每 3 秒自动切换）", specId: "banner-desktop" },
  { id: "cn-mobile", label: "中文移动图", hint: "可选 · 1.2:1（未上传时前台回退桌面图）", specId: "banner-mobile" },
  { id: "en-mobile", label: "英文移动图", hint: "可选 · 1.2:1（未上传时前台回退桌面图）", specId: "banner-mobile" },
];

export default function BannerManager({ accessKey }) {
  const [groups, setGroups] = useState({});
  const [committed, setCommitted] = useState("");
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
      const next = { "cn-desktop": [], "en-desktop": [], "cn-mobile": [], "en-mobile": [] };
      for (const item of data.items || []) {
        if (next[item.purpose]) next[item.purpose].push(item);
      }
      setGroups(next);
      setCommitted(JSON.stringify(next));
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

  const dirty = loaded && JSON.stringify(groups) !== committed;

  // 离开页面时若有未发布修改，提示用户（暂存态不会写入数据库，页面关闭即丢弃）
  useEffect(() => {
    if (!dirty) return;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ---- 以下操作只修改本地暂存态，不触库 ----
  function addImage(purpose, meta) {
    setGroups((prev) => ({ ...prev, [purpose]: [...(prev[purpose] || []), meta] }));
  }

  function deleteImage(purpose, row) {
    setGroups((prev) => ({
      ...prev,
      [purpose]: (prev[purpose] || []).filter((item) =>
        row.id ? item.id !== row.id : item.objectKey !== row.objectKey,
      ),
    }));
  }

  function replaceImage(purpose, row, meta) {
    setGroups((prev) => ({
      ...prev,
      [purpose]: (prev[purpose] || []).map((item) => {
        const same = row.id ? item.id === row.id : item.objectKey === row.objectKey;
        return same ? { ...item, ...meta } : item;
      }),
    }));
  }

  function reorderImages(purpose, nextRows) {
    setGroups((prev) => ({ ...prev, [purpose]: nextRows }));
  }

  async function publish() {
    setBusy(true);
    try {
      const res = await fetch(`/admin/${encodeURIComponent(accessKey)}/api/banners/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ purposes: groups }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `发布失败（${res.status}）`);
      await load();
      showToast("ok", "已保存并发布");
    } catch (err) {
      showToast("error", err?.message || "发布失败");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (dirty && !window.confirm("放弃未发布的修改？")) return;
    setBusy(true);
    try {
      await load();
      showToast("ok", "已取消修改，恢复为已发布内容");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return <p className="admin-lead">加载中…</p>;
  }

  return (
    <div className="admin-upload-area">
      <div className="admin-card admin-publish-bar">
        <div className="admin-form-actions">
          <button
            type="button"
            className="admin-check-button"
            onClick={publish}
            disabled={busy || !dirty}
          >
            {busy ? "处理中…" : "保存并发布"}
          </button>
          <button
            type="button"
            className="admin-check-button admin-button-ghost"
            onClick={cancel}
            disabled={busy || !dirty}
          >
            取消
          </button>
          <span className="admin-hint">
            {dirty ? "有未发布的修改（仅暂存，点击“保存并发布”后前台才生效）" : "暂无未发布修改"}
          </span>
        </div>
      </div>

      {PURPOSES.map((purpose) => (
        <BannerPurposeModule
          key={purpose.id}
          accessKey={accessKey}
          label={purpose.label}
          hint={purpose.hint}
          specId={purpose.specId}
          images={groups[purpose.id] || []}
          maxCount={5}
          busy={busy}
          onAdd={(meta) => addImage(purpose.id, meta)}
          onDelete={(row) => deleteImage(purpose.id, row)}
          onReorder={(nextRows) => reorderImages(purpose.id, nextRows)}
          onReplace={(row, meta) => replaceImage(purpose.id, row, meta)}
          onLimit={() => showToast("error", "该用途 Banner 数量已达上限（5 张），可先删除旧图后再添加")}
        />
      ))}

      {toast && (
        <div className={`admin-toast ${toast.kind === "ok" ? "is-ok" : "is-error"}`} role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}
