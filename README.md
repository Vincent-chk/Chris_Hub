# Chris Hub（克里斯卡社）

中英文卡牌商品展示独立站：前台展示 + 单管理员内容中台，用户通过微信联系购买，不包含在线交易。

## 技术栈

- Next.js（App Router，Node runtime）
- SQLite + Drizzle ORM
- 阿里云 OSS + CDN（图片存储与加速）
- 中台访问控制：路径中的 `accessKey`（一期无账号体系）

## 文档

所有产品与技术文档索引见 [docs/README.md](./docs/README.md)，重点入口：

- [一期开发规划](./docs/development-plan.md)
- [可执行实施方案](./docs/technical/execution-plan.md)
- [部署指南](./docs/technical/deployment-guide.md)
- [部署与运维 · 新手操作手册](./docs/technical/deployment-operations-guide.md)
- [云部署分阶段验收方案](./docs/technical/deployment-acceptance-plan.md)

## 本地开发

要求 Node.js 22、pnpm 11。

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local   # 本地用 SQLite 路径等环境变量
pnpm dev                     # 启动开发服务器
```

## 测试与构建

```bash
pnpm test    # node --test，单元 + 集成测试
pnpm build   # 生产构建
```

## 部署

上线流程（ECS + OSS/CDN + 域名 + HTTPS + 备份）见 [deployment-operations-guide.md](./docs/technical/deployment-operations-guide.md)，验收按 [deployment-acceptance-plan.md](./docs/technical/deployment-acceptance-plan.md) 分阶段执行。
