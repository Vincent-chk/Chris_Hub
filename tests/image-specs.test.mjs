import { test } from "node:test";
import assert from "node:assert/strict";
import { IMAGE_SPECS, SPEC_TO_PURPOSE, getSpec, listSpecs } from "../lib/image-specs.js";

const MB = 1024 * 1024;

test("image-specs: 6 个上传区齐全", () => {
  assert.deepEqual(Object.keys(IMAGE_SPECS).sort(), [
    "banner-desktop",
    "banner-mobile",
    "card",
    "detail",
    "logo",
    "qr",
  ]);
});

test("image-specs: Banner 桌面图 1.72:1 / 1400×814 / 5MB", () => {
  const spec = IMAGE_SPECS["banner-desktop"];
  assert.deepEqual(spec.ratio, { width: 43, height: 25 });
  assert.equal(spec.minWidth, 1400);
  assert.equal(spec.minHeight, 814);
  assert.deepEqual(spec.formats, ["jpg", "jpeg", "png", "webp"]);
  assert.equal(spec.maxBytes, 5 * MB);
  assert.equal(spec.exportFormat, "webp");
});

test("image-specs: Banner 移动图 1.2:1 / 900×750 / 5MB", () => {
  const spec = IMAGE_SPECS["banner-mobile"];
  assert.deepEqual(spec.ratio, { width: 6, height: 5 });
  assert.equal(spec.minWidth, 900);
  assert.equal(spec.minHeight, 750);
  assert.equal(spec.maxBytes, 5 * MB);
});

test("image-specs: 商品列表缩略图 1:1 / 800×800 / 5MB", () => {
  const spec = IMAGE_SPECS.card;
  assert.deepEqual(spec.ratio, { width: 1, height: 1 });
  assert.equal(spec.minWidth, 800);
  assert.equal(spec.minHeight, 800);
  assert.equal(spec.maxBytes, 5 * MB);
});

test("image-specs: 商品详情大图 4:5 / 1200×1500 / 5MB", () => {
  const spec = IMAGE_SPECS.detail;
  assert.deepEqual(spec.ratio, { width: 4, height: 5 });
  assert.equal(spec.minWidth, 1200);
  assert.equal(spec.minHeight, 1500);
  assert.equal(spec.maxBytes, 5 * MB);
});

test("image-specs: Logo 1:1 / 512×512 / 仅 PNG/WebP / 2MB", () => {
  const spec = IMAGE_SPECS.logo;
  assert.deepEqual(spec.ratio, { width: 1, height: 1 });
  assert.equal(spec.minWidth, 512);
  assert.equal(spec.minHeight, 512);
  assert.deepEqual(spec.formats, ["png", "webp"]);
  assert.equal(spec.maxBytes, 2 * MB);
  assert.equal(spec.exportFormat, "png");
});

test("image-specs: 微信二维码 1:1 / 800×800 / 2MB", () => {
  const spec = IMAGE_SPECS.qr;
  assert.deepEqual(spec.ratio, { width: 1, height: 1 });
  assert.equal(spec.minWidth, 800);
  assert.equal(spec.minHeight, 800);
  assert.equal(spec.maxBytes, 2 * MB);
});

test("image-specs: getSpec 非法 id 抛错", () => {
  assert.throws(() => getSpec("avatar"), /不支持的 specId/);
});

test("image-specs: SPEC_TO_PURPOSE 覆盖全部且映射正确", () => {
  for (const id of Object.keys(IMAGE_SPECS)) {
    assert.ok(SPEC_TO_PURPOSE[id], `${id} 缺少 purpose 映射`);
  }
  assert.equal(SPEC_TO_PURPOSE["banner-desktop"], "banner");
  assert.equal(SPEC_TO_PURPOSE["banner-mobile"], "banner");
  assert.equal(SPEC_TO_PURPOSE.card, "card");
  assert.equal(SPEC_TO_PURPOSE.detail, "detail");
  assert.equal(SPEC_TO_PURPOSE.logo, "logo");
  assert.equal(SPEC_TO_PURPOSE.qr, "qr");
});

test("image-specs: listSpecs 返回带 id 的完整列表", () => {
  const list = listSpecs();
  assert.equal(list.length, 6);
  assert.ok(list.every((item) => item.id && item.ratio && item.minWidth && item.minHeight && item.maxBytes));
});
