"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

export default function TagManager({ accessKey }) {
  const [tags, setTags] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [editor, setEditor] = useState(null); // null | { id?, nameCn, nameEn }
  const [drawer, setDrawer] = useState(null); // null | { tagId, nameCn, productCount }
  const [drawerItems, setDrawerItems] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  function showToast(kind, text) {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 4000);
  }

  async function load() {
    try {
      const res = await fetch(`/admin/${encodeURIComponent(accessKey)}/api/tags?all=1`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "读取失败");
      setTags(data.items || []);
    } catch (err) {
      showToast("error", err?.message || "读取标签失败");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessKey]);

  function openCreate() {
    setEditor({ id: undefined, nameCn: "", nameEn: "" });
  }

  function openEdit(tag) {
    setEditor({ id: tag.id, nameCn: tag.nameCn, nameEn: tag.nameEn || "" });
  }

  async function save() {
    if (!editor?.nameCn?.trim()) {
      showToast("error", "标签中文名称必填");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/admin/${encodeURIComponent(accessKey)}/api/tags`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: editor.id,
          nameCn: editor.nameCn.trim(),
          nameEn: editor.nameEn.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `保存失败（${res.status}）`);
      await load();
      setEditor(null);
      showToast("ok", editor.id ? "标签已更新" : "标签已创建");
    } catch (err) {
      showToast("error", err?.message || "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(tag) {
    setBusy(true);
    try {
      const res = await fetch(
        `/admin/${encodeURIComponent(accessKey)}/api/tags/${encodeURIComponent(tag.id)}/toggle`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ enabled: !tag.enabled }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `操作失败（${res.status}）`);
      setTags((prev) =>
        prev.map((item) => (item.id === tag.id ? { ...item, enabled: data.tag.enabled } : item)),
      );
      showToast("ok", data.tag.enabled ? `标签“${tag.nameCn}”已启用` : `标签“${tag.nameCn}”已停用`);
    } catch (err) {
      showToast("error", err?.message || "操作失败");
    } finally {
      setBusy(false);
    }
  }

  async function openDrawer(tag) {
    setDrawer({ tagId: tag.id, nameCn: tag.nameCn, productCount: tag.productCount });
    setDrawerItems(null);
    setDrawerLoading(true);
    try {
      const res = await fetch(
        `/admin/${encodeURIComponent(accessKey)}/api/tags/${encodeURIComponent(tag.id)}/products`,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `读取失败（${res.status}）`);
      setDrawerItems(data.items || []);
    } catch (err) {
      setDrawer(null);
      showToast("error", err?.message || "读取绑定商品失败");
    } finally {
      setDrawerLoading(false);
    }
  }

  function closeDrawer() {
    setDrawer(null);
    setDrawerItems(null);
  }

  if (!loaded) {
    return <p className="admin-lead">加载中…</p>;
  }

  return (
    <div className="admin-upload-area">
      <div className="admin-page-head">
        <h1 className="admin-title">标签管理</h1>
        <button type="button" className="admin-check-button" onClick={openCreate} disabled={busy}>
          ＋ 新建标签
        </button>
      </div>

      {editor && (
        <div className="admin-card">
          <h2 className="admin-card-title">{editor.id ? "编辑标签" : "新建标签"}</h2>
          <div className="admin-grid">
            <div className="admin-field">
              <label className="admin-label" htmlFor="tag-cn">
                中文名称 *
              </label>
              <input
                id="tag-cn"
                className="admin-input"
                value={editor.nameCn}
                onChange={(event) => setEditor({ ...editor, nameCn: event.target.value })}
                maxLength={40}
                placeholder="例如：稀有"
              />
            </div>
            <div className="admin-field">
              <label className="admin-label" htmlFor="tag-en">
                英文名称（选填）
              </label>
              <input
                id="tag-en"
                className="admin-input"
                value={editor.nameEn}
                onChange={(event) => setEditor({ ...editor, nameEn: event.target.value })}
                maxLength={60}
                placeholder="例如：Rare"
              />
            </div>
          </div>
          <div className="admin-form-actions">
            <button
              type="button"
              className="admin-check-button"
              onClick={save}
              disabled={busy || !editor.nameCn.trim()}
            >
              {busy ? "保存中…" : "保存"}
            </button>
            <button
              type="button"
              className="admin-check-button admin-button-ghost"
              onClick={() => setEditor(null)}
              disabled={busy}
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>中文名称</th>
              <th>英文名称</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>绑定商品数</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr key={tag.id}>
                <td>
                  <strong>{tag.nameCn}</strong>
                </td>
                <td>{tag.nameEn || <span className="admin-hint">—</span>}</td>
                <td>
                  <span className={`admin-badge ${tag.enabled ? "is-published" : ""}`}>
                    {tag.enabled ? "启用" : "停用"}
                  </span>
                </td>
                <td>{tag.updatedAt?.slice(0, 19).replace("T", " ")}</td>
                <td>
                  <strong>{tag.productCount}</strong>
                </td>
                <td>
                  <div className="admin-sku-actions">
                    <button type="button" onClick={() => openEdit(tag)} disabled={busy}>
                      编辑
                    </button>
                    <button type="button" onClick={() => toggle(tag)} disabled={busy}>
                      {tag.enabled ? "停用" : "启用"}
                    </button>
                    <button
                      type="button"
                      className="admin-blue-button"
                      onClick={() => openDrawer(tag)}
                      disabled={busy}
                    >
                      查看绑定商品
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!tags.length && (
              <tr>
                <td colSpan={5} className="admin-empty">
                  暂无标签
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="admin-hint">
          共 {tags.length} 个标签 · 停用标签不会出现在前台筛选，商品原有勾选关系保留。
        </p>
      </div>

      {toast && (
        <div className={`admin-toast ${toast.kind === "ok" ? "is-ok" : "is-error"}`} role="status">
          {toast.text}
        </div>
      )}

      {drawer && (
        <>
          <div className="admin-drawer-backdrop" onClick={closeDrawer} />
          <aside className="admin-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
            <div className="admin-drawer-head">
              <h2 id="drawer-title">
                {drawer.nameCn} · 绑定商品（{drawer.productCount}）
              </h2>
              <button
                type="button"
                className="icon-button modal-close"
                aria-label="关闭"
                title="关闭"
                onClick={closeDrawer}
              >
                <X size={18} />
              </button>
            </div>
            <p className="admin-hint">商品基本信息（暂不跳转详情）</p>
            {drawerLoading ? (
              <p className="admin-lead">加载中…</p>
            ) : drawerItems?.length ? (
              <ul className="admin-drawer-list">
                {drawerItems.map((product) => (
                  <li key={product.id}>
                    <strong>{product.nameCn}</strong>
                    {product.nameEn && <span className="admin-hint">{product.nameEn}</span>}
                    <span>
                      <span className={`admin-badge ${product.status === "published" ? "is-published" : ""}`}>
                        {product.status === "published" ? "已发布" : "草稿"}
                      </span>
                      <span className="admin-hint">
                        {" "}
                        {product.updatedAt?.slice(0, 19).replace("T", " ")}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="admin-lead">该标签暂无绑定商品</p>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
