# 克里斯卡社一期数据库架构

## 1. 目的与结论

本文档定义一期数据库的数据边界、表结构、约束、索引、读写链路、OSS 一致性、迁移和备份恢复规则。

一期继续采用 SQLite，原因是当前只有一台新加坡 ECS、一个中台使用者、500 个以内 Product 和约 1,000 月 PV。这个规模不需要 RDS、Redis、搜索引擎或读写分离。SQLite 的成立条件是应用保持单实例、数据库文件位于 ECS 持久化磁盘，并按本文档配置和备份。

数据库不是所有页面内容的容器。系统边界如下：

| 内容 | 所有者 | 原因 |
| --- | --- | --- |
| Product、SKU、Tag、Banner 配置、联系方式、浏览次数 | SQLite | 需要中台修改、筛选、排序或建立关系 |
| SKU 图片、Banner、Logo、微信二维码二进制 | OSS | 文件体积大，需要 CDN 分发 |
| OSS 图片 object key、图片顺序和尺寸元数据 | SQLite | 需要和 SKU、Banner、设置建立稳定关系 |
| 首页布局、导航、商品详情布局 | 前端代码 | 一期不提供页面装修，不应进入数据库 |
| 中英文品牌介绍 HTML | 前端代码 | 已确认由开发者维护，中台不可编辑 |
| `accessKey` | ECS 环境变量 | 它是部署凭据，不能进入数据库或客户端构建产物 |

数据库中的 `object_key` 不是完整 URL。服务端使用环境变量中的 CDN 资源域名拼接公开地址，例如：

```text
ASSET_BASE_URL=https://assets.example.com
object_key=sku/<skuId>/<imageId>.webp
公开地址=https://assets.example.com/sku/<skuId>/<imageId>.webp
```

这样更换 CDN 域名时不需要批量修改数据库。预签名上传 URL 和带签名的临时访问 URL 不得写入数据库。

## 2. 运行组件

- 数据库：SQLite 3。
- Node 驱动：`better-sqlite3`。
- 数据访问与迁移：Drizzle ORM + Drizzle Kit。
- 生产数据库路径：`/var/lib/chris-hub/chris-hub.sqlite`。
- ECS 或容器必须将该目录挂载到持久化磁盘；数据库文件不得放在应用发布目录、OSS 或网络文件系统中。
- 数据库文件和备份临时文件只允许应用系统用户读写，默认文件权限为 `0600`。
- 应用只运行一个可写 Node.js 进程，不启用 Node cluster 或多副本部署。
- Next.js 数据访问代码固定使用 Node runtime，不在 Edge runtime 中加载 SQLite 驱动。

