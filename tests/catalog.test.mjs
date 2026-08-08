import { after, test } from "node:test";
import assert from "node:assert/strict";
// 必须先于 repository 导入（helpers 会先设置 DATABASE_PATH 再加载连接）
import { cleanup, db, sqlite } from "./helpers.mjs";
import {
  getHomeData,
  getProductDetail,
  incrementProductView,
  listEnabledTags,
  listProducts,
} from "../lib/repositories/catalog.js";
import { products, skuImages, skus, tags } from "../lib/schema/index.js";

after(cleanup);

function insertCatalogFixtures() {
  db.insert(tags)
    .values([
      { id: "t1", nameCn: "宝可梦", nameEn: "Pokémon", enabled: 1 },
      { id: "t2", nameCn: "限定", nameEn: "Promo", enabled: 1 },
    ])
    .run();
  db.insert(products)
    .values([
      { id: "p1", nameCn: "宝可梦皮卡丘纪念卡", nameEn: "Pikachu Commemorative Card", descriptionCn: "中文介绍", descriptionEn: "English description", status: "published", viewCount: 100, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" },
      { id: "p2", nameCn: "火焰鸟限定卡", nameEn: null, descriptionCn: "介绍二", descriptionEn: null, status: "published", viewCount: 50, createdAt: "2026-07-02T00:00:00.000Z", updatedAt: "2026-07-02T00:00:00.000Z" },
      { id: "p3", nameCn: "草稿商品", nameEn: "Draft Item", descriptionCn: "草稿", status: "draft", viewCount: 5, createdAt: "2026-07-03T00:00:00.000Z", updatedAt: "2026-07-03T00:00:00.000Z" },
      { id: "p4", nameCn: "限定新卡", nameEn: "Promo New", descriptionCn: "介绍四", status: "published", viewCount: 10, createdAt: "2026-07-04T00:00:00.000Z", updatedAt: "2026-07-04T00:00:00.000Z" },
    ])
    .run();
  db.insert(skus)
    .values([
      { id: "s1", productId: "p1", nameCn: "标准版", nameEn: "Standard", tabLabelCn: "标准版", tabLabelEn: "Standard", priceCents: 3900, position: 1, enabled: 1, cardImageObjectKey: "mock/s1/card-01.svg", cardImageWidth: 720, cardImageHeight: 860, cardImageMimeType: "image/svg+xml", cardImageByteSize: 100 },
      { id: "s2", productId: "p1", nameCn: "闪卡版", nameEn: "Foil", tabLabelCn: "闪卡版", tabLabelEn: "Foil", priceCents: 8900, position: 2, enabled: 1, cardImageObjectKey: "mock/s2/card-02.svg", cardImageWidth: 720, cardImageHeight: 860, cardImageMimeType: "image/svg+xml", cardImageByteSize: 100 },
      { id: "s3", productId: "p2", nameCn: "火焰鸟限定卡", nameEn: null, tabLabelCn: "限定版", tabLabelEn: null, priceCents: 12900, position: 1, enabled: 1, cardImageObjectKey: "mock/s3/card-03.svg", cardImageWidth: 720, cardImageHeight: 860, cardImageMimeType: "image/svg+xml", cardImageByteSize: 100 },
      { id: "s4", productId: "p3", nameCn: "草稿SKU", nameEn: null, tabLabelCn: "草稿", tabLabelEn: null, priceCents: 100, position: 1, enabled: 1, cardImageObjectKey: "mock/s4/card-04.svg", cardImageWidth: 720, cardImageHeight: 860, cardImageMimeType: "image/svg+xml", cardImageByteSize: 100 },
      { id: "s5", productId: "p4", nameCn: "限定新卡", nameEn: null, tabLabelCn: "限定", tabLabelEn: null, priceCents: 5000, position: 1, enabled: 1, cardImageObjectKey: "mock/s5/card-05.svg", cardImageWidth: 720, cardImageHeight: 860, cardImageMimeType: "image/svg+xml", cardImageByteSize: 100 },
    ])
    .run();
  db.insert(skuImages)
    .values([
      { id: "img1", skuId: "s1", objectKey: "mock/s1/card-01.svg", position: 1, width: 720, height: 860, mimeType: "image/svg+xml", byteSize: 100 },
      { id: "img2", skuId: "s2", objectKey: "mock/s2/card-02.svg", position: 1, width: 720, height: 860, mimeType: "image/svg+xml", byteSize: 100 },
      { id: "img3", skuId: "s3", objectKey: "mock/s3/card-03.svg", position: 1, width: 720, height: 860, mimeType: "image/svg+xml", byteSize: 100 },
      { id: "img4", skuId: "s4", objectKey: "mock/s4/card-04.svg", position: 1, width: 720, height: 860, mimeType: "image/svg+xml", byteSize: 100 },
      { id: "img5", skuId: "s5", objectKey: "mock/s5/card-05.svg", position: 1, width: 720, height: 860, mimeType: "image/svg+xml", byteSize: 100 },
    ])
    .run();
  sqlite
    .prepare("INSERT INTO product_tags (product_id, tag_id) VALUES (?, ?)")
    .run("p1", "t1");
  sqlite.prepare("INSERT INTO product_tags (product_id, tag_id) VALUES (?, ?)").run("p1", "t2");
  sqlite.prepare("INSERT INTO product_tags (product_id, tag_id) VALUES (?, ?)").run("p2", "t1");
  sqlite.prepare("INSERT INTO product_tags (product_id, tag_id) VALUES (?, ?)").run("p4", "t2");
}

test("listProducts: default pagination and latest sort", () => {
  insertCatalogFixtures();
  const result = listProducts({ locale: "cn" });
  assert.equal(result.total, 3);
  assert.equal(result.pageSize, 20);
  assert.equal(result.totalPages, 1);
  assert.equal(result.page, 1);
  assert.deepEqual(result.items.map((item) => item.id), ["p4", "p2", "p1"]);
});

test("listProducts: search contains and case-insensitive", () => {
  assert.equal(listProducts({ locale: "cn", query: "宝可梦" }).total, 1);
  assert.equal(listProducts({ locale: "cn", query: "pikachu" }).total, 1);
  assert.equal(listProducts({ locale: "cn", query: "PIKACHU" }).total, 1);
  assert.equal(listProducts({ locale: "cn", query: "  宝可梦  " }).total, 1);
});

test("listProducts: tag OR filter", () => {
  assert.equal(listProducts({ locale: "cn", tagIds: ["t1"] }).total, 2);
  assert.equal(listProducts({ locale: "cn", tagIds: ["t2"] }).total, 2);
  assert.equal(listProducts({ locale: "cn", tagIds: ["t1", "t2"] }).total, 3);
});

test("listProducts: hot sort", () => {
  const result = listProducts({ locale: "cn", sort: "hot" });
  assert.deepEqual(result.items.map((item) => item.id), ["p1", "p2", "p4"]);
});

test("listProducts: pagination boundaries", () => {
  const page1 = listProducts({ locale: "cn", pageSize: 2, page: 1 });
  assert.equal(page1.pageSize, 2);
  assert.equal(page1.totalPages, 2);
  assert.equal(page1.items.length, 2);
  const page2 = listProducts({ locale: "cn", pageSize: 2, page: 2 });
  assert.equal(page2.items.length, 1);
  assert.equal(page2.page, 2);
  const clamped = listProducts({ locale: "cn", pageSize: 2, page: 99 });
  assert.equal(clamped.page, 2);
  const sizeClamped = listProducts({ locale: "cn", pageSize: 100 });
  assert.equal(sizeClamped.pageSize, 20);
});

test("listProducts runs bounded SQL (no N+1)", () => {
  const orig = sqlite.prepare.bind(sqlite);
  let count = 0;
  sqlite.prepare = (...args) => {
    count += 1;
    return orig(...args);
  };
  try {
    listProducts({ locale: "cn" });
  } finally {
    sqlite.prepare = orig;
  }
  assert.ok(count <= 9, `SQL 条数 ${count} 应 <= 9`);
});

test("draft products are not readable", () => {
  assert.equal(listProducts({ locale: "cn" }).items.some((item) => item.id === "p3"), false);
  assert.equal(getHomeData("cn").popularProducts.some((item) => item.id === "p3"), false);
  assert.equal(getProductDetail({ productId: "p3", locale: "cn" }), null);
});

test("getProductDetail: complete published product", () => {
  const detail = getProductDetail({ productId: "p1", locale: "cn" });
  assert.equal(detail.name, "宝可梦皮卡丘纪念卡");
  assert.equal(detail.description, "中文介绍");
  assert.deepEqual(detail.tags, ["宝可梦", "限定"]);
  assert.deepEqual(detail.skus.map((sku) => sku.id), ["s1", "s2"]);
  assert.equal(detail.skus[0].price, 3900);
  assert.equal(detail.skus[0].cardImage, "/products/card-01.svg");
  assert.deepEqual(detail.skus[0].detailImages, ["/products/card-01.svg"]);
});

test("getProductDetail: english fallback", () => {
  const detail = getProductDetail({ productId: "p2", locale: "en" });
  assert.equal(detail.name, "火焰鸟限定卡");
  assert.equal(detail.description, "介绍二");
});

test("getProductDetail: incomplete products return null", () => {
  db.insert(products)
    .values([
      { id: "p5", nameCn: "无SKU", status: "published", viewCount: 1 },
      { id: "p6", nameCn: "SKU无图", status: "published", viewCount: 1 },
    ])
    .run();
  db.insert(skus)
    .values({ id: "s6", productId: "p6", nameCn: "无图SKU", tabLabelCn: "无图", priceCents: 100, position: 1, enabled: 1 })
    .run();
  assert.equal(getProductDetail({ productId: "p5", locale: "cn" }), null);
  assert.equal(getProductDetail({ productId: "p6", locale: "cn" }), null);
});

test("incrementProductView: atomic and updated_at unchanged", () => {
  const before = sqlite.prepare("SELECT view_count, updated_at FROM products WHERE id='p1'").get();
  incrementProductView("p1");
  incrementProductView("p1");
  incrementProductView("p1");
  const after = sqlite.prepare("SELECT view_count, updated_at FROM products WHERE id='p1'").get();
  assert.equal(after.view_count, before.view_count + 3);
  assert.equal(after.updated_at, before.updated_at);
});

test("incrementProductView: draft not counted", () => {
  const before = sqlite.prepare("SELECT view_count FROM products WHERE id='p3'").get().view_count;
  incrementProductView("p3");
  assert.equal(sqlite.prepare("SELECT view_count FROM products WHERE id='p3'").get().view_count, before);
});

test("constraints: fourth SKU rejected and duplicate position rejected", () => {
  db.insert(products).values({ id: "p7", nameCn: "约束商品", status: "published" }).run();
  db.insert(skus)
    .values([
      { id: "s7-1", productId: "p7", nameCn: "一", tabLabelCn: "一", priceCents: 100, position: 1, enabled: 1 },
      { id: "s7-2", productId: "p7", nameCn: "二", tabLabelCn: "二", priceCents: 100, position: 2, enabled: 1 },
      { id: "s7-3", productId: "p7", nameCn: "三", tabLabelCn: "三", priceCents: 100, position: 3, enabled: 1 },
    ])
    .run();
  assert.throws(() =>
    db.insert(skus)
      .values({ id: "s7-4", productId: "p7", nameCn: "四", tabLabelCn: "四", priceCents: 100, position: 4, enabled: 1 })
      .run(),
  );
  assert.throws(() =>
    db.insert(skus)
      .values({ id: "s7-dup", productId: "p7", nameCn: "重复", tabLabelCn: "重复", priceCents: 100, position: 2, enabled: 1 })
      .run(),
  );
});

test("transaction rollback covers product, sku, images and tags", () => {
  assert.throws(() =>
    db.transaction((tx) => {
      tx.insert(products).values({ id: "rb-p", nameCn: "回滚商品", status: "published" }).run();
      tx.insert(skus)
        .values({ id: "rb-s1", productId: "rb-p", nameCn: "合法", tabLabelCn: "合法", priceCents: 100, position: 1, enabled: 1 })
        .run();
      tx.insert(skuImages)
        .values({ id: "rb-img", skuId: "rb-s1", objectKey: "mock/rb-s1/1.svg", position: 1, width: 10, height: 10, mimeType: "image/svg+xml", byteSize: 10 })
        .run();
      sqlite.prepare("INSERT INTO product_tags (product_id, tag_id) VALUES (?, ?)").run("rb-p", "t1");
      tx.insert(skus)
        .values({ id: "rb-s", productId: "rb-p", nameCn: "非法", tabLabelCn: "非法", priceCents: 100, position: 4, enabled: 1 })
        .run();
    }),
  );
  assert.equal(sqlite.prepare("SELECT COUNT(*) c FROM products WHERE id='rb-p'").get().c, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) c FROM skus WHERE product_id='rb-p'").get().c, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) c FROM sku_images WHERE sku_id='rb-s1'").get().c, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) c FROM product_tags WHERE product_id='rb-p'").get().c, 0);
});

test("listEnabledTags returns enabled tags localized", () => {
  assert.deepEqual(listEnabledTags("cn"), [
    { id: "t1", name: "宝可梦" },
    { id: "t2", name: "限定" },
  ]);
  assert.deepEqual(listEnabledTags("en"), [
    { id: "t1", name: "Pokémon" },
    { id: "t2", name: "Promo" },
  ]);
});
