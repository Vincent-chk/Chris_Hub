PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TABLE `banners`;--> statement-breakpoint
CREATE TABLE `banners` (
	`id` text PRIMARY KEY NOT NULL,
	`purpose` text NOT NULL,
	`object_key` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "banners_purpose_check" CHECK("purpose" IN ('cn-desktop', 'en-desktop', 'cn-mobile', 'en-mobile')),
	CONSTRAINT "banners_enabled_check" CHECK("enabled" IN (0, 1))
);--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `banners_purpose_order_idx` ON `banners` (`purpose`,`sort_order`);
