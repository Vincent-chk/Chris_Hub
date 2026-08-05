import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPriceCents } from "../lib/money.js";
import { localized } from "../lib/i18n.js";
import { assetUrl } from "../lib/assets.js";

test("formatPriceCents", () => {
  assert.equal(formatPriceCents(3900), "39");
  assert.equal(formatPriceCents(3990), "39.9");
  assert.equal(formatPriceCents(0), "0");
  assert.equal(formatPriceCents(undefined), "0");
});

test("localized falls back to cn", () => {
  assert.equal(localized({ cn: "中文", en: "English" }, "en"), "English");
  assert.equal(localized({ cn: "中文", en: null }, "en"), "中文");
  assert.equal(localized({ cn: "中文", en: "English" }, "cn"), "中文");
  assert.equal(localized({ cn: "中文" }, "xx"), "中文");
});

test("assetUrl maps object keys", () => {
  assert.equal(assetUrl("mock/sku-01-a/card-01.svg"), "/products/card-01.svg");
  assert.equal(assetUrl("banners/banner-cn.svg"), "/banners/banner-cn.svg");
  assert.equal(assetUrl(null), null);
  assert.equal(assetUrl(""), null);

  const prev = process.env.ASSET_BASE_URL;
  process.env.ASSET_BASE_URL = "https://assets.example.com";
  assert.equal(assetUrl("sku/abc/1.webp"), "https://assets.example.com/sku/abc/1.webp");
  if (prev === undefined) {
    delete process.env.ASSET_BASE_URL;
  } else {
    process.env.ASSET_BASE_URL = prev;
  }
});
