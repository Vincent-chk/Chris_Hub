import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/admin/[accessKey]/api/upload-token/route.js";

const KEY = "c1-test-entry-key-0123456789";
const ENV_KEYS = [
  "ADMIN_ENTRY_KEY",
  "OSS_BUCKET",
  "OSS_REGION",
  "OSS_ACCESS_KEY_ID",
  "OSS_ACCESS_KEY_SECRET",
  "OSS_ROLE_ARN",
];
const savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const DUMMY_OSS = {
  OSS_BUCKET: "dummy-bucket",
  OSS_REGION: "ap-southeast-1",
  OSS_ACCESS_KEY_ID: "dummy-id",
  OSS_ACCESS_KEY_SECRET: "dummy-secret",
  OSS_ROLE_ARN: "acs:ram::0:role/dummy",
};

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

function callPost(accessKey, body) {
  return POST(
    new Request(`http://localhost/admin/${accessKey}/api/upload-token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ accessKey }) },
  );
}

test("upload-token: 错误 accessKey 返回 404", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    const res = await callPost("wrong-key", { purpose: "banner", extension: "png" });
    assert.equal(res.status, 404);
  } finally {
    restoreEnv();
  }
});

test("upload-token: 未配置 ADMIN_ENTRY_KEY 一律 404", async () => {
  setEnv({});
  try {
    const res = await callPost(KEY, { purpose: "banner", extension: "png" });
    assert.equal(res.status, 404);
  } finally {
    restoreEnv();
  }
});

test("upload-token: 非法 purpose 返回 400", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY, ...DUMMY_OSS });
  try {
    const res = await callPost(KEY, { purpose: "avatar", extension: "png" });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /不支持的 purpose/);
  } finally {
    restoreEnv();
  }
});

test("upload-token: 非法扩展名返回 400", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY, ...DUMMY_OSS });
  try {
    const res = await callPost(KEY, { purpose: "banner", extension: "svg" });
    assert.equal(res.status, 400);
  } finally {
    restoreEnv();
  }
});

test("upload-token: card 缺 skuId 返回 400", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY, ...DUMMY_OSS });
  try {
    const res = await callPost(KEY, { purpose: "card", extension: "png" });
    assert.equal(res.status, 400);
  } finally {
    restoreEnv();
  }
});

test("upload-token: 请求体不是 JSON 返回 400", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    const res = await callPost(KEY, "not-json");
    assert.equal(res.status, 400);
  } finally {
    restoreEnv();
  }
});

test("upload-token: OSS 环境变量缺失返回 500（服务端配置不完整）", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    const res = await callPost(KEY, { purpose: "banner", extension: "png" });
    assert.equal(res.status, 500);
    const data = await res.json();
    assert.equal(data.error, "服务端配置不完整");
  } finally {
    restoreEnv();
  }
});
