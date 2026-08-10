// 中台数据层（阶段 C · C3）：商品/SKU/图片聚合写入与查询
// 契约见 docs/technical/data-access-contract.md §2 与 database-architecture.md §7
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import { banners, products, productTags, skuImages, skus, tags } from "../schema/index.js";
import { createOssAdminClient, validateUploadedImage } from "../oss/validate.js";

export const MAX_SKUS = 3;
export const MAX_DETAIL_IMAGES = 9;

const BANNER_UPLOAD_PREFIXES = ["sku/", "banner/", "site/"];

export class ValidationError extends Error {}
export class ConflictError extends Error {}

const nowIso = () => new Date().toISOString();

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function mimeFromFormat(format) {
  if (format === "png") return "image/png";
  if (format === "jpg" || format === "jpeg") return "image/jpeg";
  if (format === "webp") return "image/webp";
  return "application/octet-stream";
}

function formatFromMime(mime) {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return mime || "";
}

function parsePriceCents(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new ValidationError("价格必须是大于等于 0 的数字");
  }
  const cents = numeric * 100;
  if (Math.abs(cents - Math.round(cents)) > 1e-6) {
    throw new ValidationError("价格最多保留两位小数");
  }
  return Math.round(cents);
}

async function validateImageRef(image, specId, validateImage) {
  if (!image || typeof image !== "object" || !image.objectKey) {
    throw new ValidationError(specId === "card" ? "缺少列表缩略图" : "缺少详情大图");
  }
  const result = await validateImage({
    objectKey: image.objectKey,
    specId,
    checksum: typeof image.checksum === "string" && image.checksum ? image.checksum : undefined,
  });
  return {
    objectKey: image.objectKey,
    width: result.width,
    height: result.height,
    mimeType: mimeFromFormat(result.format),
    byteSize: result.byteSize,
  };
}

/**
 * 保存商品聚合（单事务）。validateImage 默认真实 OSS 校验，测试可注入 stub。
 * 返回保存后的聚合（同 getProductAggregate）。
 */
