import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db/connection.js";
import {
  banners,
  products,
  productTags,
  siteSettings,
  skuImages,
  skus,
  tags,
} from "../schema/index.js";
import { localized } from "../i18n.js";
import { assetUrl } from "../assets.js";

const HOME_POPULAR_LIMIT = 8;

function localeOf(locale) {
  return locale === "en" ? "en" : "cn";
}

export function getHomeData(locale) {
  const l = localeOf(locale);

  const bannerRows = db
    .select()
    .from(banners)
    .where(eq(banners.enabled, 1))
    .orderBy(banners.sortOrder)
    .all();

  const settingsRow = db.select().from(siteSettings).where(eq(siteSettings.id, 1)).get();

  const productRows = db
    .select()
    .from(products)
    .where(eq(products.status, "published"))
    .orderBy(desc(products.viewCount), desc(products.createdAt))
    .limit(HOME_POPULAR_LIMIT)
    .all();

  const productIds = productRows.map((product) => product.id);
  const skuRows = productIds.length
    ? db.select().from(skus).where(inArray(skus.productId, productIds)).all()
    : [];
  const enabledSkuIds = skuRows.filter((sku) => sku.enabled === 1).map((sku) => sku.id);
  const imageRows = enabledSkuIds.length
    ? db
        .select()
        .from(skuImages)
        .where(inArray(skuImages.skuId, enabledSkuIds))
        .orderBy(skuImages.position)
        .all()
    : [];
  const tagLinkRows = productIds.length
    ? db.select().from(productTags).where(inArray(productTags.productId, productIds)).all()
    : [];
  const tagIds = [...new Set(tagLinkRows.map((row) => row.tagId))];
  const tagMap = tagIds.length
    ? new Map(
        db
          .select()
          .from(tags)
          .where(and(inArray(tags.id, tagIds), eq(tags.enabled, 1)))
          .all()
          .map((tag) => [tag.id, tag]),
      )
    : new Map();

  const imageBySku = new Map();
  for (const image of imageRows) {
    if (!imageBySku.has(image.skuId)) imageBySku.set(image.skuId, image);
  }

  const skusByProduct = new Map();
  for (const sku of skuRows) {
    if (!skusByProduct.has(sku.productId)) skusByProduct.set(sku.productId, []);
    skusByProduct.get(sku.productId).push(sku);
  }

  const tagIdsByProduct = new Map();
  for (const row of tagLinkRows) {
    if (!tagIdsByProduct.has(row.productId)) tagIdsByProduct.set(row.productId, []);
    tagIdsByProduct.get(row.productId).push(row.tagId);
  }

  const popularProducts = productRows.map((product) => {
    const productSkus = (skusByProduct.get(product.id) ?? [])
      .filter((sku) => sku.enabled === 1)
      .sort((a, b) => a.position - b.position);
    const defaultSku = productSkus[0];
    const defaultImage = defaultSku ? imageBySku.get(defaultSku.id) : undefined;
    const priceCentsList = productSkus.map((sku) => sku.priceCents);
    const productTagIds = tagIdsByProduct.get(product.id) ?? [];
    const localizedTags = productTagIds
      .map((id) => tagMap.get(id))
      .filter(Boolean)
      .map((tag) => localized({ cn: tag.nameCn, en: tag.nameEn }, l));
    return {
      id: product.id,
      name: localized({ cn: product.nameCn, en: product.nameEn }, l),
      tags: localizedTags,
      coverUrl: defaultImage ? assetUrl(defaultImage.objectKey) : null,
      priceFrom: priceCentsList.length ? Math.min(...priceCentsList) : null,
      skuCount: productSkus.length,
    };
  });

  const bannerList = bannerRows.map((banner) => {
    const desktopKey = l === "cn" ? banner.desktopImageCnKey : banner.desktopImageEnKey;
    const mobileKey = l === "cn" ? banner.mobileImageCnKey : banner.mobileImageEnKey;
    return {
      id: banner.id,
      desktopUrl: assetUrl(desktopKey),
      mobileUrl: assetUrl(mobileKey ?? desktopKey),
    };
  });

  const contact = {
    description: localized({ cn: settingsRow?.contactTextCn ?? "", en: settingsRow?.contactTextEn }, l),
    wechatId: settingsRow?.wechatId ?? "",
    qrUrl: assetUrl(settingsRow?.wechatQrObjectKey ?? null),
  };

  return { banners: bannerList, popularProducts, contact };
}
