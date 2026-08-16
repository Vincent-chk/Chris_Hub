import { createHash } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { IMAGE_SPECS } from "../lib/image-specs.js";
import { validateImageBuffer } from "../lib/oss/validate.js";

function imageBuffer(width, height, format = "png") {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    [format]()
    .toBuffer();
}

test("validateImageBuffer: 合法图通过并返回元数据", async () => {
  const buffer = await imageBuffer(800, 800);
  const result = await validateImageBuffer(buffer, IMAGE_SPECS.card, { byteSize: buffer.length });
  assert.equal(result.width, 800);
  assert.equal(result.height, 800);
  assert.equal(result.format, "png");
  assert.equal(result.byteSize, buffer.length);
});

test("validateImageBuffer: 小于最小尺寸拒绝", async () => {
  const buffer = await imageBuffer(400, 400);
  await assert.rejects(() => validateImageBuffer(buffer, IMAGE_SPECS.card), /小于最小要求/);
});

test("validateImageBuffer: 比例不符拒绝（1:1 上传 800×1000）", async () => {
  const buffer = await imageBuffer(800, 1000);
  await assert.rejects(() => validateImageBuffer(buffer, IMAGE_SPECS.card), /不符合/);
});

test("validateImageBuffer: 格式不在白名单拒绝（logo 传 JPEG）", async () => {
  const buffer = await imageBuffer(512, 512, "jpeg");
  await assert.rejects(() => validateImageBuffer(buffer, IMAGE_SPECS.logo), /不在允许范围/);
});

test("validateImageBuffer: 超过大小上限拒绝", async () => {
  const buffer = await imageBuffer(800, 800);
  const tinySpec = { ...IMAGE_SPECS.card, maxBytes: 100 };
  await assert.rejects(() => validateImageBuffer(buffer, tinySpec), /超过上限/);
});

test("validateImageBuffer: checksum 不一致拒绝", async () => {
  const buffer = await imageBuffer(800, 800);
  await assert.rejects(
    () => validateImageBuffer(buffer, IMAGE_SPECS.card, { checksum: "0".repeat(64) }),
    /校验和不一致/,
  );
});

test("validateImageBuffer: checksum 一致通过", async () => {
  const buffer = await imageBuffer(800, 800);
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const result = await validateImageBuffer(buffer, IMAGE_SPECS.card, { checksum });
  assert.equal(result.checksum, checksum);
});

test("validateImageBuffer: 空内容拒绝", async () => {
  await assert.rejects(() => validateImageBuffer(Buffer.alloc(0), IMAGE_SPECS.card), /图片内容为空/);
});
