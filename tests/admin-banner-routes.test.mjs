import { test } from "node:test";
import assert from "node:assert/strict";
import "./helpers.mjs";
import { GET as listGet, POST as createPost } from "../app/admin/[accessKey]/api/banners/route.js";
import { POST as updatePost } from "../app/admin/[accessKey]/api/banners/[bannerId]/route.js";
import { POST as deletePost } from "../app/admin/[accessKey]/api/banners/[bannerId]/delete/route.js";
import { POST as reorderPost } from "../app/admin/[accessKey]/api/banners/reorder/route.js";
import { MAX_BANNERS, createBanner } from "../lib/repositories/admin.js";

const KEY = "c1-test-entry-key-0123456789";
const ENV_KEYS = ["ADMIN_ENTRY_KEY", "OSS_BUCKET", "OSS_REGION", "OSS_ACCESS_KEY_ID", "OSS_ACCESS_KEY_SECRET"];
const savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

const VALIDATE_STUB = async ({ specId }) => ({
  width: specId === "banner-desktop" ? 1400 : 900,
  height: specId === "banner-desktop" ? 814 : 750,
  format: "png",
  byteSize: 2048,
  checksum: undefined,
});

function setEnv(entries) {
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(entries)) process.env[key] = value;
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] !== undefined) process.env[key] = savedEnv[key];
    else delete process.env[key];
  }
}

function call(handler, path, { method = "POST", body, accessKey = KEY, params = {} } = {}) {
  return handler(
    new Request(`http://localhost${path}`, {
      method,
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
    { params: Promise.resolve({ accessKey, ...params }) },
  );
}

let seq = 0;
function img(prefix) {
  seq += 1;
  return { objectKey: `banner/route-${prefix}-${seq}.png`, checksum: "abc" };
}

function bannerBody(overrides = {}) {
  return {
    desktopImageCn: img("cn"),
    desktopImageEn: img("en"),
    mobileImageCn: null,
    mobileImageEn: null,
    enabled: true,
    ...overrides,
  };
}

test("banners: 错误 accessKey 一律 404", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    assert.equal(
      (
        await call(listGet, "/admin/wrong-key/api/banners", {
          method: "GET",
          accessKey: "wrong-key",
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await call(createPost, "/admin/wrong-key/api/banners", {
          body: bannerBody(),
          accessKey: "wrong-key",
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await call(updatePost, "/admin/wrong-key/api/banners/x", {
          body: bannerBody(),
          accessKey: "wrong-key",
        })
      ).status,
      404,
    );
    assert.equal(
      (await call(deletePost, "/admin/wrong-key/api/banners/x/delete", { accessKey: "wrong-key" }))
        .status,
      404,
    );
    assert.equal(
      (
        await call(reorderPost, "/admin/wrong-key/api/banners/reorder", {
          body: { ids: [] },
          accessKey: "wrong-key",
        })
      ).status,
      404,
    );
  } finally {
    restoreEnv();
  }
});

test("banners: GET 列表 200", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    const res = await call(listGet, `/admin/${KEY}/api/banners`, { method: "GET" });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray((await res.json()).items));
  } finally {
    restoreEnv();
  }
});

test("banners: 缺桌面图 400；OSS 环境缺失 500", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    const missing = await call(createPost, `/admin/${KEY}/api/banners`, {
      body: bannerBody({ desktopImageCn: null }),
    });
    assert.equal(missing.status, 400);
    assert.match((await missing.json()).error, /缺少中文桌面图/);

    const envMissing = await call(createPost, `/admin/${KEY}/api/banners`, {
      body: bannerBody(),
    });
    assert.equal(envMissing.status, 500);
  } finally {
    restoreEnv();
  }
});

test("banners: 数量达上限时 POST 返回 400 + 上限文案", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    const current = (await (await call(listGet, `/admin/${KEY}/api/banners`, { method: "GET" })).json())
      .items.length;
    for (let i = current; i < MAX_BANNERS; i++) {
      await createBanner(bannerBody(), { validateImage: VALIDATE_STUB });
    }
    const res = await call(createPost, `/admin/${KEY}/api/banners`, { body: bannerBody() });
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /已达上限/);
  } finally {
    restoreEnv();
  }
});

test("banners: 更新/删除不存在返回 404；reorder 非法 body 400", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    assert.equal(
      (await call(updatePost, `/admin/${KEY}/api/banners/not-exist`, { body: bannerBody() })).status,
      404,
    );
    assert.equal((await call(deletePost, `/admin/${KEY}/api/banners/not-exist/delete`)).status, 404);
    assert.equal(
      (await call(reorderPost, `/admin/${KEY}/api/banners/reorder`, { body: {} })).status,
      400,
    );
    assert.equal(
      (await call(reorderPost, `/admin/${KEY}/api/banners/reorder`, { body: { ids: ["not-exist"] } }))
        .status,
      400,
    );
  } finally {
    restoreEnv();
  }
});
