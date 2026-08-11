import { test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { cleanup, db } from "./helpers.mjs";
import { banners, products, siteSettings, skuImages, skus } from "../lib/schema/index.js";
import {
  UPLOAD_PREFIXES,
  collectReferencedObjectKeys,
  findOrphanObjectKeys,
  isUploadObjectKey,
} from "../lib/oss/orphans.js";

test.after(() => cleanup());

test("isUploadObjectKey / UPLOAD_PREFIXES: 只认上传前缀", () => {
  assert.deepEqual(UPLOAD_PREFIXES, ["sku/", "banner/", "site/"]);
  assert.equal(isUploadObjectKey("sku/a.png"), true);
  assert.equal(isUploadObjectKey("banner/a.png"), true);
  assert.equal(isUploadObjectKey("site/a.png"), true);
  assert.equal(isUploadObjectKey("test/a.txt"), false);
  assert.equal(isUploadObjectKey("mock/a.svg"), false);
  assert.equal(isUploadObjectKey("banners/a.svg"), false);
  assert.equal(isUploadObjectKey(null), false);
  assert.equal(isUploadObjectKey(""), false);
});

test("collectReferencedObjectKeys: 覆盖 5 类引用键", () => {
  db.insert(products)
    .values({ id: "orphan-p", nameCn: "孤儿测试", status: "draft", descriptionCn: "" })
    .run();
  db.insert(skus)
    .values({
      id: "orphan-s",
      productId: "orphan-p",
      nameCn: "SKU",
      tabLabelCn: "T",
      priceCents: 0,
      position: 1,
      cardImageObjectKey: "sku/ref-b.png",
    })
    .run();
  db.insert(skuImages)
    .values({
      id: "orphan-i",
      skuId: "orphan-s",
      objectKey: "sku/ref-a.png",
      position: 1,
      width: 1,
      height: 1,
      mimeType: "image/png",
      byteSize: 1,
    })
    .run();
  db.insert(banners)
    .values({ id: "orphan-b", purpose: "cn-desktop", objectKey: "banner/ref-c.png", sortOrder: 1 })
    .run();
  db.update(siteSettings)
    .set({ logoObjectKey: "site/ref-d.png", wechatQrObjectKey: "site/ref-e.png" })
    .where(eq(siteSettings.id, 1))
    .run();

  const refs = collectReferencedObjectKeys(db);
  for (const key of [
    "sku/ref-a.png",
    "sku/ref-b.png",
    "banner/ref-c.png",
    "site/ref-d.png",
    "site/ref-e.png",
  ]) {
    assert.ok(refs.has(key), `缺少引用键 ${key}`);
  }
});

test("findOrphanObjectKeys: 只挑未引用的上传前缀键，去重排序，本地/测试前缀排除", () => {
  const objectKeys = [
    "sku/ref-a.png",
    "banner/ref-c.png",
    "site/ref-d.png",
    "sku/orphan.png",
    "banner/orphan.png",
    "site/orphan.png",
    "sku/orphan.png", // 重复项
    "test/smoke.txt",
    "mock/sku/card.svg",
    "banners/seed.svg",
  ];
  const referenced = new Set(["sku/ref-a.png", "banner/ref-c.png", "site/ref-d.png"]);
  assert.deepEqual(findOrphanObjectKeys(objectKeys, referenced), [
    "banner/orphan.png",
    "site/orphan.png",
    "sku/orphan.png",
  ]);
  assert.deepEqual(findOrphanObjectKeys([], referenced), []);
  assert.deepEqual(findOrphanObjectKeys(undefined, referenced), []);
});
