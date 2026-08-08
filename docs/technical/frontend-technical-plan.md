# 前端技术方案

## 1. 目标

本方案覆盖 Chris Hub 用户前台的第一版可运行实现。前台只读取已发布商品和站点展示配置，不承担商品编辑、支付、订单或用户身份功能。当前仓库中的页面使用 `lib/mock-data.js` 完成视觉原型；真实数据库接入时只替换数据访问边界，不重写页面结构。

## 2. 技术栈

- Next.js App Router、React、JavaScript JSX。
- `lucide-react` 负责界面图标。
- CSS Modules 以外的单一全局样式文件 `app/globals.css`，保持 MVP 低复杂度。
- 生产数据层：`better-sqlite3 + Drizzle ORM`，见 [database-architecture.md](./database-architecture.md)。
- 图片由 OSS/CDN 提供，数据库只保存对象 Key 和元数据。

## 3. 路由与组件

```text
app/page.jsx                         / -> /cn
app/[locale]/page.jsx                首页
app/[locale]/products/page.jsx       商品列表
app/[locale]/products/[productId]    商品详情
app/components/site-header.jsx       全局导航和语言切换
app/components/banner-carousel.jsx   Banner 轮播
app/components/product-grid.jsx      商品网格
app/components/product-detail.jsx    SKU、图片和联系购买交互
```

`[locale]` 只接受 `cn` 和 `en`。无效语言或不存在的已发布 Product 返回 404。语言切换仅替换 URL 的语言段，保留当前 Product ID 和列表查询参数。

## 4. 页面行为

### 首页

服务端读取 Banner、站点联系设置和按 `view_count DESC, created_at DESC` 排序的 8 个 Product。品牌介绍是代码中的双语 HTML，不从数据库读取。Banner 轮播为客户端组件，自动播放、箭头和指示点可用；页面没有 Banner 链接。

### 商品列表

查询参数为 `q`、`tags`、`sort`、`page`。`q` 只对 Product 中文/英文名称做连续文字包含匹配；不读取 SKU 名称。标签采用“任意命中”规则，默认最新排序，单页最多 20 个 Product。原型通过 `window.history.pushState` 保持 URL；接入真实数据后建议改为服务端读取 URL 参数，并通过链接或表单提交刷新结果。
商品卡片图片使用默认 SKU 的列表缩略图（1:1）。

### 商品详情

服务端按 `productId` 获取一个 Product 聚合及其启用 SKU、图片。客户端默认选择排序第一的 SKU；切换 SKU 同步更新 SKU 名称、价格和图片组，但 URL 不变。详情大图组第一张（`position = 1`）是该组主图，支持缩略图导航、左右切换和放大查看；缩略图导航由详情大图派生显示。联系购买弹窗只展示中台配置的微信号和二维码。

## 5. 数据替换边界

页面组件不得直接 import 数据库驱动。真实接入时增加一个很薄的 `lib/repositories/catalog.js`：

```text
页面 / Server Component
  -> catalog repository（查询、排序、分页、已发布过滤）
  -> Drizzle query
  -> SQLite
```

原型中 `PRODUCTS`、`BANNERS`、`TAGS` 实现了同样字段形状，因此可以先替换页面入口的 import，再补充缓存和错误处理。客户端组件只接收序列化后的数据，不持有数据库连接。

## 6. 状态与可访问性

- 加载：真实数据接入后为列表和详情添加 `loading.jsx`，使用固定尺寸骨架，避免布局跳动。
- 空结果：保留搜索条件并显示清除入口。
- 404：草稿、停用 Product、错误语言和未知 ID 均使用统一 404 页面。
- 错误：数据库或 OSS 失败使用通用错误页，不向用户暴露 SQL、对象 Key 或 accessKey。
- 图片：所有主图使用 Product/SKU 名称作为 `alt`；装饰图使用空 `alt`。
- 控件：SKU 使用 tab 语义，弹窗使用 `role=dialog`，图标按钮带 `aria-label` 和 tooltip。

## 7. 响应式基线

- 桌面：`>= 1001px`，首页 Banner 与文案双栏，商品 4 列。
- 平板：`761-1000px`，商品 3 列，品牌介绍收为单列。
- 移动：`<= 760px`，导航折叠、商品 2 列、详情改为图片在前信息在后。
- 小屏：`<= 410px`，缩小间距与辅助文字；不依赖视口字体缩放。
- 图片容器始终使用 `aspect-ratio`：商品卡片 1:1、详情大图 4:5、详情缩略导航 1:1（由大图派生）、Banner 桌面 1.72:1 / 移动 1.2:1、Logo 与二维码 1:1；主图、缩略图和卡片不会因文字或加载状态改变尺寸。