生产连接初始化必须执行：

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;
PRAGMA busy_timeout = 5000;
```

- `foreign_keys` 确保关系约束实际生效。
- WAL 允许读取和短写入并行。
- `synchronous=FULL` 优先保证商品配置数据的持久性；当前写入量极低，不需要用可靠性换性能。
- `busy_timeout` 只用于吸收短暂写锁，不用于掩盖持续并发问题。

## 3. 表结构

### 3.1 `site_settings`

全站只有一行配置，由迁移创建 `id = 1` 的初始记录。

| 字段 | 类型 | 约束 | 用途 |
| --- | --- | --- | --- |
| `id` | INTEGER | PK，CHECK = 1 | 单例键 |
| `logo_object_key` | TEXT | NULL | 空值时使用代码内置 Logo |
| `contact_text_cn` | TEXT | NOT NULL，默认空串 | 中文联系说明 |
| `contact_text_en` | TEXT | NULL | 英文联系说明，空值回退中文 |
| `wechat_id` | TEXT | NOT NULL，默认空串 | 微信号 |
| `wechat_qr_object_key` | TEXT | NULL | 微信二维码 OSS Key |
| `updated_at` | TEXT | NOT NULL | UTC ISO 8601 时间 |

不建立通用键值配置表，避免把任意配置塞进无约束 JSON。

### 3.2 `banners`

| 字段 | 类型 | 约束 | 用途 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | UUID |
| `desktop_image_cn_key` | TEXT | NOT NULL | 中文桌面图 |
| `desktop_image_en_key` | TEXT | NOT NULL | 英文桌面图 |
| `mobile_image_cn_key` | TEXT | NULL | 中文移动图 |
| `mobile_image_en_key` | TEXT | NULL | 英文移动图 |
| `sort_order` | INTEGER | NOT NULL，默认 0 | 展示顺序 |
| `enabled` | INTEGER | NOT NULL，CHECK IN (0,1) | 是否展示 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

图片二进制不进入表。移动图为空时，由应用回退到相同语言的桌面图。

### 3.3 `products`

Product 是搜索、列表、URL、发布、标签和浏览统计的最小业务单元。

| 字段 | 类型 | 约束 | 用途 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | `crypto.randomUUID()` 生成，进入公开 URL |
| `name_cn` | TEXT | NOT NULL | 中文搜索名、卡片名和面包屑 |
| `name_en` | TEXT | NULL | 英文名称，空值回退中文 |
| `description_cn` | TEXT | NOT NULL，默认空串 | 中文共享介绍 |
| `description_en` | TEXT | NULL | 英文共享介绍 |
| `status` | TEXT | NOT NULL，CHECK IN ('draft','published') | 草稿或发布 |
| `view_count` | INTEGER | NOT NULL，默认 0，CHECK >= 0 | 热门排序计数 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 内容更新时间 |

- 浏览次数增长不得修改 `updated_at`，否则访问行为会污染内容更新时间。
- 一期不提供 Product 硬删除；下架通过改回 `draft` 完成。

### 3.4 `skus`

SKU 只能在所属 Product 编辑页中维护，不拥有独立页面、搜索结果或浏览统计。

| 字段 | 类型 | 约束 | 用途 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | UUID |
| `product_id` | TEXT | NOT NULL，FK -> products.id，ON DELETE CASCADE | 所属 Product |
| `name_cn` | TEXT | NOT NULL | 中文详情页主标题 |
| `name_en` | TEXT | NULL | 英文主标题 |
| `tab_label_cn` | TEXT | NOT NULL | 中文 Tab 短标签 |
| `tab_label_en` | TEXT | NULL | 英文 Tab 短标签 |
| `price_cents` | INTEGER | NOT NULL，CHECK >= 0 | 人民币分 |
| `position` | INTEGER | NOT NULL，CHECK BETWEEN 1 AND 3 | 展示顺序和默认项 |
| `enabled` | INTEGER | NOT NULL，CHECK IN (0,1) | 是否在前台可选 |
| `card_image_object_key` | TEXT | NULL，发布时必填 | 列表缩略图 OSS Key |
| `card_image_width` | INTEGER | NULL，CHECK > 0 | 列表缩略图宽度 |
| `card_image_height` | INTEGER | NULL，CHECK > 0 | 列表缩略图高度 |
| `card_image_mime_type` | TEXT | NULL | 仅允许 JPEG、PNG、WebP |
| `card_image_byte_size` | INTEGER | NULL，CHECK > 0 | 列表缩略图文件大小 |

数据库约束：

```sql
UNIQUE (product_id, position)
```

`position` 只能是 1、2、3，并且同一 Product 内不可重复，因此数据库层天然限制最多 3 个 SKU。排序第一的启用 SKU 是默认 SKU。

列表缩略图是 SKU 的单图（`card_image_*` 列），详情大图保存在 `sku_images`。发布校验要求启用 SKU 的 `card_image_*` 全部非空，且 `sku_images` 至少一行。列表缩略图与详情大图在上传时都必须通过图片规范校验（见 §8.1）。

### 3.5 `sku_images`

本表只保存 SKU 的**详情大图组**；列表缩略图作为 `skus.card_image_*` 列保存，不进入本表。详情页缩略图导航由详情大图派生显示，不单独存储。

| 字段 | 类型 | 约束 | 用途 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | UUID |
| `sku_id` | TEXT | NOT NULL，FK -> skus.id，ON DELETE CASCADE | 所属 SKU |
| `object_key` | TEXT | NOT NULL，UNIQUE | OSS 对象 Key |
| `position` | INTEGER | NOT NULL，CHECK >= 1 | 详情大图组内顺序，1 为该组主图 |
| `width` | INTEGER | NOT NULL，CHECK > 0 | 原图宽度 |
| `height` | INTEGER | NOT NULL，CHECK > 0 | 原图高度 |
| `mime_type` | TEXT | NOT NULL | 仅允许 JPEG、PNG、WebP |
| `byte_size` | INTEGER | NOT NULL，CHECK > 0 | 文件大小 |

数据库约束：

```sql
UNIQUE (sku_id, position)
```

宽高用于前端预留稳定比例，避免图片加载后产生布局跳动。替代文本不单独存储，由 SKU 名称和图片序号生成。

### 3.6 `tags`

| 字段 | 类型 | 约束 | 用途 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | UUID |
| `name_cn` | TEXT | NOT NULL，UNIQUE | 中文标签名 |
| `name_en` | TEXT | NULL | 英文标签名 |
| `enabled` | INTEGER | NOT NULL，CHECK IN (0,1) | 是否作为前台筛选项 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

应用保存前统一去除名称首尾空格。停用标签保留和 Product 的现有关系。

### 3.7 `product_tags`

| 字段 | 类型 | 约束 | 用途 |
| --- | --- | --- | --- |
| `product_id` | TEXT | PK 组成，FK -> products.id，ON DELETE CASCADE | Product |
| `tag_id` | TEXT | PK 组成，FK -> tags.id，ON DELETE CASCADE | Tag |

复合主键：

```sql
PRIMARY KEY (product_id, tag_id)
```

## 4. 明确不建立的表

- `users`、`admins`、`roles`、`permissions`、`sessions`：一期只使用环境变量中的 `accessKey`。
- `orders`、`payments`、`inventory`：网站不交易。
- `pages`、`page_blocks`：页面结构写在代码中。
- `product_images`：Product 没有公共图，图片只属于 SKU。
- `sku_attributes`、`option_groups`：规格、稀有度、尺寸和日期由 SKU 名称与 Tab 标签表达。
- `media_assets`：一期图片不跨业务对象复用，直接保存 OSS Key 即可。
- `analytics_events`：一期只维护 Product 浏览次数。

## 5. 索引

除主键和唯一约束自动生成的索引外，建立：

```sql
CREATE INDEX products_latest_idx
ON products (status, created_at DESC);

