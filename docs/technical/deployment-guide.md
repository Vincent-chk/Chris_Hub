# 部署指南

一期推荐使用阿里云海外地域的一台 ECS，挂载持久化数据盘，Node.js 进程运行 Next.js；图片放阿里云 OSS，并通过 CDN 域名提供访问。月 PV 约 1,000、商品 500 个以内时不需要 RDS、Redis、搜索服务或负载均衡。

## 1. 环境变量

生产环境至少配置：

```dotenv
NODE_ENV=production
DATABASE_PATH=/var/lib/chris-hub/chris-hub.sqlite
ADMIN_ENTRY_KEY=<随机的 URL-safe accessKey>
ASSET_BASE_URL=https://assets.example.com
OSS_REGION=<海外地域短名，如 ap-southeast-1 / cn-hongkong>
OSS_BUCKET=<bucket>
OSS_ROLE_ARN=acs:ram::<账号ID>:role/chris-hub-oss-uploader
OSS_ACCESS_KEY_ID=<服务端长期密钥，仅用于签发临时凭证/校验/备份>
OSS_ACCESS_KEY_SECRET=<服务端长期密钥>
```

密钥模型（与阶段 C 实现一致）：

- 浏览器直传只拿 STS 临时凭证（服务端用长期 AK 调用 AssumeRole 签发，限定到单个 objectKey 的 PutObject，有效期 15 分钟），长期密钥不下发浏览器。
- 服务端校验、孤儿对象清理和数据库备份使用服务端长期 AK，权限只覆盖生产 Bucket 的 Get/Put/Delete/List/Head。
- `ADMIN_ENTRY_KEY` 和所有 OSS 密钥只存在 ECS 环境变量或密钥管理服务，不写入 Git、浏览器 bundle 或数据库。前台只接受公开的 `ASSET_BASE_URL`。

## 2. ECS 初始化

1. 创建海外地域 ECS，安装 Node.js LTS、pnpm、Nginx 和 systemd。
2. 创建专用用户与目录：`/srv/chris-hub`、`/var/lib/chris-hub`、`/var/log/chris-hub`；应用用户对数据目录具有读写权限。
3. 拉取代码，执行 `pnpm install --frozen-lockfile` 和 `pnpm build`。
4. 执行 Drizzle migration，确认 `DATABASE_PATH` 指向持久化盘。
5. 用 systemd 启动 `pnpm start`（默认 3000 端口），Nginx 反向代理到本机 3000。
6. 仅开放 80/443；管理入口不依赖端口隐藏，仍由服务端校验 `/admin/[accessKey]`。

systemd 最小示例：

```ini
[Service]
WorkingDirectory=/srv/chris-hub
ExecStart=/usr/bin/pnpm start
Restart=always
EnvironmentFile=/etc/chris-hub/app.env
User=chris-hub
```

## 3. OSS、CDN、DNS 与 HTTPS

- OSS 前缀以代码为准：`sku/`（列表缩略图与详情大图）、`banner/`、`site/`（Logo 与二维码）；备份脚本使用 `backups/` 前缀。限制图片 MIME 和单文件大小，上传后服务端再次校验类型、大小、尺寸与比例。
- OSS Bucket 默认私有；由 CDN/应用生成公开读取 URL，不把服务端密钥下发浏览器。
- 绑定 `assets.example.com` 到 CDN，站点域名绑定到 ECS 公网 IP。
- 使用阿里云 CDN/证书或 Let's Encrypt 配置 HTTPS，Nginx 将 HTTP 重定向 HTTPS。
- 上传完成后数据库只保存对象 Key；更换域名只需调整 `ASSET_BASE_URL`。

## 4. 发布与回滚

发布顺序：备份 SQLite -> 上传新代码 -> `pnpm install --frozen-lockfile` -> `pnpm build` -> 执行 migration -> 重启 systemd -> 健康检查 `/cn`、`/cn/products` 和一个详情页。构建失败不得执行 migration。

回滚时恢复上一个代码版本；数据库 migration 必须保持向前兼容。不可逆 migration 先在备份副本验证，再安排维护窗口。

## 5. 备份与恢复

- 每日使用 SQLite Online Backup 或停写窗口复制 `/var/lib/chris-hub/chris-hub.sqlite` 到 OSS 备份前缀。
- 同时保留最近 7 天和每周 4 个版本；备份对象启用服务端加密和最小读取权限。
- 每月至少演练一次恢复：复制备份到临时路径，运行 migration/完整性检查，再切换 `DATABASE_PATH` 并重启。
- OSS 图片使用版本或回收站策略，避免数据库已回滚但图片已永久删除。

## 6. 监控与升级信号

记录应用错误、响应耗时、SQLite busy/locked、OSS 上传失败和磁盘使用率。磁盘达到 70% 预警，SQLite 写入出现持续锁等待、需要多进程写入，或月 PV/并发明显增长时，再评估 PostgreSQL/RDS 与独立对象处理服务。
