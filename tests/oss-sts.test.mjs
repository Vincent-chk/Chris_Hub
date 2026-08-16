import { test } from "node:test";
import assert from "node:assert/strict";
import { buildObjectKey, createUploadCredentials, UPLOAD_PURPOSES } from "../lib/oss/sts.js";

const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const ENV_KEYS = ["OSS_BUCKET", "OSS_REGION", "OSS_ACCESS_KEY_ID", "OSS_ACCESS_KEY_SECRET", "OSS_ROLE_ARN"];
const savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

test("buildObjectKey: card 使用 sku/<skuId>/card-<uuid>.<ext> 且扩展名小写", () => {
  const key = buildObjectKey({ purpose: "card", extension: "WebP", skuId: "sku-1" });
  assert.match(key, new RegExp(`^sku/sku-1/card-${UUID_RE}\\.webp$`));
});

test("buildObjectKey: detail 使用 sku/<skuId>/<uuid>.<ext>", () => {
  const key = buildObjectKey({ purpose: "detail", extension: "png", skuId: "sku-2" });
  assert.match(key, new RegExp(`^sku/sku-2/${UUID_RE}\\.png$`));
});

test("buildObjectKey: banner / logo / qr 使用对应前缀", () => {
  assert.match(buildObjectKey({ purpose: "banner", extension: "jpg" }), new RegExp(`^banner/${UUID_RE}\\.jpg$`));
  assert.match(buildObjectKey({ purpose: "logo", extension: "png" }), new RegExp(`^site/logo-${UUID_RE}\\.png$`));
  assert.match(buildObjectKey({ purpose: "qr", extension: "jpeg" }), new RegExp(`^site/qr-${UUID_RE}\\.jpeg$`));
});

test("buildObjectKey: 生成 Key 不重复", () => {
  const a = buildObjectKey({ purpose: "banner", extension: "png" });
  const b = buildObjectKey({ purpose: "banner", extension: "png" });
  assert.notEqual(a, b);
});

test("buildObjectKey: 非法 purpose 拒绝", () => {
  assert.throws(() => buildObjectKey({ purpose: "avatar", extension: "png" }), /不支持的 purpose/);
  assert.throws(() => buildObjectKey({ purpose: "", extension: "png" }), /不支持的 purpose/);
});

test("buildObjectKey: card/detail 缺 skuId 拒绝", () => {
  assert.throws(() => buildObjectKey({ purpose: "card", extension: "png" }), /必须提供 skuId/);
  assert.throws(() => buildObjectKey({ purpose: "detail", extension: "png", skuId: "  " }), /必须提供 skuId/);
});

test("buildObjectKey: 非法扩展名拒绝（svg/exe/空/多点）", () => {
  assert.throws(() => buildObjectKey({ purpose: "banner", extension: "svg" }), /不支持的扩展名/);
  assert.throws(() => buildObjectKey({ purpose: "banner", extension: "exe" }), /不支持的扩展名/);
  assert.throws(() => buildObjectKey({ purpose: "banner", extension: "" }), /不支持的扩展名/);
  assert.throws(() => buildObjectKey({ purpose: "banner", extension: "png.exe" }), /不支持的扩展名/);
});

test("buildObjectKey: 带前导点的扩展名被规范化", () => {
  const key = buildObjectKey({ purpose: "banner", extension: ".PNG" });
  assert.match(key, new RegExp(`^banner/${UUID_RE}\\.png$`));
});

test("UPLOAD_PURPOSES 与 buildObjectKey 支持范围一致", () => {
  for (const purpose of UPLOAD_PURPOSES) {
    assert.doesNotThrow(() => buildObjectKey({ purpose, extension: "png", skuId: "s" }));
  }
});

test("createUploadCredentials: 缺少环境变量时报错且包含字段名", async () => {
  for (const key of ENV_KEYS) delete process.env[key];
  try {
    await assert.rejects(() => createUploadCredentials({ purpose: "banner", extension: "png" }), /缺少环境变量 OSS_BUCKET/);
  } finally {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] !== undefined) process.env[key] = savedEnv[key];
      else delete process.env[key];
    }
  }
});