export async function saveProductAggregate(input, { validateImage = validateUploadedImage } = {}) {
  const data = input && typeof input === "object" ? input : {};
  const nameCn = cleanText(data.name?.cn);
  const nameEn = cleanText(data.name?.en);
  const descriptionCn = cleanText(data.description?.cn);
  const descriptionEn = cleanText(data.description?.en);
  const status = data.status === "published" ? "published" : "draft";
  if (!nameCn) throw new ValidationError("商品中文名称必填");

  const tagIds = Array.isArray(data.tagIds)
    ? [...new Set(data.tagIds.filter((id) => typeof id === "string" && id))]
    : [];
  const skuInputs = Array.isArray(data.skus) ? data.skus : [];
  if (skuInputs.length > MAX_SKUS) throw new ValidationError(`每个商品最多 ${MAX_SKUS} 个 SKU`);

  const positions = skuInputs.map((sku) => Number(sku?.position));
  for (const pos of positions) {
    if (!Number.isInteger(pos) || pos < 1 || pos > MAX_SKUS) {
      throw new ValidationError(`SKU 排序号必须是 1-${MAX_SKUS} 的整数`);
    }
  }
  if (new Set(positions).size !== positions.length) {
    throw new ValidationError("SKU 排序号不能重复");
  }

  const parsedSkus = [];
  const pendingImages = [];
  for (let i = 0; i < skuInputs.length; i++) {
    const sku = skuInputs[i] || {};
    const skuId = typeof sku.id === "string" && sku.id ? sku.id : undefined;
    const cardImage = sku.cardImage && typeof sku.cardImage === "object" ? sku.cardImage : null;
    const detailImages = Array.isArray(sku.detailImages) ? sku.detailImages : [];
    if (detailImages.length > MAX_DETAIL_IMAGES) {
      throw new ValidationError(`每个 SKU 最多 ${MAX_DETAIL_IMAGES} 张详情大图`);
    }
    if (cardImage) pendingImages.push({ skuIndex: i, kind: "card", image: cardImage });
    for (const image of detailImages) {
      if (image && typeof image === "object") {
        pendingImages.push({ skuIndex: i, kind: "detail", image });
      }
    }
    parsedSkus.push({
      id: skuId,
      skuNameCn: cleanText(sku.name?.cn),
      skuNameEn: cleanText(sku.name?.en),
      skuTabCn: cleanText(sku.tab?.cn),
      skuTabEn: cleanText(sku.tab?.en),
      priceCents: parsePriceCents(sku.priceCny ?? 0),
      enabled: sku.enabled === true || sku.enabled === 1,
      position: Number(sku.position),
      cardImage,
      detailImages,
    });
  }

  if (status === "published") {
    const enabledSkus = parsedSkus.filter((sku) => sku.enabled);
    if (!enabledSkus.length) throw new ValidationError("发布前至少需要一个启用 SKU");
    for (const sku of enabledSkus) {
      if (!sku.skuNameCn) throw new ValidationError("启用 SKU 的中文名称必填");
      if (!sku.skuTabCn) throw new ValidationError("启用 SKU 的中文 Tab 短标签必填");
      if (!sku.cardImage) throw new ValidationError("启用 SKU 必须提供列表缩略图");
      if (!sku.detailImages.length) throw new ValidationError("启用 SKU 必须至少一张详情大图");
    }
  }

  // 标签必须存在
  if (tagIds.length) {
    const existingTags = db
      .select({ id: tags.id })
      .from(tags)
      .where(inArray(tags.id, tagIds))
      .all();
    if (existingTags.length !== tagIds.length) throw new ValidationError("包含不存在的标签");
  }

  // 图片引用服务端复验（网络操作，放在事务之外）
  const imageMetaByRef = new Map();
  for (const pending of pendingImages) {
    const meta = await validateImageRef(pending.image, pending.kind, validateImage);
    imageMetaByRef.set(`${pending.skuIndex}:${pending.kind}:${pending.image.objectKey}`, meta);
  }

  // 读取现有商品与 SKU（乐观锁 + 旧对象收集）
  let existing = null;
  let existingSkus = [];
  if (data.id) {
    existing = db.select().from(products).where(eq(products.id, data.id)).get();
    if (!existing) throw new ValidationError("商品不存在");
    if (typeof data.updatedAt !== "string" || data.updatedAt !== existing.updatedAt) {
      throw new ConflictError("商品已被其他操作修改，请刷新后重试");
    }
    existingSkus = db.select().from(skus).where(eq(skus.productId, data.id)).all();
    const existingSkuIds = new Set(existingSkus.map((sku) => sku.id));
    for (const parsed of parsedSkus) {
      if (parsed.id && !existingSkuIds.has(parsed.id)) {
        throw new ValidationError("SKU 不属于当前商品");
      }
    }
  }

  const oldKeys = new Set();
  for (const sku of existingSkus) {
    if (sku.cardImageObjectKey) oldKeys.add(sku.cardImageObjectKey);
    const oldImages = db
      .select({ objectKey: skuImages.objectKey })
      .from(skuImages)
      .where(eq(skuImages.skuId, sku.id))
      .all();
    for (const img of oldImages) oldKeys.add(img.objectKey);
  }

  const productId = data.id || `prod-${randomUUID()}`;
  const updatedAt = nowIso();
  db.transaction((tx) => {
    if (existing) {
      tx.update(products)
        .set({
          nameCn,
          nameEn: nameEn || null,
          descriptionCn,
          descriptionEn: descriptionEn || null,
          status,
          updatedAt,
        })
        .where(eq(products.id, productId))
        .run();
    } else {
      tx.insert(products)
        .values({
          id: productId,
          nameCn,
          nameEn: nameEn || null,
          descriptionCn,
          descriptionEn: descriptionEn || null,
          status,
          updatedAt,
          createdAt: nowIso(),
        })
        .run();
    }

    // 同步标签关系
    tx.delete(productTags).where(eq(productTags.productId, productId)).run();
    if (tagIds.length) {
      tx.insert(productTags)
        .values(tagIds.map((tagId) => ({ productId, tagId })))
        .run();
    }

    // 删除本商品下不在输入中的 SKU（级联删除其图片）
    if (existing) {
      const keepIds = parsedSkus.map((sku) => sku.id).filter(Boolean);
      const removeIds = existingSkus.filter((sku) => !keepIds.includes(sku.id)).map((sku) => sku.id);
      if (removeIds.length) {
        tx.delete(skus).where(inArray(skus.id, removeIds)).run();
      }
    }

    for (let i = 0; i < parsedSkus.length; i++) {
      const parsed = parsedSkus[i];
      const skuId = parsed.id || `sku-${randomUUID()}`;
      const cardMeta = parsed.cardImage
        ? imageMetaByRef.get(`${i}:card:${parsed.cardImage.objectKey}`)
        : null;
      const skuValues = {
        nameCn: parsed.skuNameCn,
        nameEn: parsed.skuNameEn || null,
        tabLabelCn: parsed.skuTabCn,
        tabLabelEn: parsed.skuTabEn || null,
        priceCents: parsed.priceCents,
        position: parsed.position,
        enabled: parsed.enabled ? 1 : 0,
        cardImageObjectKey: cardMeta?.objectKey ?? null,
        cardImageWidth: cardMeta?.width ?? null,
        cardImageHeight: cardMeta?.height ?? null,
        cardImageMimeType: cardMeta?.mimeType ?? null,
        cardImageByteSize: cardMeta?.byteSize ?? null,
      };
      if (existing && parsed.id) {
        tx.update(skus)
          .set(skuValues)
          .where(and(eq(skus.id, parsed.id), eq(skus.productId, productId)))
          .run();
      } else {
        tx.insert(skus)
          .values({ id: skuId, productId, ...skuValues })
          .run();
      }

      // 详情大图：整组重写（删除旧引用后按新顺序插入）
      tx.delete(skuImages).where(eq(skuImages.skuId, skuId)).run();
      const detailMetas = parsed.detailImages
        .map((image) => imageMetaByRef.get(`${i}:detail:${image.objectKey}`))
        .filter(Boolean);
      for (let j = 0; j < detailMetas.length; j++) {
        const meta = detailMetas[j];
        tx.insert(skuImages)
          .values({
            id: `img-${randomUUID()}`,
            skuId,
            objectKey: meta.objectKey,
            position: j + 1,
            width: meta.width,
            height: meta.height,
            mimeType: meta.mimeType,
            byteSize: meta.byteSize,
          })
          .run();
      }
    }
  });

  // 事务提交后删除被替换/移除的旧 OSS 对象（失败仅记日志）
  const newKeys = new Set(imageMetaByRef.values().map((meta) => meta.objectKey));
  const staleKeys = [...oldKeys].filter((key) => !newKeys.has(key));
  if (staleKeys.length) {
    try {
      const client = createOssAdminClient();
      for (const key of staleKeys) {
        await client.delete(key);
      }
    } catch (err) {
      console.error(`[admin] 删除旧对象失败（${staleKeys.join(", ")}）:`, err.message);
    }
  }

  return getProductAggregate(productId);
}

