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

  async function run(action) {
    setBusy(true);
    try {
      await action();
      await load();
    } catch (err) {
      showToast("error", err?.message || "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function post(path, body) {
    const res = await fetch(`/admin/${encodeURIComponent(accessKey)}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `请求失败（${res.status}）`);
    return data;
  }

  function addImage(purpose, meta) {
    return run(() =>
      post(`/api/banners`, { purpose, objectKey: meta.objectKey, checksum: meta.checksum }).then(() =>
        showToast("ok", "Banner 图已添加"),
      ),
    );
  }

  function replaceImage(purpose, row, meta) {
    return run(() =>
      post(`/api/banners/${row.id}`, { objectKey: meta.objectKey, checksum: meta.checksum }).then(() =>
        showToast("ok", "Banner 图已替换"),
      ),
    );
  }

  function deleteImage(purpose, row) {
    return run(() =>
      post(`/api/banners/${row.id}/delete`).then(() => showToast("ok", "Banner 图已删除")),
    );
  }

  function reorderImages(purpose, ids) {
    return run(() => post(`/api/banners/reorder`, { purpose, ids }).then(() => showToast("ok", "顺序已更新")));
  }

  if (!loaded) {
    return <p className="admin-lead">加载中…</p>;
  }

  return (
    <div className="admin-upload-area">
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
          onReorder={(ids) => reorderImages(purpose.id, ids)}
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
