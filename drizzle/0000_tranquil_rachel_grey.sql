CREATE TABLE `banners` (
	`id` text PRIMARY KEY NOT NULL,
	`desktop_image_cn_key` text NOT NULL,
	`desktop_image_en_key` text NOT NULL,
	`mobile_image_cn_key` text,
	`mobile_image_en_key` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "banners_enabled_check" CHECK("banners"."enabled" IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX `banners_enabled_order_idx` ON `banners` (`enabled`,`sort_order`);--> statement-breakpoint
CREATE TABLE `product_tags` (
	`product_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`product_id`, `tag_id`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_tags_tag_product_idx` ON `product_tags` (`tag_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name_cn` text NOT NULL,
	`name_en` text,
	`description_cn` text DEFAULT '' NOT NULL,
	`description_en` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "products_status_check" CHECK("products"."status" IN ('draft', 'published')),
	CONSTRAINT "products_view_count_check" CHECK("products"."view_count" >= 0)
);
--> statement-breakpoint
CREATE INDEX `products_latest_idx` ON `products` (`status`,"created_at" desc);--> statement-breakpoint
CREATE INDEX `products_hot_idx` ON `products` (`status`,"view_count" desc,"created_at" desc);--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`logo_object_key` text,
	`contact_text_cn` text DEFAULT '' NOT NULL,
	`contact_text_en` text,
	`wechat_id` text DEFAULT '' NOT NULL,
	`wechat_qr_object_key` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "site_settings_id_check" CHECK("site_settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE `sku_images` (
	`id` text PRIMARY KEY NOT NULL,
	`sku_id` text NOT NULL,
	`object_key` text NOT NULL,
	`position` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`mime_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	FOREIGN KEY (`sku_id`) REFERENCES `skus`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "sku_images_position_check" CHECK("sku_images"."position" >= 1),
	CONSTRAINT "sku_images_width_check" CHECK("sku_images"."width" > 0),
	CONSTRAINT "sku_images_height_check" CHECK("sku_images"."height" > 0),
	CONSTRAINT "sku_images_byte_size_check" CHECK("sku_images"."byte_size" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sku_images_object_key_unique` ON `sku_images` (`object_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `sku_images_sku_position_uq` ON `sku_images` (`sku_id`,`position`);--> statement-breakpoint
CREATE INDEX `sku_images_sku_position_idx` ON `sku_images` (`sku_id`,`position`);--> statement-breakpoint
CREATE TABLE `skus` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`name_cn` text NOT NULL,
	`name_en` text,
	`tab_label_cn` text NOT NULL,
	`tab_label_en` text,
	`price_cents` integer NOT NULL,
	`position` integer NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "skus_price_cents_check" CHECK("skus"."price_cents" >= 0),
	CONSTRAINT "skus_position_check" CHECK("skus"."position" BETWEEN 1 AND 3),
	CONSTRAINT "skus_enabled_check" CHECK("skus"."enabled" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skus_product_position_uq` ON `skus` (`product_id`,`position`);--> statement-breakpoint
CREATE INDEX `skus_product_enabled_position_idx` ON `skus` (`product_id`,`enabled`,`position`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name_cn` text NOT NULL,
	`name_en` text,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "tags_enabled_check" CHECK("tags"."enabled" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_cn_unique` ON `tags` (`name_cn`);--> statement-breakpoint
CREATE INDEX `tags_enabled_name_idx` ON `tags` (`enabled`,`name_cn`);--> statement-breakpoint
INSERT INTO `site_settings` (`id`) VALUES (1);