export function getProductAggregate(productId) {
  const product = db.select().from(products).where(eq(products.id, productId)).get();
  if (!product) return null;

  const tagRows = db
    .select({ id: tags.id, nameCn: tags.nameCn, nameEn: tags.nameEn })
    .from(productTags)
    .innerJoin(tags, eq(productTags.tagId, tags.id))
    .where(eq(productTags.productId, productId))
    .all();

  const skuRows = db
    .select()
    .from(skus)
    .where(eq(skus.productId, productId))
    .orderBy(skus.position)
    .all();
  const skuIds = skuRows.map((sku) => sku.id);
  const imageRows = skuIds.length
    ? db
        .select()
        .from(skuImages)
        .where(inArray(skuImages.skuId, skuIds))
        .orderBy(skuImages.position)
        .all()
    : [];

  const imagesBySku = new Map();
  for (const image of imageRows) {
    if (!imagesBySku.has(image.skuId)) imagesBySku.set(image.skuId, []);
    imagesBySku.get(image.skuId).push({
      objectKey: image.objectKey,
      width: image.width,
      height: image.height,
      format: formatFromMime(image.mimeType),
      byteSize: image.byteSize,
    });
  }

  return {
    id: product.id,
    name: { cn: product.nameCn, en: product.nameEn || "" },
    description: { cn: product.descriptionCn, en: product.descriptionEn || "" },
    status: product.status,
    updatedAt: product.updatedAt,
    viewCount: product.viewCount,
    tagIds: tagRows.map((tag) => tag.id),
    tags: tagRows,
    skus: skuRows.map((sku) => ({
      id: sku.id,
      name: { cn: sku.nameCn, en: sku.nameEn || "" },
      tab: { cn: sku.tabLabelCn, en: sku.tabLabelEn || "" },
      priceCny: String((sku.priceCents ?? 0) / 100),
      enabled: sku.enabled === 1,
      position: sku.position,
      cardImage: sku.cardImageObjectKey
        ? {
            objectKey: sku.cardImageObjectKey,
            width: sku.cardImageWidth,
            height: sku.cardImageHeight,
            format: formatFromMime(sku.cardImageMimeType),
            byteSize: sku.cardImageByteSize,
          }
        : null,
      detailImages: imagesBySku.get(sku.id) ?? [],
    })),
  };
}

