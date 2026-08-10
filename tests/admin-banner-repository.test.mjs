import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanup } from "./helpers.mjs";
import {
  MAX_BANNERS,
  createBanner,
  deleteBanner,
  listBanners,
  reorderBanners,
  updateBanner,
} from "../lib/repositories/admin.js";

const VALIDATE_STUB = async ({ specId }) => ({
  width: specId === "banner-desktop" ? 1400 : 900,
  height: specId === "banner-desktop" ? 814 : 750,
  format: "png",
  byteSize: 2048,
  checksum: undefined,
});

let keySeq = 0;
function img(prefix) {
  keySeq += 1;
  return { objectKey: `banner/accept-${prefix}-${keySeq}.png`, checksum: "abc" };
}

function bannerInput(overrides = {}) {
  return {
    desktopImageCn: img("cn"),
    desktopImageEn: img("en"),
    mobileImageCn: null,
    mobileImageEn: null,
    enabled: false,
    ...overrides,
  };
}

test.after(() => cleanup());

test("createBanner: 新建成功且默认停用、sortOrder 递增", async () => {
  const a = await createBanner(bannerInput(), { validateImage: VALIDATE_STUB });
  const b = await createBanner(bannerInput(), { validateImage: VALIDATE_STUB });
  assert.equal(a.enabled, false);
  assert.equal(a.sortOrder, 0);
  assert.equal(b.sortOrder, 1);
  assert.equal(listBanners().length, 2);
});

test("createBanner: 缺中文桌面图拒绝", async () => {
  await assert.rejects(
    createBanner(bannerInput({ desktopImageCn: null }), { validateImage: VALIDATE_STUB }),
    /缺少中文桌面图/,
  );
});

test("createBanner: 缺英文桌面图拒绝", async () => {
  await assert.rejects(
    createBanner(bannerInput({ desktopImageEn: null }), { validateImage: VALIDATE_STUB }),
    /缺少英文桌面图/,
  );
});

test("createBanner: 移动图可选", async () => {
  const created = await createBanner(
    bannerInput({ mobileImageCn: img("mobile-cn"), mobileImageEn: img("mobile-en") }),
    { validateImage: VALIDATE_STUB },
  );
  assert.ok(created.mobileImageCn.objectKey);
  assert.ok(created.mobileImageEn.objectKey);
});

test("updateBanner: 替换图片后仅清理不再引用的旧对象", async () => {
  const created = await createBanner(bannerInput(), { validateImage: VALIDATE_STUB });
  const oldCn = created.desktopImageCn.objectKey;
  const cleaned = [];
  const updated = await updateBanner(
    created.id,
    {
      ...bannerInput(),
      desktopImageCn: img("cn-new"),
      desktopImageEn: created.desktopImageEn,
    },
    {
      validateImage: VALIDATE_STUB,
      cleanupObjects: async (keys) => cleaned.push(...keys),
    },
  );
  assert.ok(updated.desktopImageCn.objectKey !== oldCn);
  assert.deepEqual(cleaned, [oldCn]);
});

test("updateBanner: 不存在返回 null", async () => {
  const result = await updateBanner("banner-not-exist", bannerInput(), {
    validateImage: VALIDATE_STUB,
  });
  assert.equal(result, null);
});

test("reorderBanners: 按数组顺序重排", () => {
  const ids = listBanners()
    .map((banner) => banner.id)
    .reverse();
  const reordered = reorderBanners(ids);
  assert.deepEqual(
    reordered.map((banner) => banner.id),
    ids,
  );
  assert.deepEqual(
    reordered.map((banner) => banner.sortOrder),
    ids.map((_, index) => index + 1),
  );
});

test("reorderBanners: 非法参数拒绝", () => {
  assert.throws(() => reorderBanners([]), /排序参数无效/);
  assert.throws(() => reorderBanners(["a", "a"]), /不能重复/);
  assert.throws(() => reorderBanners(["not-exist"]), /不存在的 Banner/);
});

test("deleteBanner: 删除行并清理独有对象；不存在返回 false", async () => {
  const created = await createBanner(bannerInput(), { validateImage: VALIDATE_STUB });
  const cleaned = [];
  const deleted = await deleteBanner(created.id, {
    cleanupObjects: async (keys) => cleaned.push(...keys),
  });
  assert.equal(deleted, true);
  assert.equal(listBanners().some((banner) => banner.id === created.id), false);
  assert.ok(cleaned.includes(created.desktopImageCn.objectKey));
  assert.equal(
    await deleteBanner(created.id, { cleanupObjects: async () => {} }),
    false,
  );
});

test("createBanner: 超过 5 张上限拒绝", async () => {
  const current = listBanners().length;
  for (let i = current; i < MAX_BANNERS; i++) {
    await createBanner(bannerInput(), { validateImage: VALIDATE_STUB });
  }
  await assert.rejects(
    createBanner(bannerInput(), { validateImage: VALIDATE_STUB }),
    /已达上限/,
  );
});
