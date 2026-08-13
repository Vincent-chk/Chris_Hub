"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImageUploadField from "@/app/components/image-upload-field";

function newClientKey() {
  return typeof crypto?.randomUUID === "function"
    ? `sku-${crypto.randomUUID()}`
    : `sku-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptySku() {
  return {
    id: undefined,
    clientKey: newClientKey(),
    name: { cn: "", en: "" },
    tab: { cn: "", en: "" },
    priceCny: "",
    enabled: true,
    cardImage: null,
    detailImages: [],
  };
}

export default function ProductForm({ accessKey, productId }) {
  const router = useRouter();
  const isEdit = Boolean(productId);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({
    name: { cn: "", en: "" },
    description: { cn: "", en: "" },
    status: "draft",
    tagIds: [],
    updatedAt: undefined,
  });
  const [skus, setSkus] = useState([]);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState({ nameCn: "", nameEn: "" });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(kind, text) {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    fetch(`/admin/${encodeURIComponent(accessKey)}/api/tags`)
      .then((res) => res.json())
      .then((data) => setTags(data.items || []))
      .catch(() => showToast("error", "读取标签失败"));

    if (isEdit) {
      fetch(`/admin/${encodeURIComponent(accessKey)}/api/products/${productId}`)
        .then(async (res) => {
          if (!res.ok) throw new Error("商品不存在");
          return res.json();
        })
        .then((data) => {
          setForm({
            name: { cn: data.name?.cn ?? "", en: data.name?.en ?? "" },
            description: { cn: data.description?.cn ?? "", en: data.description?.en ?? "" },
            status: data.status || "draft",
            tagIds: data.tagIds || [],
            updatedAt: data.updatedAt,
          });
          setSkus(
            (data.skus || []).map((sku) => ({
              id: sku.id,
              clientKey: sku.id || newClientKey(),
              name: { cn: sku.name?.cn ?? "", en: sku.name?.en ?? "" },
              tab: { cn: sku.tab?.cn ?? "", en: sku.tab?.en ?? "" },
              priceCny: sku.priceCny ?? "",
              enabled: sku.enabled !== false,
              cardImage: sku.cardImage || null,
              detailImages: sku.detailImages || [],
            })),
          );
        })
        .catch((err) => showToast("error", err?.message || "读取商品失败"))
        .finally(() => setLoaded(true));
    } else {
      setLoaded(true);
    }
  }, [accessKey, productId, isEdit]);

  function patchForm(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function patchSku(index, patch) {
    setSkus((prev) => prev.map((sku, i) => (i === index ? { ...sku, ...patch } : sku)));
  }

  function addSku() {
    if (skus.length >= 3) return;
    setSkus((prev) => [...prev, emptySku()]);
  }

  function removeSku(index) {
    setSkus((prev) => prev.filter((_, i) => i !== index));
  }

  function moveSku(index, delta) {
    setSkus((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function toggleTag(tagId) {
    setForm((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  }

  async function createTag() {
    const nameCn = newTag.nameCn.trim();
    if (!nameCn) {
      showToast("error", "标签中文名称必填");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/admin/${encodeURIComponent(accessKey)}/api/tags`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nameCn, nameEn: newTag.nameEn.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "新建标签失败");
      setTags((prev) => [...prev, data.tag]);
      setForm((prev) => ({ ...prev, tagIds: [...prev.tagIds, data.tag.id] }));
      setNewTag({ nameCn: "", nameEn: "" });
      showToast("ok", `标签“${data.tag.nameCn}”已创建并选中`);
    } catch (err) {
      showToast("error", err?.message || "新建标签失败");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    const payload = {
      id: isEdit ? productId : undefined,
      name: { cn: form.name.cn, en: form.name.en },
      description: { cn: form.description.cn, en: form.description.en },
      status: form.status,
      tagIds: form.tagIds,
      updatedAt: form.updatedAt,
      skus: skus.map((sku, index) => ({
        id: sku.id,
        name: sku.name,
        tab: sku.tab,
        priceCny: sku.priceCny,
        enabled: sku.enabled,
        position: index + 1,
        cardImage: sku.cardImage,
        detailImages: sku.detailImages,
      })),
    };
    try {
      const res = await fetch(`/admin/${encodeURIComponent(accessKey)}/api/products`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `保存失败（${res.status}）`);
      const saved = data.product;
      setForm((prev) => ({ ...prev, updatedAt: saved.updatedAt }));
      if (!isEdit) {
        router.replace(`/admin/${accessKey}/products/${saved.id}/edit`);
      }
      showToast("ok", "保存成功");
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
    <section>
      <div className="admin-page-head">
        <h1 className="admin-title">{isEdit ? "编辑商品" : "新建商品"}</h1>
        <Link className="admin-check-button admin-button-ghost" href={`/admin/${accessKey}/products`}>
          返回列表
        </Link>
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">基本信息</h2>
        <div className="admin-grid">
          <div className="admin-field">
            <label className="admin-label" htmlFor="name-cn">中文名称 *</label>
            <input
              id="name-cn"
              className="admin-input"
              value={form.name.cn}
              onChange={(e) => patchForm({ name: { ...form.name, cn: e.target.value } })}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="name-en">英文名称</label>
            <input
              id="name-en"
              className="admin-input"
              value={form.name.en}
              onChange={(e) => patchForm({ name: { ...form.name, en: e.target.value } })}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="desc-cn">中文介绍 *</label>
            <textarea
              id="desc-cn"
              className="admin-textarea"
              rows={3}
              value={form.description.cn}
              onChange={(e) => patchForm({ description: { ...form.description, cn: e.target.value } })}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="desc-en">英文介绍</label>
            <textarea
              id="desc-en"
              className="admin-textarea"
              rows={3}
              value={form.description.en}
              onChange={(e) => patchForm({ description: { ...form.description, en: e.target.value } })}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="status">状态</label>
            <select
              id="status"
              className="admin-select"
              value={form.status}
              onChange={(e) => patchForm({ status: e.target.value })}
            >
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">标签</label>
            <div className="admin-tag-list">
              {tags.map((tag) => (
                <label key={tag.id} className="admin-tag-option">
                  <input
                    type="checkbox"
                    checked={form.tagIds.includes(tag.id)}
                    onChange={() => toggleTag(tag.id)}
                  />
                  {tag.nameCn}
                  {tag.nameEn ? ` / ${tag.nameEn}` : ""}
                </label>
              ))}
              {!tags.length && <small className="admin-hint">暂无标签</small>}
            </div>
            <div className="admin-inline">
              <input
                className="admin-input"
                placeholder="新建标签（中文）"
                value={newTag.nameCn}
                onChange={(e) => setNewTag((prev) => ({ ...prev, nameCn: e.target.value }))}
              />
              <input
                className="admin-input"
                placeholder="英文（选填）"
                value={newTag.nameEn}
                onChange={(e) => setNewTag((prev) => ({ ...prev, nameEn: e.target.value }))}
              />
              <button type="button" className="admin-check-button admin-button-ghost" onClick={createTag} disabled={busy}>
                新建标签
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-head">
          <h2 className="admin-card-title">SKU（最多 3 个）</h2>
          {skus.length >= 3 && <small className="admin-hint">已达 SKU 数量上限（3）</small>}
        </div>

        {skus.map((sku, index) => (
          <div className="admin-sku-card" key={sku.clientKey}>
            <div className="admin-sku-head">
              <strong>版本 {index + 1}</strong>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={sku.enabled}
                  onChange={(e) => patchSku(index, { enabled: e.target.checked })}
                />
                启用
              </label>
              <div className="admin-sku-actions">
                <button type="button" onClick={() => moveSku(index, -1)} disabled={index === 0} aria-label="前移">↑</button>
                <button type="button" onClick={() => moveSku(index, 1)} disabled={index === skus.length - 1} aria-label="后移">↓</button>
                <button type="button" onClick={() => removeSku(index)} aria-label="删除">删除</button>
              </div>
            </div>
            <div className="admin-grid">
              <div className="admin-field">
                <label className="admin-label">中文名称 *</label>
                <input
                  className="admin-input"
                  value={sku.name.cn}
                  onChange={(e) => patchSku(index, { name: { ...sku.name, cn: e.target.value } })}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">英文名称</label>
                <input
                  className="admin-input"
                  value={sku.name.en}
                  onChange={(e) => patchSku(index, { name: { ...sku.name, en: e.target.value } })}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Tab 短标签（中文）*</label>
                <input
                  className="admin-input"
                  value={sku.tab.cn}
                  onChange={(e) => patchSku(index, { tab: { ...sku.tab, cn: e.target.value } })}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Tab 短标签（英文）</label>
                <input
                  className="admin-input"
                  value={sku.tab.en}
                  onChange={(e) => patchSku(index, { tab: { ...sku.tab, en: e.target.value } })}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">价格（元）*</label>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={sku.priceCny}
                  onChange={(e) => patchSku(index, { priceCny: e.target.value })}
                />
              </div>
            </div>

            <ImageUploadField
              accessKey={accessKey}
              specId="card"
              label="列表缩略图（1 张）"
              maxCount={1}
              images={sku.cardImage ? [sku.cardImage] : []}
              onChange={(arr) => patchSku(index, { cardImage: arr[0] ?? null })}
              getSkuId={() => sku.id || sku.clientKey}
            />

            <ImageUploadField
              accessKey={accessKey}
              specId="detail"
              label="详情大图（最多 9 张）"
              maxCount={9}
              images={sku.detailImages}
              onChange={(arr) => patchSku(index, { detailImages: arr })}
              getSkuId={() => sku.id || sku.clientKey}
            />
          </div>
        ))}

        {!skus.length && <p className="admin-hint">还没有 SKU，点击下方按钮添加。</p>}
        {skus.length < 3 && (
          <button type="button" className="admin-check-button admin-button-ghost" onClick={addSku} disabled={busy}>
            添加 SKU
          </button>
        )}
      </div>

      <div className="admin-form-actions">
        <button type="button" className="admin-check-button" onClick={save} disabled={busy}>
          {busy ? "保存中…" : "保存"}
        </button>
        <Link className="admin-check-button admin-button-ghost" href={`/admin/${accessKey}/products`}>
          返回列表
        </Link>
      </div>

      {toast && (
        <div className={`admin-toast ${toast.kind === "ok" ? "is-ok" : "is-error"}`} role="status">
          {toast.text}
        </div>
      )}
    </section>
  );
}
