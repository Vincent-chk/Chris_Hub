# 数据调用契约

本文定义前台、中台与 SQLite/OSS 之间的最小调用边界。接口名称是实现约定，不要求一期立即拆成独立服务。

## 1. 前台读取

### `getHomeData(locale)`

返回：

```js
{
  banners: [{ id, desktopUrl, mobileUrl }],
  popularProducts: [{ id, name, tags, coverUrl, priceFrom, skuCount }],
  contact: { description, wechatId, qrUrl }
}
```

规则：只返回启用 Banner、已发布 Product 和启用标签；热门排序为浏览次数降序、创建时间降序；`description` 和本地化字段按“英文缺失回退中文”处理。
`popularProducts[].coverUrl` 取默认 SKU 的列表缩略图（`skus.card_image_object_key`）。

### `listProducts({ locale, query, tagIds, sort, page, pageSize })`

返回 `{ items, page, pageSize, total, totalPages }`。`query` 只匹配 `products.name_cn/name_en`；`tagIds` 匹配任意标签；`sort` 为 `latest` 或 `hot`；`pageSize` 前台固定为 20，服务端再次限制不超过 20。`items[].coverUrl` 取该商品默认 SKU 的列表缩略图。

### `listEnabledTags(locale)`

返回启用标签 `[{ id, name }]`，按中文名称升序；`name` 为本地化名称（英文缺失回退中文）。用于商品列表页的标签筛选条件。

### `getProductDetail({ productId, locale })`

返回一个已发布 Product 聚合：Product 的名称、介绍、标签，以及按 `position` 排序的最多 3 个启用 SKU。每个 SKU 返回 `name`、`tab`、`price`、`cardImage`（列表缩略图 URL）和按 `position` 排序的 `detailImages`（详情大图 URL 数组）。不存在或未发布返回 404，不返回草稿部分数据。

### `incrementProductView(productId)`

详情页首次有效访问调用一次。服务端执行单条原子更新 `view_count = view_count + 1`；失败只记录日志，不阻塞详情页展示。不要为访客建立会话表或设备追踪表。

## 2. 中台写入

### `saveProductAggregate(input)`

输入包含一个 Product 和 0-3 个 SKU。服务端在一个 SQLite 事务中完成：校验中文必填、价格为非负整数或明确的金额精度、SKU 数量上限、启用 SKU 至少一个（发布时）、发布时启用 SKU 必须已提供列表缩略图且至少一张详情大图、缩略图与大图引用属于当前 SKU 且已通过图片规范校验，然后 upsert Product、重排/替换 SKU、同步 Product-Tag 关系。SKU 不提供独立写入接口。

### `createOrUpdateTag(input)`

中文名称必填，英文名称可空；停用只改变 `enabled`，不删除 `product_tags` 历史关系。

### `saveBanner(input)` / `saveSiteSettings(input)`

Banner 保存语言版本的桌面图和可选移动图、排序和启用状态；站点设置保存 Logo、微信号、双语联系说明和二维码对象 Key。品牌介绍不在此契约中，因为它由代码维护。

## 3. OSS 上传契约

上传分三步：

1. 中台服务端生成带短时效的 OSS multipart/直传凭证，限定对象前缀、文件类型和大小。
2. 管理员在浏览器中按上传区图片规范（比例、最小尺寸、格式、大小上限，唯一事实源 `lib/image-specs.js`，业务规范见 development-plan §11.6）执行固定比例裁剪；裁剪结果确认后，浏览器将裁剪后的最终文件直传 OSS。
3. 上传完成后将 `{objectKey, width, height, size, checksum}` 提交给 `saveProductAggregate` 或对应设置保存操作；服务端校验对象存在、类型、大小、尺寸与比例（容差 ±2px），不符合规范则拒绝。

数据库提交成功后对象才成为可见资源。删除/替换图片时先完成数据库引用切换，再异步删除旧对象；每日任务检查没有数据库引用的孤儿对象。二维码和 Logo 走同一规则，但对象前缀不同。

## 4. 字段映射

| 调用字段 | 数据库字段 |
| --- | --- |
| `product.name.cn/en` | `products.name_cn/name_en` |
| `product.description.cn/en` | `products.description_cn/description_en` |
| `sku.name`, `sku.tab`, `sku.price` | `skus.name_cn/name_en`, `tab_cn/tab_en`, `price_cny` |
| `sku.cardImage` | `skus.card_image_object_key` 及尺寸元数据 |
| `sku.detailImages[]` | `sku_images.object_key`, `position`, 尺寸元数据 |
| `product.tags[]` | `product_tags.product_id/tag_id` |
| `popularProducts` | `products.view_count`, `created_at` |
| `contact.qrUrl` | `site_settings.wechat_qr_object_key` |

详细约束、索引和事务见 [database-architecture.md](./database-architecture.md)。
