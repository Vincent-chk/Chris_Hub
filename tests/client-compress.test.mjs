import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COMPRESS_TARGET_RATIO,
  DOWNSCALE_FACTOR,
  MAX_COMPRESS_ATTEMPTS,
  MAX_SOURCE_BYTES,
  MIN_COMPRESS_QUALITY,
  QUALITY_STEP,
  nextCompressionStep,
} from "../lib/client-upload.js";

const MB = 1024 * 1024;

test("client-compress: 压缩参数常量符合方案 A", () => {
  assert.equal(COMPRESS_TARGET_RATIO, 0.9);
  assert.equal(MIN_COMPRESS_QUALITY, 0.5);
  assert.equal(QUALITY_STEP, 0.1);
  assert.equal(DOWNSCALE_FACTOR, 0.75);
  assert.equal(MAX_COMPRESS_ATTEMPTS, 20);
  assert.equal(MAX_SOURCE_BYTES, 40 * MB);
});

test("client-compress: 非 PNG 先按质量阶梯 0.9→0.5 降质量", () => {
  const base = {
    width: 2000,
    height: 1000,
    minWidth: 1400,
    minHeight: 814,
    quality: 0.9,
    isPng: false,
    downscaled: false,
  };
  let state = base;
  const qualities = [];
  while (state && state.quality > MIN_COMPRESS_QUALITY) {
    state = nextCompressionStep(state);
    qualities.push(state.quality);
  }
  assert.deepEqual(qualities, [0.8, 0.7, 0.6, 0.5]);
  // 质量降到最低后仍超限则进入降分辨率，并把质量重置为 0.85
  state = nextCompressionStep(state);
  assert.equal(state.width, 1500); // floor(2000×0.75)
  assert.equal(state.height, 814); // floor(1000×0.75) < minHeight，封底到最小尺寸
  assert.equal(state.quality, 0.85);
  assert.equal(state.downscaled, true);
});

test("client-compress: 降分辨率后继续质量阶梯，永不低于最小尺寸", () => {
  const base = {
    width: 2000,
    height: 1000,
    minWidth: 1400,
    minHeight: 814,
    quality: 0.9,
    isPng: false,
    downscaled: false,
  };
  let state = nextCompressionStep(base);
  let steps = 0;
  while (state) {
    assert.ok(state.width >= base.minWidth && state.height >= base.minHeight);
    steps += 1;
    state = nextCompressionStep(state);
  }
  // 最终停在最小尺寸且质量为 0.5
  assert.ok(steps > 0);
});

test("client-compress: 已到最小尺寸且质量 0.5 时返回 null（无法继续）", () => {
  const state = {
    width: 512,
    height: 512,
    minWidth: 512,
    minHeight: 512,
    quality: 0.5,
    isPng: false,
    downscaled: true,
  };
  assert.equal(nextCompressionStep(state), null);
});

test("client-compress: PNG 只降分辨率、不降质量", () => {
  const base = {
    width: 1024,
    height: 1024,
    minWidth: 512,
    minHeight: 512,
    quality: 0.9,
    isPng: true,
    downscaled: false,
  };
  let state = nextCompressionStep(base);
  assert.equal(state.quality, 0.9); // 质量不变
  assert.equal(state.width, 768); // floor(1024×0.75)
  assert.equal(state.height, 768);
  assert.equal(state.downscaled, true);

  state = nextCompressionStep(state);
  assert.equal(state.quality, 0.9);
  assert.equal(state.width, 576);

  state = nextCompressionStep(state);
  assert.equal(state.width, 512); // 封底到最小尺寸
  assert.equal(state.height, 512);

  assert.equal(nextCompressionStep(state), null); // 已到最小尺寸，无法继续
});

test("client-compress: PNG 已在最小尺寸时返回 null", () => {
  const state = {
    width: 512,
    height: 512,
    minWidth: 512,
    minHeight: 512,
    quality: 0.9,
    isPng: true,
    downscaled: false,
  };
  assert.equal(nextCompressionStep(state), null);
});

test("client-compress: nextCompressionStep 不修改入参", () => {
  const base = {
    width: 2000,
    height: 1000,
    minWidth: 1400,
    minHeight: 814,
    quality: 0.9,
    isPng: false,
    downscaled: false,
  };
  const snapshot = JSON.stringify(base);
  nextCompressionStep(base);
  assert.equal(JSON.stringify(base), snapshot);
});