CREATE INDEX products_hot_idx
ON products (status, view_count DESC, created_at DESC);

CREATE INDEX skus_product_enabled_position_idx
ON skus (product_id, enabled, position);

CREATE INDEX sku_images_sku_position_idx
ON sku_images (sku_id, position);

CREATE INDEX product_tags_tag_product_idx
ON product_tags (tag_id, product_id);

CREATE INDEX banners_enabled_order_idx
ON banners (enabled, sort_order);

CREATE INDEX tags_enabled_name_idx
ON tags (enabled, name_cn);
```

商品名称搜索采用 `%用户输入%` 连续包含匹配，普通 B-tree 索引无法有效加速前置通配符查询。500 个 Product 直接扫描更简单，不引入 FTS 表或搜索服务。

## 6. 前台读取链路

### 6.1 首页

一次请求读取三类动态数据：

1. `banners`：`enabled = 1`，按 `sort_order` 排序。
2. `products`：`status = published`，按 `view_count DESC, created_at DESC` 取 8 个，并关联默认 SKU 主图与最低价格。
3. `site_settings`：读取 Logo 覆盖项和联系方式。

首页布局、导航和品牌介绍从前端代码读取，不访问数据库。

### 6.2 商品列表

- 从 `products` 查询已发布 Product。
- 名称搜索只检查 `products.name_cn` 和 `products.name_en`。
- 标签筛选通过 `product_tags`，多个标签采用 OR 语义。
- 通过 `skus` 聚合启用 SKU 的 `MIN(price_cents)` 和数量。
- 默认卡图取排序第一的启用 SKU，再取其 `sku_images.position = 1`。
- 使用 `LIMIT 20 OFFSET ...` 分页；500 个 Product 不需要游标分页。

查询必须按页批量取得卡片数据，禁止为每张卡片分别查询 SKU 和图片，避免 N+1 查询。

### 6.3 商品详情

按 `product_id` 且 `status = published` 读取：

- Product 共享字段和标签。
- 启用 SKU，按 `position` 排序。
- 每个 SKU 的图片，按 `position` 排序。

不存在、草稿、没有启用 SKU 或启用 SKU 没有图片时返回 404，不向前台暴露半成品。

### 6.4 浏览次数

有效详情页每次访问执行原子更新：

```sql
UPDATE products
SET view_count = view_count + 1
WHERE id = ? AND status = 'published';
```

中台预览不执行该更新。当前流量允许每次直接写库，不增加 Redis、消息队列或批处理计数。

## 7. 中台写入事务

Product 是写入聚合根。保存商品时使用一个数据库事务：

1. 校验 Product 中文字段、状态和 `updated_at`。
2. 校验 SKU 总数不超过 3，`position` 不重复，启用 SKU 满足发布条件。
3. 新建或更新 Product。
4. 同步 Product 与 Tag 关系。
5. 新建、更新或移除当前 Product 内的 SKU。
6. 同步每个 SKU 的图片元数据与顺序。
7. 发布时再次验证至少一个启用 SKU，且每个启用 SKU 至少一张图片。
8. 提交事务；任何一步失败全部回滚。

事务只包含数据库操作，不在持锁期间上传或删除 OSS 对象。SKU、SKU 图片和 ProductTag 不提供脱离 Product 的公开写接口。Banner、Tag 和 SiteSettings 各自使用短事务保存。

## 8. OSS 与数据库一致性

SQLite 事务不能覆盖 OSS，因此使用“先上传、后引用；先删引用、后删对象”的顺序。
图片比例、最小尺寸、格式和大小上限以 `lib/image-specs.js` 为唯一事实源，业务规范见 [development-plan.md §11.6](../development-plan.md)。

### 8.1 新增图片

1. 带正确 `accessKey` 的服务端接口生成唯一 object key 和短期 PUT 凭证，限定对象前缀、文件类型和大小。
2. 管理员在浏览器中选择文件；中台按图片规范打开固定比例裁切器（自动居中裁切，可缩放/平移调整），用户确认后将裁剪后的最终文件直传 OSS。
3. 服务端检查对象存在、类型、大小、尺寸与比例（容差 ±2px），不符合规范的请求拒绝并返回错误。
4. Product 保存事务写入 `skus.card_image_*`（列表缩略图）与 `sku_images`（详情大图组）引用。
5. 如果数据库保存失败，立即尝试删除本次新上传且未被引用的对象，并记录失败 Key。

对象 Key 使用受控业务前缀，例如 `sku/<skuId>/card-<id>.<ext>`（列表缩略图）、`sku/<skuId>/<imageId>.<ext>`（详情大图）、`banner/` 和 `site/`，不接受管理员自行提交任意 Bucket 路径。

### 8.2 删除或替换图片

1. 数据库事务先删除或替换 object key 引用。
2. 数据库提交成功后再删除旧 OSS 对象。
3. OSS 删除失败不回滚数据库，记录 Key 并重试清理；这样前台不会引用已经不存在的图片。

### 8.3 孤儿对象检查

一期不增加 `media_assets` 表。上线运维脚本定期比较 OSS 指定业务前缀与数据库中全部 object key，只报告或清理超过 24 小时且未被引用的对象。清理动作必须输出日志，禁止扫描或删除 Bucket 中不属于本站的前缀。

Banner、Logo 和微信二维码的新增、替换与删除同样遵循上述顺序，不另建一套媒体一致性流程。

## 9. 缓存策略

- 一期不使用 Redis 或应用内数据库结果缓存。
- 公开 HTML 首期由 Next.js 服务端直接读取 SQLite，确保中台修改立即可见。
- OSS 图片和 Next.js 静态资源由 CDN 缓存。
- 中台页面、管理接口和带 `accessKey` 的路径全部 `no-store`，CDN 不缓存。
- 后续只有数据库查询成为可观测瓶颈后，才考虑公共页面短缓存和保存后主动失效。

## 10. 迁移和发布

- Drizzle Kit 生成的版本化 SQL 迁移文件进入 Git。
- 开发、测试和生产使用不同 SQLite 文件。
- 禁止在生产环境使用自动 schema push 或启动时隐式改表。
- 每次包含数据库变更的发布顺序：创建一致性备份、执行迁移、运行 `PRAGMA integrity_check`、启动新应用、执行冒烟测试。
- 迁移失败时停止发布并保留原数据库和旧应用版本，不继续带病启动。
- `site_settings(id=1)` 初始行由首个迁移创建，而不是依赖人工录入。

## 11. 备份与恢复

### 11.1 备份

- 每日生成一次一致性 SQLite 快照并上传至新加坡 OSS。
- 使用 SQLite Backup API、`.backup` 或 `VACUUM INTO`；开启 WAL 后禁止只复制主 `.sqlite` 文件作为备份。
- 每次数据库迁移前额外创建一次备份。
- 备份文件包含时间、schema 版本和 SHA-256 校验值。
- OSS 启用服务端加密，备份保留最近 30 天。
- 备份任务的成功、大小、校验值和失败原因进入运维日志。

一期恢复目标：RPO 不超过 24 小时，RTO 不超过 4 小时。它们是工程目标，不是对外 SLA。

### 11.2 恢复

1. 停止应用写入。
2. 下载指定备份并验证 SHA-256。
3. 在临时路径执行 `PRAGMA integrity_check`。
4. 保留当前损坏数据库副本，再原子替换生产数据库文件。
5. 执行缺失迁移。
6. 启动应用并验证首页、商品详情、中台读写和图片引用。

上线前必须完成一次真实恢复演练，之后至少每季度演练一次。只验证“备份文件存在”不算恢复验证。

## 12. 可观测性

- 健康检查包含数据库 `SELECT 1` 和只读配置查询。
- 记录迁移结果、事务失败、`SQLITE_BUSY`、外键错误、OSS 清理失败和备份结果。
- 日志只记录操作名称、实体 ID 和错误类型，不记录 `accessKey`、联系方式全文或 OSS 签名 URL。
- 如果持续出现 `SQLITE_BUSY`，先查找长事务和多进程误部署，不通过无限增加超时时间掩盖问题。

## 13. 从 SQLite 升级的触发条件

出现以下任一条件时，评估迁移至阿里云 RDS PostgreSQL：

- 应用必须运行两个或更多可写实例。
- 中台出现多个并发操作者或批量写入任务。
- 持续出现可观测的锁等待或 `SQLITE_BUSY`。
- 业务要求数据库自动故障切换、高可用或更短 RPO/RTO。
- 数据分析和查询复杂度显著超出当前商品展示模型。

不要仅因为“网站使用数据库”而提前上 RDS。当前关系模型、整数价格、UUID 和显式外键均保持可迁移性，但迁移仍需单独的数据校验和切换方案，不能假设更换 ORM 方言即可自动完成。

## 14. 数据库验收标准

1. 新数据库可通过版本化迁移从零创建，并自动生成 `site_settings(id=1)`。
2. 外键、CHECK、UNIQUE 和索引在生产连接中实际生效。
3. 数据库拒绝同一 Product 的第 4 个 SKU 或重复 SKU `position`。
4. Product 保存任一步失败时，Product、SKU、图片元数据和标签关系全部回滚。
5. 列表查询一次批量返回 20 个 Product 的默认图、最低价和 SKU 数量，不产生 N+1 查询。
6. 草稿或没有完整有效 SKU 的 Product 不会被前台读取。
7. 图片 DB 写入失败不会留下长期未记录的 OSS 对象；OSS 删除失败可观察并重试。
8. 浏览次数原子递增且不修改 Product `updated_at`。
9. 活跃写入期间生成的备份可以通过完整性检查并成功恢复。
10. 数据库文件位于 ECS 持久化磁盘，重新发布应用不会丢失数据。
