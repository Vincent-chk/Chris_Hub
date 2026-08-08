import { sql, desc } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  primaryKey,
  check,
} from "drizzle-orm/sqlite-core";

const utcNow = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const siteSettings = sqliteTable(
  "site_settings",
  {
    id: integer("id").primaryKey(),
    logoObjectKey: text("logo_object_key"),
    contactTextCn: text("contact_text_cn").notNull().default(""),
    contactTextEn: text("contact_text_en"),
    wechatId: text("wechat_id").notNull().default(""),
    wechatQrObjectKey: text("wechat_qr_object_key"),
    updatedAt: text("updated_at").notNull().default(utcNow),
  },
  (table) => [check("site_settings_id_check", sql`${table.id} = 1`)],
);

export const banners = sqliteTable(
  "banners",
  {
    id: text("id").primaryKey(),
    desktopImageCnKey: text("desktop_image_cn_key").notNull(),
    desktopImageEnKey: text("desktop_image_en_key").notNull(),
    mobileImageCnKey: text("mobile_image_cn_key"),
    mobileImageEnKey: text("mobile_image_en_key"),
    sortOrder: integer("sort_order").notNull().default(0),
    enabled: integer("enabled").notNull().default(1),
    createdAt: text("created_at").notNull().default(utcNow),
    updatedAt: text("updated_at").notNull().default(utcNow),
  },
  (table) => [
    check("banners_enabled_check", sql`${table.enabled} IN (0, 1)`),
    index("banners_enabled_order_idx").on(table.enabled, table.sortOrder),
  ],
);

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    nameCn: text("name_cn").notNull(),
    nameEn: text("name_en"),
    descriptionCn: text("description_cn").notNull().default(""),
    descriptionEn: text("description_en"),
    status: text("status").notNull().default("draft"),
    viewCount: integer("view_count").notNull().default(0),
    createdAt: text("created_at").notNull().default(utcNow),
    updatedAt: text("updated_at").notNull().default(utcNow),
  },
  (table) => [
    check("products_status_check", sql`${table.status} IN ('draft', 'published')`),
    check("products_view_count_check", sql`${table.viewCount} >= 0`),
    index("products_latest_idx").on(table.status, desc(table.createdAt)),
    index("products_hot_idx").on(table.status, desc(table.viewCount), desc(table.createdAt)),
  ],
);

export const skus = sqliteTable(
  "skus",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    nameCn: text("name_cn").notNull(),
    nameEn: text("name_en"),
    tabLabelCn: text("tab_label_cn").notNull(),
    tabLabelEn: text("tab_label_en"),
    priceCents: integer("price_cents").notNull(),
    position: integer("position").notNull(),
    enabled: integer("enabled").notNull().default(1),
    cardImageObjectKey: text("card_image_object_key"),
    cardImageWidth: integer("card_image_width"),
    cardImageHeight: integer("card_image_height"),
    cardImageMimeType: text("card_image_mime_type"),
    cardImageByteSize: integer("card_image_byte_size"),
  },
  (table) => [
    check("skus_price_cents_check", sql`${table.priceCents} >= 0`),
    check("skus_position_check", sql`${table.position} BETWEEN 1 AND 3`),
    check("skus_enabled_check", sql`${table.enabled} IN (0, 1)`),
    uniqueIndex("skus_product_position_uq").on(table.productId, table.position),
    index("skus_product_enabled_position_idx").on(table.productId, table.enabled, table.position),
  ],
);

export const skuImages = sqliteTable(
  "sku_images",
  {
    id: text("id").primaryKey(),
    skuId: text("sku_id")
      .notNull()
      .references(() => skus.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull().unique(),
    position: integer("position").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
  },
  (table) => [
    check("sku_images_position_check", sql`${table.position} >= 1`),
    check("sku_images_width_check", sql`${table.width} > 0`),
    check("sku_images_height_check", sql`${table.height} > 0`),
    check("sku_images_byte_size_check", sql`${table.byteSize} > 0`),
    uniqueIndex("sku_images_sku_position_uq").on(table.skuId, table.position),
    index("sku_images_sku_position_idx").on(table.skuId, table.position),
  ],
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    nameCn: text("name_cn").notNull().unique(),
    nameEn: text("name_en"),
    enabled: integer("enabled").notNull().default(1),
    createdAt: text("created_at").notNull().default(utcNow),
    updatedAt: text("updated_at").notNull().default(utcNow),
  },
  (table) => [
    check("tags_enabled_check", sql`${table.enabled} IN (0, 1)`),
    index("tags_enabled_name_idx").on(table.enabled, table.nameCn),
  ],
);

export const productTags = sqliteTable(
  "product_tags",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.tagId] }),
    index("product_tags_tag_product_idx").on(table.tagId, table.productId),
  ],
);