export function listAdminProducts({ query = "", status, page = 1, pageSize = 20 }) {
  const q = cleanText(query);
  const conditions = [];
  if (q) {
    conditions.push(or(like(products.nameCn, `%${q}%`), like(products.nameEn, `%${q}%`)));
  }
  if (status === "draft" || status === "published") {
    conditions.push(eq(products.status, status));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const total = Number(
    db
      .select({ count: sql`count(*)` })
      .from(products)
      .where(where)
      .get().count,
  );
  const rows = db
    .select()
    .from(products)
    .where(where)
    .orderBy(desc(products.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all();

  const ids = rows.map((row) => row.id);
  const skuCountRows = ids.length
    ? db
        .select({ productId: skus.productId, count: sql`count(*)` })
        .from(skus)
        .where(inArray(skus.productId, ids))
        .groupBy(skus.productId)
        .all()
    : [];
  const countByProduct = new Map(skuCountRows.map((row) => [row.productId, Number(row.count)]));

  return {
    items: rows.map((row) => ({
      id: row.id,
      nameCn: row.nameCn,
      nameEn: row.nameEn || "",
      status: row.status,
      viewCount: row.viewCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      skuCount: countByProduct.get(row.id) ?? 0,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function createOrUpdateTag({ id, nameCn, nameEn }) {
  const cn = cleanText(nameCn);
  if (!cn) throw new ValidationError("标签中文名称必填");
  const en = cleanText(nameEn);
  const duplicate = db.select().from(tags).where(eq(tags.nameCn, cn)).get();
  if (duplicate && duplicate.id !== id) throw new ValidationError("标签中文名称已存在");

  const now = nowIso();
  if (id) {
    const existing = db.select().from(tags).where(eq(tags.id, id)).get();
    if (!existing) throw new ValidationError("标签不存在");
    const nextEn = nameEn === undefined ? existing.nameEn : en || null;
    db.update(tags)
      .set({ nameCn: cn, nameEn: nextEn, updatedAt: now })
      .where(eq(tags.id, id))
      .run();
    return db.select().from(tags).where(eq(tags.id, id)).get();
  }

  const tagId = `tag-${randomUUID()}`;
  db.insert(tags)
    .values({ id: tagId, nameCn: cn, nameEn: en || null, enabled: 1, createdAt: now, updatedAt: now })
    .run();
  return db.select().from(tags).where(eq(tags.id, tagId)).get();
}

function bannerToShape(row) {
  return {
    id: row.id,
    purpose: row.purpose,
    objectKey: row.objectKey,
    enabled: row.enabled === 1,
    sortOrder: row.sortOrder,
  };
}

export const BANNER_PURPOSES = ["cn-desktop", "en-desktop", "cn-mobile", "en-mobile"];
export const MAX_BANNERS_PER_PURPOSE = 5;

export function listBanners() {
  return db
    .select()
    .from(banners)
    .orderBy(banners.purpose, banners.sortOrder)
    .all()
    .map(bannerToShape);
}

export function listBannerPurpose(purpose) {
  return db
    .select()
    .from(banners)
    .where(eq(banners.purpose, purpose))
    .orderBy(banners.sortOrder)
    .all()
    .map(bannerToShape);
}

export function getBanner(id) {
  const row = db.select().from(banners).where(eq(banners.id, id)).get();
  return row ? bannerToShape(row) : null;
}

function bannerSpecId(purpose) {
  return purpose === "cn-desktop" || purpose === "en-desktop" ? "banner-desktop" : "banner-mobile";
}

async function validateBannerImageMeta(image, purpose, validateImage) {
  if (!image || typeof image !== "object" || !image.objectKey) {
    throw new ValidationError("缺少图片对象");
  }
  return validateImage({
    objectKey: image.objectKey,
    specId: bannerSpecId(purpose),
    checksum: typeof image.checksum === "string" && image.checksum ? image.checksum : undefined,
  });
}

// 清理不再被任何 Banner 引用、且属于上传前缀的 OSS 对象（失败仅记日志）
export async function cleanupOrphanedBannerObjects(keys) {
  const candidates = [
    ...new Set(
      keys.filter(
        (key) =>
          typeof key === "string" && BANNER_UPLOAD_PREFIXES.some((prefix) => key.startsWith(prefix)),
      ),
    ),
  ];
  if (!candidates.length) return;
  const referenced = new Set(
    db
      .select({ objectKey: banners.objectKey })
      .from(banners)
      .all()
      .map((row) => row.objectKey),
  );
  const toDelete = candidates.filter((key) => !referenced.has(key));
  if (!toDelete.length) return;
  try {
    const client = createOssAdminClient();
    for (const key of toDelete) {
      await client.delete(key);
    }
  } catch (err) {
    console.error(`[admin] 清理 Banner 旧对象失败（${toDelete.join(", ")}）:`, err.message);
  }
}

export async function createBannerImage(
  { purpose, image },
  { validateImage = validateUploadedImage } = {},
) {
  if (!BANNER_PURPOSES.includes(purpose)) {
    throw new ValidationError(`不支持的用途（允许：${BANNER_PURPOSES.join(", ")}）`);
  }
  const count = Number(
    db
      .select({ count: sql`count(*)` })
      .from(banners)
      .where(eq(banners.purpose, purpose))
      .get().count,
  );
  if (count >= MAX_BANNERS_PER_PURPOSE) {
    throw new ValidationError(
      `该用途 Banner 数量已达上限（${MAX_BANNERS_PER_PURPOSE} 张），请先删除旧图后再添加`,
    );
  }
  await validateBannerImageMeta(image, purpose, validateImage);
  const maxRow = db
    .select({ sortOrder: banners.sortOrder })
    .from(banners)
    .where(eq(banners.purpose, purpose))
    .orderBy(desc(banners.sortOrder))
    .limit(1)
    .get();
  const sortOrder = (maxRow?.sortOrder ?? -1) + 1;
  const id = `banner-${randomUUID()}`;
  const now = nowIso();
  db.insert(banners)
    .values({
      id,
      purpose,
      objectKey: image.objectKey,
      sortOrder,
      enabled: 1,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return getBanner(id);
}

export async function updateBannerImage(
  id,
  { image },
  {
    validateImage = validateUploadedImage,
    cleanupObjects = cleanupOrphanedBannerObjects,
  } = {},
) {
  const existing = db.select().from(banners).where(eq(banners.id, id)).get();
  if (!existing) return null;
  await validateBannerImageMeta(image, existing.purpose, validateImage);
  db.update(banners)
    .set({ objectKey: image.objectKey, updatedAt: nowIso() })
    .where(eq(banners.id, id))
    .run();
  if (existing.objectKey !== image.objectKey) {
    await cleanupObjects([existing.objectKey]);
  }
  return getBanner(id);
}

export function reorderBannerImages({ purpose, ids }) {
  if (!BANNER_PURPOSES.includes(purpose)) {
    throw new ValidationError(`不支持的用途（允许：${BANNER_PURPOSES.join(", ")}）`);
  }
  if (!Array.isArray(ids) || !ids.length || ids.some((id) => typeof id !== "string" || !id)) {
    throw new ValidationError("排序参数无效");
  }
  if (new Set(ids).size !== ids.length) {
    throw new ValidationError("排序参数不能重复");
  }
  const existing = db
    .select({ id: banners.id })
    .from(banners)
    .where(and(eq(banners.purpose, purpose), inArray(banners.id, ids)))
    .all();
  if (existing.length !== ids.length) {
    throw new ValidationError("包含不存在的 Banner 图");
  }
  db.transaction((tx) => {
    ids.forEach((id, index) => {
      tx.update(banners)
        .set({ sortOrder: index + 1 })
        .where(eq(banners.id, id))
        .run();
    });
  });
  return listBannerPurpose(purpose);
}

export async function deleteBannerImage(id, { cleanupObjects = cleanupOrphanedBannerObjects } = {}) {
  const existing = db.select().from(banners).where(eq(banners.id, id)).get();
  if (!existing) return false;
  db.delete(banners).where(eq(banners.id, id)).run();
  await cleanupObjects([existing.objectKey]);
  return true;
}
