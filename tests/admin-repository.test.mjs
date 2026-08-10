import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, cleanup } from "./helpers.mjs";
import {
  ConflictError,
  ValidationError,
  createOrUpdateTag,
  getProductAggregate,
  listAdminProducts,
  saveProductAggregate,
} from "../lib/repositories/admin.js";
import { products, skuImages, skus, tags } from "../lib/schema/index.js";

const VALIDATE_STUB = async ({ objectKey, specId }) => ({
  width: specId === "card" ? 800 : 1200,
  height: specId === "card" ? 800 : 1500,
  format: "png",
  byteSize: 1234,
  checksum: undefined,
});

function imageMeta(prefix) {
  return { objectKey: `sku/test/${prefix}-${randomUUID()}.png`, checksum: "abc" };
}

function draftProduct(overrides = {}) {
  return {
    name: { cn: "测试商品", en: "Test Product" },
    description: { cn: "介绍", en: "Desc" },
    status: "draft",
    tagIds: [],
    skus: [],
    ...overrides,
  };
}

function publishableSku(position, overrides = {}) {
  return {
    name: { cn: `SKU${position}`, en: `Sku ${position}` },
    tab: { cn: `版本${position}`, en: `V${position}` },
    priceCny: "12.50",
    enabled: true,
    position,
    cardImage: imageMeta(`card-${position}`),
    detailImages: [imageMeta(`detail-${position}-1`)],
    ...overrides,
  };
}

test.after(() => cleanup());

test("saveProductAggregate: 新建草稿（无 SKU）成功", async () => {
  const result = await saveProductAggregate(draftProduct(), { validateImage: VALIDATE_STUB });
  assert.ok(result.id);
  assert.equal(result.status, "draft");
  assert.equal(result.skus.length, 0);
});

test("saveProductAggregate: 新建发布成功并保存标签与图片元数据", async () => {
  const tag = createOrUpdateTag({ nameCn: "稀有" });
  const result = await saveProductAggregate(
    draftProduct({
      status: "published",
      tagIds: [tag.id],
      skus: [publishableSku(1)],
    }),
    { validateImage: VALIDATE_STUB },
  );
  assert.equal(result.status, "published");
  assert.deepEqual(result.tagIds, [tag.id]);
  assert.equal(result.skus.length, 1);
  assert.equal(result.skus[0].cardImage.width, 800);
  assert.equal(result.skus[0].detailImages.length, 1);
  assert.equal(result.skus[0].detailImages[0].height, 1500);
});

test("saveProductAggregate: 缺商品中文名称拒绝", async () => {
  await assert.rejects(
    saveProductAggregate(draftProduct({ name: { cn: "  " } }), { validateImage: VALIDATE_STUB }),
    /商品中文名称必填/,
  );
});

test("saveProductAggregate: 发布但无启用 SKU 拒绝", async () => {
  await assert.rejects(
    saveProductAggregate(
      draftProduct({ status: "published", skus: [{ ...publishableSku(1), enabled: false }] }),
      { validateImage: VALIDATE_STUB },
    ),
    /至少需要一个启用 SKU/,
  );
});

test("saveProductAggregate: 发布时启用 SKU 缺缩略图拒绝", async () => {
  await assert.rejects(
    saveProductAggregate(
      draftProduct({ status: "published", skus: [publishableSku(1, { cardImage: null })] }),
      { validateImage: VALIDATE_STUB },
    ),
    /必须提供列表缩略图/,
  );
});

test("saveProductAggregate: 发布时启用 SKU 缺详情大图拒绝", async () => {
  await assert.rejects(
    saveProductAggregate(
      draftProduct({ status: "published", skus: [publishableSku(1, { detailImages: [] })] }),
      { validateImage: VALIDATE_STUB },
    ),
    /至少一张详情大图/,
  );
});

test("saveProductAggregate: 发布时启用 SKU 缺中文名拒绝", async () => {
  await assert.rejects(
    saveProductAggregate(
      draftProduct({ status: "published", skus: [publishableSku(1, { name: { cn: " " } })] }),
      { validateImage: VALIDATE_STUB },
    ),
    /中文名称必填/,
  );
});

test("saveProductAggregate: SKU 超过 3 个拒绝", async () => {
  const skus4 = [1, 2, 3, 4].map((position) => publishableSku(position));
  await assert.rejects(
    saveProductAggregate(draftProduct({ skus: skus4 }), { validateImage: VALIDATE_STUB }),
    /最多 3 个 SKU/,
  );
});

test("saveProductAggregate: position 重复拒绝", async () => {
  await assert.rejects(
    saveProductAggregate(
      draftProduct({ skus: [publishableSku(1), publishableSku(1, { name: { cn: "SKU2" } })] }),
      { validateImage: VALIDATE_STUB },
    ),
    /排序号不能重复/,
  );
});

