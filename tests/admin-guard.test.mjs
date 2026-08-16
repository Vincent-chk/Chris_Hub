import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidAdminKey } from "../lib/admin/guard.js";

const KEY = "c1-test-entry-key-0123456789";
const saved = process.env.ADMIN_ENTRY_KEY;

test("isValidAdminKey: 正确 Key 返回 true", () => {
  process.env.ADMIN_ENTRY_KEY = KEY;
  assert.equal(isValidAdminKey(KEY), true);
});

test("isValidAdminKey: 错误 Key / 不同长度返回 false", () => {
  process.env.ADMIN_ENTRY_KEY = KEY;
  assert.equal(isValidAdminKey("wrong-key"), false);
  assert.equal(isValidAdminKey(`${KEY}-extra`), false);
});

test("isValidAdminKey: 空值/非字符串返回 false", () => {
  process.env.ADMIN_ENTRY_KEY = KEY;
  assert.equal(isValidAdminKey(""), false);
  assert.equal(isValidAdminKey(null), false);
  assert.equal(isValidAdminKey(undefined), false);
  assert.equal(isValidAdminKey(123), false);
});

test("isValidAdminKey: 环境变量缺失返回 false", () => {
  delete process.env.ADMIN_ENTRY_KEY;
  try {
    assert.equal(isValidAdminKey(KEY), false);
  } finally {
    if (saved !== undefined) process.env.ADMIN_ENTRY_KEY = saved;
  }
});
