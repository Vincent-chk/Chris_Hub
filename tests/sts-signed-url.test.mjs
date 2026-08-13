import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSignedPutUrl } from "../lib/oss/sts.js";

test("buildSignedPutUrl: 生成带签名的 PUT 直传地址", () => {
  const url = buildSignedPutUrl({
    objectKey: "banner/abc.png",
    region: "ap-southeast-1",
    bucket: "chris-hub-oss-test",
    credentials: { accessKeyId: "AKID", accessKeySecret: "SECRET", securityToken: "TOKEN" },
  });
  assert.ok(url.startsWith("https://chris-hub-oss-test.oss-ap-southeast-1.aliyuncs.com/banner/abc.png?"));
  assert.match(url, /OSSAccessKeyId=AKID/);
  assert.match(url, /Signature=/);
  assert.match(url, /security-token=TOKEN/);
  assert.match(url, /Expires=/);
});

test("buildSignedPutUrl: objectKey 包含子路径时 URL 正确", () => {
  const url = buildSignedPutUrl({
    objectKey: "sku/test-sku/card-123.png",
    region: "ap-southeast-1",
    bucket: "chris-hub-oss-test",
    credentials: { accessKeyId: "AKID", accessKeySecret: "SECRET", securityToken: "TOKEN" },
  });
  assert.ok(url.startsWith("https://chris-hub-oss-test.oss-ap-southeast-1.aliyuncs.com/sku/test-sku/card-123.png?"));
});

test("buildSignedPutUrl: 带 Content-Type 时签名随头变化", () => {
  const base = {
    objectKey: "banner/abc.png",
    region: "ap-southeast-1",
    bucket: "chris-hub-oss-test",
    credentials: { accessKeyId: "AKID", accessKeySecret: "SECRET", securityToken: "TOKEN" },
  };
  const withoutType = buildSignedPutUrl(base);
  const withPng = buildSignedPutUrl({ ...base, contentType: "image/png" });
  const withWebp = buildSignedPutUrl({ ...base, contentType: "image/webp" });
  assert.notEqual(withPng, withoutType);
  assert.notEqual(withPng, withWebp);
  assert.match(withPng, /OSSAccessKeyId=AKID/);
  assert.match(withPng, /security-token=TOKEN/);
});