test("saveProductAggregate: 价格非法拒绝（负数 / 三位小数）", async () => {
  await assert.rejects(
    saveProductAggregate(
      draftProduct({ skus: [publishableSku(1, { priceCny: "-1" })] }),
      { validateImage: VALIDATE_STUB },
    ),
    /价格必须是/,
  );
  await assert.rejects(
    saveProductAggregate(
      draftProduct({ skus: [publishableSku(1, { priceCny: "12.345" })] }),
      { validateImage: VALIDATE_STUB },
    ),
    /两位小数/,
  );
});

test("saveProductAggregate: updated_at 冲突抛 ConflictError（409）", async () => {
  const created = await saveProductAggregate(draftProduct(), { validateImage: VALIDATE_STUB });
  await assert.rejects(
    saveProductAggregate(
      draftProduct({ id: created.id, updatedAt: "2020-01-01T00:00:00.000Z" }),
      { validateImage: VALIDATE_STUB },
    ),
    (err) => err instanceof ConflictError && /已被其他操作修改/.test(err.message),
  );
});

test("saveProductAggregate: 更新删除旧 SKU 并清理图片引用", async () => {
  const created = await saveProductAggregate(
    draftProduct({
      status: "published",
      skus: [publishableSku(1), publishableSku(2)],
    }),
    { validateImage: VALIDATE_STUB },
  );
  assert.equal(created.skus.length, 2);

  const keptSku = created.skus[0];
  const removedSku = created.skus[1];
  const updated = await saveProductAggregate(
    draftProduct({
      id: created.id,
      updatedAt: created.updatedAt,
      status: "published",
      skus: [publishableSku(1, { id: keptSku.id })],
    }),
    { validateImage: VALIDATE_STUB },
  );
  assert.equal(updated.skus.length, 1);
  assert.equal(updated.skus[0].id, keptSku.id);
  assert.equal(
    db.select().from(skus).where(eq(skus.id, removedSku.id)).get(),
    undefined,
  );
  assert.equal(
    db.select().from(skuImages).where(eq(skuImages.skuId, removedSku.id)).all().length,
    0,
  );
});

test("saveProductAggregate: 引用不属于当前商品的 SKU 拒绝", async () => {
  const other = await saveProductAggregate(
    draftProduct({ skus: [publishableSku(1)] }),
    { validateImage: VALIDATE_STUB },
  );
  const target = await saveProductAggregate(draftProduct(), { validateImage: VALIDATE_STUB });
  await assert.rejects(
    saveProductAggregate(
      draftProduct({ id: target.id, updatedAt: target.updatedAt, skus: [publishableSku(1, { id: other.skus[0].id })] }),
      { validateImage: VALIDATE_STUB },
    ),
    /不属于当前商品/,
  );
});

test("saveProductAggregate: 引用不存在的标签拒绝", async () => {
  await assert.rejects(
    saveProductAggregate(draftProduct({ tagIds: ["tag-not-exist"] }), { validateImage: VALIDATE_STUB }),
    /不存在的标签/,
  );
});

test("createOrUpdateTag: 中文必填、重名拒绝、更新改名成功", () => {
  assert.throws(() => createOrUpdateTag({ nameCn: " " }), /标签中文名称必填/);
  const tag = createOrUpdateTag({ nameCn: "限定", nameEn: "Promo" });
  assert.throws(() => createOrUpdateTag({ nameCn: "限定" }), /已存在/);
  const updated = createOrUpdateTag({ id: tag.id, nameCn: "限量" });
  assert.equal(updated.nameCn, "限量");
  assert.equal(db.select().from(tags).where(eq(tags.id, tag.id)).get().nameEn, "Promo");
});

test("listAdminProducts: 搜索/筛选/分页", async () => {
  await saveProductAggregate(
    draftProduct({ name: { cn: "皮卡丘闪卡", en: "Pikachu" }, status: "published", skus: [publishableSku(1)] }),
    { validateImage: VALIDATE_STUB },
  );
  await saveProductAggregate(
    draftProduct({ name: { cn: "梦幻卡", en: "Mew" }, status: "draft" }),
    { validateImage: VALIDATE_STUB },
  );

  const all = listAdminProducts({ page: 1, pageSize: 20 });
  assert.ok(all.total >= 2);
  const search = listAdminProducts({ query: "皮卡丘", page: 1, pageSize: 20 });
  assert.ok(search.items.every((item) => item.nameCn.includes("皮卡丘") || item.nameEn.includes("皮卡丘")));
  const drafts = listAdminProducts({ status: "draft", page: 1, pageSize: 20 });
  assert.ok(drafts.items.length >= 1);
  assert.ok(drafts.items.every((item) => item.status === "draft"));
  const paged = listAdminProducts({ page: 1, pageSize: 1 });
  assert.equal(paged.items.length, 1);
  assert.equal(paged.totalPages, Math.max(1, Math.ceil(paged.total / 1)));
});

test("getProductAggregate: 不存在返回 null", () => {
  assert.equal(getProductAggregate("product-not-exist"), null);
});
