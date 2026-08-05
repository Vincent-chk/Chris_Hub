import { after, test } from "node:test";
import assert from "node:assert/strict";
import { cleanup, sqlite } from "./helpers.mjs";

after(cleanup);

test("migration creates all tables from scratch", () => {
  const tables = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((row) => row.name);
  for (const name of [
    "__drizzle_migrations",
    "banners",
    "product_tags",
    "products",
    "site_settings",
    "sku_images",
    "skus",
    "tags",
  ]) {
    assert.ok(tables.includes(name), `缺少表 ${name}`);
  }
});

test("site_settings has exactly one row id=1 with defaults", () => {
  const rows = sqlite.prepare("SELECT * FROM site_settings").all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 1);
  assert.equal(rows[0].contact_text_cn, "");
  assert.equal(rows[0].wechat_id, "");
});
