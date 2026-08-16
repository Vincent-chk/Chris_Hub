import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanup, db } from "./helpers.mjs";
import { banners } from "../lib/schema/index.js";
import {
  cleanupOrphanedSiteObjects,
  getSiteSettings,
  saveSiteSettings,
} from "../lib/repositories/admin.js";

const VALIDATE_STUB = async ({ specId }) => ({
  width: specId === "logo" ? 512 : 800,
  height: specId === "logo" ? 512 : 800,
  format: "png",
  byteSize: 2048,
  checksum: undefined,
});

let keySeq = 0;
function img() {
  keySeq += 1;
  return { objectKey: `site/test-${keySeq}.png`, checksum: "abc" };
}

test.after(() => cleanup());

test("saveSiteSettings: 保存微信号/联系说明并可回读", async () => {
  const saved = await saveSiteSettings(
    {
      wechatId: "ChrisHub_Test",
      contactTextCn: "中文说明",
      contactTextEn: "English",
      logo: null,
      qr: null,
    },
    { validateImage: VALIDATE_STUB },
  );
  assert.equal(saved.wechatId, "ChrisHub_Test");
  assert.equal(saved.contactTextCn, "中文说明");
  assert.equal(saved.contactTextEn, "English");
  assert.equal(saved.logo, null);
  assert.equal(saved.qr, null);

  const loaded = getSiteSettings();
  assert.equal(loaded.wechatId, "ChrisHub_Test");
});

test("saveSiteSettings: 微信号为空拒绝", async () => {
  await assert.rejects(
    saveSiteSettings({ wechatId: "   " }, { validateImage: VALIDATE_STUB }),
    /微信号必填/,
  );
});

test("saveSiteSettings: 缺图片对象拒绝", async () => {
  await assert.rejects(
    saveSiteSettings(
      { wechatId: "w", logo: {}, qr: null },
      { validateImage: VALIDATE_STUB },
    ),
    /缺少图片对象/,
  );
});

test("saveSiteSettings: logo/qr 使用对应 spec 校验", async () => {
  const specs = [];
  await saveSiteSettings(
    { wechatId: "w", logo: img(), qr: img() },
    {
      validateImage: async ({ specId }) => {
        specs.push(specId);
        return {
          width: specId === "logo" ? 512 : 800,
          height: specId === "logo" ? 512 : 800,
          format: "png",
          byteSize: 2048,
        };
      },
    },
  );
  assert.deepEqual([...specs].sort(), ["logo", "qr"]);
  const loaded = getSiteSettings();
  assert.ok(loaded.logo?.objectKey);
  assert.ok(loaded.qr?.objectKey);
});

test("saveSiteSettings: 清空 logo/qr 后置 null", async () => {
  await saveSiteSettings(
    { wechatId: "w", logo: img(), qr: img() },
    { validateImage: VALIDATE_STUB },
  );
  const saved = await saveSiteSettings(
    { wechatId: "w", logo: null, qr: null },
    { validateImage: VALIDATE_STUB },
  );
  assert.equal(saved.logo, null);
  assert.equal(saved.qr, null);
});

test("saveSiteSettings: 替换后仅清理被替换且不再引用的旧对象", async () => {
  const oldLogo = img().objectKey;
  const sharedQr = img().objectKey;
  await saveSiteSettings(
    { wechatId: "w", logo: { objectKey: oldLogo }, qr: { objectKey: sharedQr } },
    { validateImage: VALIDATE_STUB },
  );

  const cleaned = [];
  const newLogo = img().objectKey;
  await saveSiteSettings(
    { wechatId: "w", logo: { objectKey: newLogo }, qr: { objectKey: sharedQr } },
    {
      validateImage: VALIDATE_STUB,
      cleanupObjects: async (keys) => cleaned.push(...keys),
    },
  );
  assert.deepEqual(cleaned, [oldLogo]);

  const loaded = getSiteSettings();
  assert.equal(loaded.logo.objectKey, newLogo);
  assert.equal(loaded.qr.objectKey, sharedQr);
});

test("cleanupOrphanedSiteObjects: 仍被 banners 引用的对象不删除，未引用对象才尝试删除", async () => {
  const sharedKey = "site/shared.png";
  const orphanKey = "site/orphan.png";
  db.insert(banners)
    .values({
      id: "banner-ref-shared",
      purpose: "cn-desktop",
      objectKey: sharedKey,
      sortOrder: 1,
      enabled: 1,
    })
    .run();

  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args.join(" "));
  try {
    // OSS 环境变量未配置：若尝试删除会失败并记日志；被 banners 引用的对象不应进入删除路径
    await cleanupOrphanedSiteObjects([sharedKey, orphanKey]);
  } finally {
    console.error = originalError;
  }

  assert.ok(errors.some((line) => line.includes("site/orphan.png")));
  assert.ok(!errors.some((line) => line.includes("site/shared.png")));
});
