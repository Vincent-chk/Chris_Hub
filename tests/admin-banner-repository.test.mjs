import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanup } from "./helpers.mjs";
import {
  MAX_BANNERS_PER_PURPOSE,
  createBannerImage,
  deleteBannerImage,
  listBannerPurpose,
  listBanners,
  reorderBannerImages,
  updateBannerImage,
} from "../lib/repositories/admin.js";

const VALIDATE_STUB = async ({ specId }) => ({
  width: specId === "banner-desktop" ? 1400 : 900,
  height: specId === "banner-desktop" ? 814 : 750,
  format: "png",
  byteSize: 2048,
  checksum: undefined,
});

let keySeq = 0;
function img() {
  keySeq += 1;
  return { objectKey: `banner/accept-${keySeq}.png`, checksum: "abc" };
}

test.after(() => cleanup());

test("createBannerImage: 按用途新建并递增 sortOrder", async () => {
  const a = await createBannerImage({ purpose: "cn-desktop", image: img() }, { validateImage: VALIDATE_STUB });
  const b = await createBannerImage({ purpose: "cn-desktop", image: img() }, { validateImage: VALIDATE_STUB });
  assert.equal(a.purpose, "cn-desktop");
  assert.equal(a.sortOrder, 0);
  assert.equal(b.sortOrder, 1);
  assert.equal(listBannerPurpose("cn-desktop").length, 2);
  assert.ok(listBanners().every((row) => row.objectKey && row.id));
});

test("createBannerImage: 非法用途 / 缺图片对象拒绝", async () => {
  await assert.rejects(
    createBannerImage({ purpose: "avatar", image: img() }, { validateImage: VALIDATE_STUB }),
    /不支持的用途/,
  );
  await assert.rejects(
    createBannerImage({ purpose: "cn-desktop", image: {} }, { validateImage: VALIDATE_STUB }),
    /缺少图片对象/,
  );
});

test("createBannerImage: 移动图用途使用 banner-mobile 规范", async () => {
  const created = await createBannerImage({ purpose: "cn-mobile", image: img() }, { validateImage: VALIDATE_STUB });
  assert.equal(created.purpose, "cn-mobile");
  assert.equal(listBannerPurpose("cn-mobile").length, 1);
});

test("createBannerImage: 同一用途超过 5 张上限拒绝", async () => {
  const current = listBannerPurpose("en-desktop").length;
  for (let i = current; i < MAX_BANNERS_PER_PURPOSE; i++) {
    await createBannerImage({ purpose: "en-desktop", image: img() }, { validateImage: VALIDATE_STUB });
  }
  await assert.rejects(
    createBannerImage({ purpose: "en-desktop", image: img() }, { validateImage: VALIDATE_STUB }),
    /已达上限/,
  );
});

test("updateBannerImage: 替换图片后仅清理旧对象；不存在返回 null", async () => {
  const created = await createBannerImage({ purpose: "cn-desktop", image: img() }, { validateImage: VALIDATE_STUB });
  const cleaned = [];
  const updated = await updateBannerImage(
    created.id,
    { image: img() },
    { validateImage: VALIDATE_STUB, cleanupObjects: async (keys) => cleaned.push(...keys) },
  );
  assert.ok(updated.objectKey !== created.objectKey);
  assert.deepEqual(cleaned, [created.objectKey]);
  assert.equal(
    await updateBannerImage("banner-not-exist", { image: img() }, { validateImage: VALIDATE_STUB }),
    null,
  );
});

test("reorderBannerImages: 按数组顺序重排；非法参数拒绝", () => {
  const ids = listBannerPurpose("cn-desktop")
    .map((row) => row.id)
    .reverse();
  const reordered = reorderBannerImages({ purpose: "cn-desktop", ids });
  assert.deepEqual(
    reordered.map((row) => row.id),
    ids,
  );
  assert.deepEqual(
    reordered.map((row) => row.sortOrder),
    ids.map((_, index) => index + 1),
  );
  assert.throws(() => reorderBannerImages({ purpose: "avatar", ids }), /不支持的用途/);
  assert.throws(() => reorderBannerImages({ purpose: "cn-desktop", ids: [] }), /排序参数无效/);
  assert.throws(() => reorderBannerImages({ purpose: "cn-desktop", ids: ["a", "a"] }), /不能重复/);
  assert.throws(() => reorderBannerImages({ purpose: "cn-desktop", ids: ["not-exist"] }), /不存在的 Banner 图/);
});

test("deleteBannerImage: 删除行并清理对象；不存在返回 false", async () => {
  const created = await createBannerImage({ purpose: "en-mobile", image: img() }, { validateImage: VALIDATE_STUB });
  const cleaned = [];
  const deleted = await deleteBannerImage(created.id, {
    cleanupObjects: async (keys) => cleaned.push(...keys),
  });
  assert.equal(deleted, true);
  assert.equal(listBannerPurpose("en-mobile").some((row) => row.id === created.id), false);
  assert.deepEqual(cleaned, [created.objectKey]);
  assert.equal(await deleteBannerImage(created.id, { cleanupObjects: async () => {} }), false);
});
