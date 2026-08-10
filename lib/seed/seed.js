import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, sqlite } from "../db/connection.js";
import {
  banners,
  productTags,
  products,
  siteSettings,
  skuImages,
  skus,
  tags,
} from "../schema/index.js";
import { BANNERS, PRODUCTS, TAGS } from "../mock-data.js";
import { COPY } from "../i18n.js";

const PUBLIC_DIR = path.resolve("public");

function readSvgMeta(publicPath) {
  const absolute = path.join(PUBLIC_DIR, publicPath);
  const content = fs.readFileSync(absolute, "utf8");
  const match = content.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  if (!match) {
    throw new Error(`无法从 ${publicPath} 解析 viewBox`);
  }
  const mimeType = publicPath.endsWith(".svg") ? "image/svg+xml" : "application/octet-stream";
  return {
    width: Math.round(Number(match[1])),
    height: Math.round(Number(match[2])),
    mimeType,
    byteSize: fs.statSync(absolute).size,
  };
}

function seed() {
  db.transaction((tx) => {
    tx.delete(skuImages).run();
    tx.delete(productTags).run();
    tx.delete(skus).run();
    tx.delete(products).run();
    tx.delete(tags).run();
    tx.delete(banners).run();

    tx.insert(tags)
      .values(
        TAGS.map((tag) => ({
          id: tag.id,
          nameCn: tag.cn,
          nameEn: tag.en,
          enabled: 1,
        })),
      )
      .run();

    tx.insert(products)
      .values(
        PRODUCTS.map((product) => ({
          id: product.id,
          nameCn: product.name.cn,
          nameEn: product.name.en,
          descriptionCn: product.description.cn,
          descriptionEn: product.description.en,
          status: "published",
          viewCount: product.viewCount,
          createdAt: `${product.createdAt}T00:00:00.000Z`,
          updatedAt: `${product.createdAt}T00:00:00.000Z`,
        })),
      )
      .run();

    const skuRows = [];
    const imageRows = [];
    const productTagRows = [];
    for (const product of PRODUCTS) {
      product.skus.forEach((sku, skuIndex) => {
        const cardMeta = readSvgMeta(sku.cardImage.replace(/^\//, ""));
        skuRows.push({
          id: sku.id,
          productId: product.id,
          nameCn: sku.name.cn,
          nameEn: sku.name.en,
          tabLabelCn: sku.tab.cn,
          tabLabelEn: sku.tab.en,
          priceCents: Math.round(sku.price * 100),
          position: skuIndex + 1,
          enabled: 1,
          cardImageObjectKey: `mock/${sku.id}/${path.basename(sku.cardImage)}`,
          cardImageWidth: cardMeta.width,
          cardImageHeight: cardMeta.height,
          cardImageMimeType: cardMeta.mimeType,
          cardImageByteSize: cardMeta.byteSize,
        });
        sku.detailImages.forEach((image, imageIndex) => {
          const publicPath = image.replace(/^\//, "");
          imageRows.push({
            id: `${sku.id}-img-${imageIndex + 1}`,
            skuId: sku.id,
            objectKey: `mock/${sku.id}/${path.basename(image)}`,
            position: imageIndex + 1,
            ...readSvgMeta(publicPath),
          });
        });
      });
      product.tags.forEach((tagId) => {
        productTagRows.push({ productId: product.id, tagId });
      });
    }
    tx.insert(skus).values(skuRows).run();
    tx.insert(skuImages).values(imageRows).run();
    tx.insert(productTags).values(productTagRows).run();

    const bannerRows = [];
    BANNERS.forEach((banner, index) => {
      const purposes = [
        ["cn-desktop", banner.cn],
        ["en-desktop", banner.en],
        ["cn-mobile", banner.cnMobile],
        ["en-mobile", banner.enMobile],
      ];
      for (const [purpose, path] of purposes) {
        bannerRows.push({
          id: `${banner.id}-${purpose}`,
          purpose,
          objectKey: path.replace(/^\//, ""),
          sortOrder: index,
          enabled: 1,
        });
      }
    });
    tx.insert(banners).values(bannerRows).run();

    tx.update(siteSettings)
      .set({
        contactTextCn: COPY.cn.contactBody,
        contactTextEn: COPY.en.contactBody,
        wechatId: "ChrisHub_Cards",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(siteSettings.id, 1))
      .run();
  });
}

function countRows(tableName) {
  return sqlite.prepare(`SELECT COUNT(*) AS c FROM ${tableName}`).get().c;
}

try {
  seed();
  console.log(
    `种子完成: tags=${countRows("tags")} products=${countRows("products")} ` +
      `skus=${countRows("skus")} sku_images=${countRows("sku_images")} ` +
      `banners=${countRows("banners")} product_tags=${countRows("product_tags")}`,
  );
} catch (error) {
  console.error("种子失败:", error.message);
  process.exitCode = 1;
}
