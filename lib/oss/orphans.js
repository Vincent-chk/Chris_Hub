// 全局孤儿对象检测/清理逻辑（阶段 C · 补充任务）
// 纯函数可单测；detect/delete 需要 OSS 网络，供 CLI 脚本与中台"开发者运维"接口共用。
import { eq } from "drizzle-orm";
import { banners, siteSettings, skuImages, skus } from "../schema/index.js";

export const UPLOAD_PREFIXES = ["sku/", "banner/", "site/"];
const DELETE_BATCH_SIZE = 100;

export function isUploadObjectKey(key) {
  return typeof key === "string" && UPLOAD_PREFIXES.some((prefix) => key.startsWith(prefix));
}

// 收集数据库全部被引用的对象键（新增存对象键的表时需同步扩展）
export function collectReferencedObjectKeys(db) {
  const referenced = new Set();
  for (const row of db.select({ objectKey: skuImages.objectKey }).from(skuImages).all()) {
    if (row.objectKey) referenced.add(row.objectKey);
  }
  for (const row of db.select({ objectKey: skus.cardImageObjectKey }).from(skus).all()) {
    if (row.objectKey) referenced.add(row.objectKey);
  }
  for (const row of db.select({ objectKey: banners.objectKey }).from(banners).all()) {
    if (row.objectKey) referenced.add(row.objectKey);
  }
  const settings = db.select().from(siteSettings).where(eq(siteSettings.id, 1)).get();
  if (settings?.logoObjectKey) referenced.add(settings.logoObjectKey);
  if (settings?.wechatQrObjectKey) referenced.add(settings.wechatQrObjectKey);
  return referenced;
}

// 从候选对象键中挑出"上传前缀且未被引用"的键（去重、排序）
export function findOrphanObjectKeys(objectKeys, referencedKeys) {
  const referenced = referencedKeys instanceof Set ? referencedKeys : new Set(referencedKeys || []);
  return [...new Set(objectKeys || [])]
    .filter((key) => isUploadObjectKey(key) && !referenced.has(key))
    .sort();
}

// 扫描 OSS 桶并与数据库比对（只读，不删除）
export async function detectOrphanObjects(client, db) {
  const objects = [];
  let marker;
  do {
    const res = await client.list({ marker, "max-keys": 1000 });
    for (const obj of res.objects || []) {
      if (obj?.name) objects.push({ key: obj.name, size: Number(obj.size) || 0 });
    }
    marker = res.nextMarker;
  } while (marker);

  const referenced = collectReferencedObjectKeys(db);
  const orphanKeys = new Set(findOrphanObjectKeys(objects.map((o) => o.key), referenced));
  const items = objects
    .filter((o) => orphanKeys.has(o.key))
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((o) => ({ key: o.key, size: o.size }));
  return { scanned: objects.length, referencedCount: referenced.size, items };
}

// 批量删除（每批 100 用 deleteMulti；整批失败时标记该批全部为失败）
export async function deleteOrphanObjects(client, keys) {
  const unique = [...new Set(keys)].filter(isUploadObjectKey);
  const failures = [];
  for (let i = 0; i < unique.length; i += DELETE_BATCH_SIZE) {
    const batch = unique.slice(i, i + DELETE_BATCH_SIZE);
    try {
      await client.deleteMulti(batch);
    } catch (err) {
      failures.push(...batch);
      console.error(`[orphans] 批量删除失败（${batch.length} 个）:`, err?.message || err);
    }
  }
  return { deleted: unique.length - failures.length, failures };
}
