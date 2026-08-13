import { test } from "node:test";
import assert from "node:assert/strict";
import { POST as validatePost } from "../app/admin/[accessKey]/api/images/validate/route.js";
import { POST as cleanupPost } from "../app/admin/[accessKey]/api/images/cleanup/route.js";

const KEY = "c1-test-entry-key-0123456789";
const ENV_KEYS = ["ADMIN_ENTRY_KEY", "OSS_BUCKET", "OSS_REGION", "OSS_ACCESS_KEY_ID", "OSS_ACCESS_KEY_SECRET"];
const savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

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

function call(handler, accessKey, body) {
  return handler(
    new Request(`http://localhost/admin/${accessKey}/api/images/test`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ accessKey }) },
  );
}

test("images/validate: 错误 accessKey 返回 404", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    const res = await call(validatePost, "wrong-key", { objectKey: "banner/x.png", specId: "card" });
    assert.equal(res.status, 404);
  } finally {
    restoreEnv();
  }
});

test("images/validate: 缺少 objectKey/specId 返回 400", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    assert.equal((await call(validatePost, KEY, { specId: "card" })).status, 400);
    assert.equal((await call(validatePost, KEY, { objectKey: "banner/x.png" })).status, 400);
  } finally {
    restoreEnv();
  }
});

test("images/validate: 非法 specId 返回 400（不触发网络）", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    const res = await call(validatePost, KEY, { objectKey: "banner/x.png", specId: "avatar" });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /不支持的 specId/);
  } finally {
    restoreEnv();
  }
});

test("images/validate: OSS 环境变量缺失返回 500（不触发网络）", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    const res = await call(validatePost, KEY, { objectKey: "banner/x.png", specId: "card" });
    assert.equal(res.status, 500);
    const data = await res.json();
    assert.equal(data.error, "服务端配置不完整");
  } finally {
    restoreEnv();
  }
});

test("images/cleanup: 错误 accessKey 返回 404", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    const res = await call(cleanupPost, "wrong-key", { objectKey: "banner/x.png" });
    assert.equal(res.status, 404);
  } finally {
    restoreEnv();
  }
});

test("images/cleanup: 非法前缀返回 400", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    const res = await call(cleanupPost, KEY, { objectKey: "evil/x.png" });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /前缀不在允许范围/);
  } finally {
    restoreEnv();
  }
});

test("images/cleanup: OSS 环境变量缺失返回 500（不触发网络）", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    const res = await call(cleanupPost, KEY, { objectKey: "banner/x.png" });
    assert.equal(res.status, 500);
    const data = await res.json();
    assert.equal(data.error, "服务端配置不完整");
  } finally {
    restoreEnv();
  }
});
