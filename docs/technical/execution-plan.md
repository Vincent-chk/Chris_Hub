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

1. 实现服务端 `accessKey` 路径校验和中台基础壳，不建立账号密码。
2. 实现 Product 聚合编辑：Product 内维护 0-3 个 SKU，保存时单事务校验。
3. 实现标签、Banner、Logo、联系设置管理。
4. 接入 OSS 上传凭证、图片排序、删除和孤儿对象检查。
5. 对中台表单增加中文必填、英文可选、发布前校验。

完成标志：管理员能只用 accessKey 完成一次商品、标签、Banner 和联系设置的完整配置，并在前台看到结果。

## 阶段 D：部署与运维

1. 按 [deployment-guide.md](./deployment-guide.md) 建立 ECS、持久化盘、OSS/CDN、Nginx 和 HTTPS。
2. 配置环境变量和 systemd，执行 migration、种子数据和健康检查。
3. 建立每日 SQLite/OSS 备份、日志和磁盘告警。
4. 做一次回滚和备份恢复演练。

完成标志：新机器可按文档部署，重启不丢数据，备份可以恢复首页、商品和站点设置。

## 阶段 E：上线验收

- 功能：中英文页面、精确/包含搜索、标签筛选、排序分页、SKU 切换和联系弹窗。
- 内容：中文必填规则、英文回退、Banner 两种语言图片、Logo/二维码替换。
- 性能：移动端首屏图片不造成明显布局跳动；图片经过 OSS/CDN 尺寸与格式优化。
- 安全：错误 accessKey 返回 404；密钥不进前端；上传类型和大小受限；公开接口不泄露草稿。
- 运维：HTTPS、健康检查、备份、恢复和回滚记录齐全。
