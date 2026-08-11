# 可执行实施方案

## 当前状态

- 已完成：产品边界、SQLite 数据库架构和表关系。
- 已完成：阶段 A 原型确认（可运行中英文前台、路由与交互验收）。
- 已完成：阶段 B 真实读取链路——Drizzle schema 与首次迁移、`catalog` repository（`getHomeData` / `listProducts` / `getProductDetail` / `incrementProductView` / `listEnabledTags`）、前台页面已从 mock 切换到真实数据库、404/error 状态、24 条种子数据、自动化测试（`node:test`，`pnpm test` 全绿）。
- 未开始：阶段 C 中台与 OSS、阶段 D 部署与运维、阶段 E 上线验收。

## 阶段 A：原型确认

交付：可运行 Next.js 原型、桌面/移动截图、路由和交互检查。

验收门槛：

- [x] `/cn`、`/en`、列表和详情路由可访问。
- [x] 首页 8 个热门商品；列表每页最多 20 个。
- [x] 搜索“宝可梦”只命中 Product，分页可用。
- [x] 详情页切换 SKU 后名称、价格和图片同时变化，URL 不变化。
- [x] 联系购买弹窗、语言切换、移动导航可用。
- [ ] 1440 x 900 和 390 x 844 无明显溢出或重叠（待阶段 D 视口验证）。

## 阶段 B：真实读取链路

- [x] 按数据库文档建立 Drizzle schema 和第一次 migration。
- [x] 写 `catalog` repository，实现 `getHomeData`、`listProducts`、`getProductDetail`、`incrementProductView`（并补充 `listEnabledTags`）。
- [x] 将页面入口从 mock import 切换到 repository，组件按 repository 形状适配。
- [x] 增加 404、error 状态和已发布过滤（说明：`loading.jsx` 因流式响应会使 `notFound()` 返回 200，为保证"草稿 404"硬性要求而移除，见任务 9 记录）。
- [x] 用 10-20 条种子数据验证排序、标签、英文回退和 SKU 上限（实际种子 24 条）。

完成标志：数据库读取结果与阶段 A 的页面行为一致，且草稿不会出现在前台。

结论：**阶段 B 已完成**。

## 阶段 C：中台与 OSS

1. [x] 实现服务端 `accessKey` 路径校验和中台基础壳，不建立账号密码（C1：`lib/admin/guard.js` 常量时间守卫 + `/admin/[accessKey]` 中台壳与上传凭证自检 + `POST /admin/[accessKey]/api/upload-token` 接口；错误 Key 一律 404，页面 noindex/no-store）。
2. [x] 实现 Product 聚合编辑：Product 内维护 0-3 个 SKU，保存时单事务校验（C3：`lib/repositories/admin.js` 的 `saveProductAggregate` + `/admin/[accessKey]/products` 列表/新建/编辑页面与接口；含 `updated_at` 乐观锁、图片服务端复验、旧对象事务后清理、快速新建标签）。
3. [x] Banner 管理（C4：上限 5 张、中英桌面图必填、移动图可选、排序/启停/删除、前台即时生效）；网站设置（C6：Logo/微信号/微信二维码/中英联系说明，保存后前台全站生效，未配置时回退默认 Logo 与占位图）；标签管理页（C7：列表/新建/编辑/启用停用 + 绑定商品数统计 + 右侧抽屉查看绑定商品（含缩略图），停用后前台筛选隐藏但保留商品关系）。
4. [x] 建立 `lib/image-specs.js` 图片规范注册表（各上传区比例、最小尺寸、格式、大小上限，前后端共用），规范见 development-plan §11.6。
5. [x] 实现中台固定比例裁剪组件（自动居中裁切、可缩放/平移调整、用户确认后上传）与服务端图片校验（类型、大小、尺寸、比例容差 ±2px）；导出后超过大小上限时浏览器端自适应自动压缩（方案 A：Canvas 先降质量、后降分辨率，零依赖；低于最小尺寸仍直接拒绝）。
6. [x] 接入 OSS 上传凭证（签名直传地址，密钥不下发浏览器）、服务端校验与受限前缀删除接口（C2：`/admin/[accessKey]/uploads` 上传测试页可跑通"选图→裁剪→直传→校验→清理"全链路）；图片排序与孤儿对象检查随商品管理任务完成。
7. [x] 对中台表单增加中文必填、英文可选、发布前校验（启用 SKU 必须有列表缩略图和至少一张详情大图）。

> C3 说明：独立标签管理页（列表/编辑/启停）由 C7 完成；本地开发期前台读取 OSS 私有桶图片走 `/oss/` 代理（`app/oss/[...key]/route.js`），生产使用 CDN `ASSET_BASE_URL`。

完成标志：管理员能只用 accessKey 完成一次商品（含列表缩略图与详情大图）、标签、Banner 和联系设置的完整配置，并在前台看到结果；所有上传图片均通过规范裁剪确认与服务端校验。

## 阶段 D：部署与运维

1. 按 [deployment-guide.md](./deployment-guide.md) 建立 ECS、持久化盘、OSS/CDN、Nginx 和 HTTPS。
2. 配置环境变量和 systemd，执行 migration、种子数据和健康检查。
3. 建立每日 SQLite/OSS 备份、日志和磁盘告警。
4. 做一次回滚和备份恢复演练。

完成标志：新机器可按文档部署，重启不丢数据，备份可以恢复首页、商品和站点设置。

## 阶段 E：上线验收

- 功能：中英文页面、精确/包含搜索、标签筛选、排序分页、SKU 切换和联系弹窗。
- 内容：中文必填规则、英文回退、Banner 两种语言图片、Logo/二维码替换。
- 图片规范：所有上传区按固定比例裁剪并确认后入库；列表缩略图 1:1、详情大图 4:5、Banner 1.72:1/1.2:1、Logo 与二维码 1:1；源图小于最小尺寸被拒绝。
- 性能：移动端首屏图片不造成明显布局跳动；图片经过 OSS/CDN 尺寸与格式优化。
- 安全：错误 accessKey 返回 404；密钥不进前端；上传类型、大小、尺寸和比例受限；公开接口不泄露草稿。
- 运维：HTTPS、健康检查、备份、恢复和回滚记录齐全。
