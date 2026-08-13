# Chris Hub 云部署分阶段验收方案（阶段 D + E）

本文把 [deployment-guide.md](./deployment-guide.md) 和 [deployment-operations-guide.md](./deployment-operations-guide.md) 拆成 5 个阶段，每个阶段给出可勾选、可计数的验收门槛，用来判断“这一步算不算真的完成了”。执行人分两类：**你（项目方，操作阿里云控制台）** 和 **开发者（我，准备代码/密钥/答疑）**。

## 0. 前置核验结论（2026-08-13）

对照 [execution-plan.md](./execution-plan.md) 核验本地代码：

- 阶段 A（原型）、阶段 B（真实数据读取）已在 `main`。
- 阶段 C（中台 + OSS 直传）已在 `codex/oss-test` 分支完成，包含 CI 测试与构建；OSS 链路已在你的阿里云账号用新加坡桶实测 7/7 通过。
- 阶段 D（部署运维）和阶段 E（上线验收）尚未开始，即本文范围。
- 发现并已修正两处文档与代码不一致：生产环境变量缺少 `OSS_ROLE_ARN`；OSS 前缀文档写 `products/`、`banners/`，代码实际为 `sku/`、`banner/`、`site/`。部署必须按修正后的文档执行。

部署前必须完成的两件事：

1. 把阶段 C 代码合入 `main`：GitHub 上开 PR `codex/oss-test → main`，CI（test + build）全绿后合并；再把 `codex/Stage_D → main` 的文档 PR 合并；最后在 `main` 打 tag `v1.0.0`。
2. 补齐 [development-plan.md §16](../development-plan.md#16-上线前由项目方提供) 的上线素材清单（见阶段 0 关卡）。

## 1. 五阶段总览

| 阶段 | 内容 | 主要执行人 | 一票否决的量化关卡（不满足就不进下一阶段） |
| --- | --- | --- | --- |
| 0 发布就绪 | 代码合入 main、打 tag、素材与密钥就位 | 开发者为主 | main 含阶段 C 代码、CI 绿、tag 存在、素材 10/10 齐 |
| 1 云资源 | 买 ECS、域名解析、建生产 OSS、RAM 用户与角色、CDN+HTTPS | 你（阿里云控制台） | SSH 能登录；`assets` 域名测试图 200；安全组仅 22/80/443 |
| 2 服务器部署 | 挂数据盘、装环境、部署代码、systemd、Nginx、HTTPS | 你（SSH 命令，我逐条陪跑） | 三个页面 200；HTTP 跳 HTTPS；重启后自动恢复；错误 accessKey 404 |
| 3 备份与告警 | 每日备份、磁盘告警、恢复与回滚演练 | 你为主，我核对脚本 | OSS 有备份文件且完整性 ok；恢复演练实测通过 |
| 4 内容与功能上线 | 中台录入真实内容、前台核对、移动端与安全验收 | 你（中台录入）+ 我（验收） | development-plan §17.3 的 14 条核心场景全过 |

## 2. 阶段 0：发布就绪

### 2.1 步骤

1. 合并代码（两条 PR，顺序随意，内容互不冲突）：
   - PR #1：`codex/oss-test → main`（阶段 C 代码）。
   - PR #2：`codex/Stage_D → main`（本部署手册与验收方案）。
2. 在 `main` 最新提交上打 tag：`git tag v1.0.0 && git push origin v1.0.0`。
3. 对照 §16 素材清单逐项收集，缺项不能跳过。
4. 生产 `ADMIN_ENTRY_KEY` 在阶段 2 部署时于服务器生成（`openssl rand -base64 32`），不提前在聊天或文档里传播。

### 2.2 量化验收（全部勾选才算通过）

- [ ] `main` 上同时存在阶段 C 代码与部署文档（`app/admin/`、`lib/oss/`、`docs/technical/deployment-acceptance-plan.md` 均存在）。
- [ ] GitHub Actions CI 对两次合并均为绿色（test + build）。
- [ ] `git tag -l` 能看到 `v1.0.0`。
- [ ] 素材清单 10/10：中英文品牌介绍文案、中英文联系说明、微信号、微信二维码、中英文 Banner 图、首批商品（含 SKU/标签/图片）、正式域名、阿里云账号与云资源授权、生产 accessKey 交付方式确认。
- [ ] 生产密钥不进入 Git：`git grep` 无 AccessKey Secret / accessKey 明文。

## 3. 阶段 1：云资源（阿里云控制台操作）

操作步骤见 [deployment-operations-guide.md](./deployment-operations-guide.md) 第 1–4 节。资源清单：

| 资源 | 要求 |
| --- | --- |
| ECS | 海外地域（推荐新加坡，与已验证 OSS 同地域）；2 vCPU / 4 GB；Ubuntu 22.04 LTS；系统盘 40 GB + 数据盘 40 GB ESSD；固定公网 IP、固定带宽 5 Mbps；密钥对登录 |
| 安全组 | 入方向仅放行 22、80、443 |
| 域名 | 已购并完成实名；`@` 与 `www` 两条 A 记录指向 ECS 公网 IP |
| 生产 OSS | 私有 Bucket + 版本控制，地域新加坡 `ap-southeast-1`，前缀 `sku/`、`banner/`、`site/` |
| RAM | 用户 `chris-hub-server`（策略仅限生产桶的 Get/Put/Delete/List/Head + `AliyunSTSAssumeRoleAccess`）；角色 `chris-hub-oss-uploader`（仅 `oss:PutObject` 于生产桶，信任主体为上述用户） |
| CDN | 加速域名 `assets.example.com`，源站为私有 OSS 桶并开启“OSS 私有 Bucket 回源”授权，业务类型图片小文件，服务区域海外（不含中国大陆） |
| 证书 | `assets.example.com` 与主域名均配置 HTTPS |

### 3.1 量化验收（全部勾选）

- [ ] SSH 一次性登录成功（`ssh root@<公网IP>`），`lsblk` 显示系统盘 `vda` 和数据盘 `vdb` 两块盘。
- [ ] 安全组入方向规则恰好 3 条（22/80/443），截图留档。
- [ ] `dig +short example.com` 与 `www.example.com` 均返回 ECS 公网 IP。
- [ ] `ossutil ls oss://chris-hub-assets/` 能列出 `sku/`、`banner/`、`site/` 三个前缀。
- [ ] 测试图经 CDN 访问 `https://assets.example.com/<测试图路径>` 返回 200；直接访问 OSS 默认域名返回 403（证明桶私有）。
- [ ] RAM 用户与角色策略为最小权限（无 `oss:*` 通配、无 `AliyunOSSFullAccess`）。
- [ ] 记下并留存：ECS 公网 IP、密钥对 `.pem`、生产桶名、角色 ARN、RAM AccessKey 两件套、CDN CNAME 与证书到期日。

## 4. 阶段 2：服务器部署

操作步骤见 [deployment-operations-guide.md](./deployment-operations-guide.md) 第 5 节。顺序：挂载数据盘并写 fstab → 装 Node 22/pnpm 11/nginx → 部署密钥拉代码（tag `v1.0.0`）→ 安装依赖并构建 → 写 `app.env`（含 `OSS_ROLE_ARN`）→ 执行 3 个 Drizzle migration →（可选）首启种子数据 → systemd → Nginx → Let's Encrypt HTTPS。

### 4.1 量化验收（全部勾选）

- [ ] `df -h /var/lib/chris-hub` 显示数据盘挂载生效；`/etc/fstab` 包含该盘 UUID（重启后仍挂载）。
- [ ] `pnpm build` 成功，`systemctl is-active chris-hub` = `active`、`is-enabled` = `enabled`。
- [ ] 三个健康检查均 200：`/cn`、`/cn/products`、一个商品详情页（种子数据为 `/cn/products/product-01`）。
- [ ] HTTP 访问返回 301 并跳转 HTTPS；证书有效期 ≥ 60 天。
- [ ] **重启演练**：重启 ECS 后 5 分钟内网站自动恢复且 200，SQLite 数据不丢。
- [ ] 正确 accessKey 可进中台；随机错误 Key（测 3 个）返回 404。
- [ ] 数据库文件位于 `/var/lib/chris-hub/chris-hub.sqlite`（不在系统盘）。
- [ ] 中台可打开“上传测试”页并完成一次“选图 → 裁剪 → 直传 → 校验 → 清理”全链路（证明 `OSS_ROLE_ARN` 配置正确）。

## 5. 阶段 3：备份与告警

操作步骤见 [deployment-operations-guide.md](./deployment-operations-guide.md) 第 6–7 节。

### 5.1 量化验收（全部勾选）

- [ ] `backup.sh` 手动执行成功，OSS `backups/daily/` 新增 1 份，`PRAGMA integrity_check` 输出 `ok`。
- [ ] cron（每日 03:00）连续 2 天自动执行成功，日志有对应 2 条记录。
- [ ] **恢复演练**：从 OSS 下载备份 → 临时端口 3999 启动 → `/cn`、`/cn/products` 返回 200 → 关停并清理；记录实测 RTO ≤ 30 分钟。
- [ ] **回滚演练**：切到旧 tag 或旧 commit → 构建 → 重启 → 健康检查 200。
- [ ] 云监控磁盘使用率 70% 报警规则已配置，并手动触发收到 1 条测试告警。
- [ ] 中台“开发者运维”页孤儿对象检测 dry-run 正常（结果为只读扫描，不误删）。
- [ ] 备份保留策略生效：daily 最多 7 份、weekly 最多 4 份。

## 6. 阶段 4：内容与功能上线验收（阶段 E）

此阶段才允许“正式宣布上线”。按 [development-plan.md §17](../development-plan.md#17-一期完成定义) 执行。

### 6.1 步骤

1. 用 accessKey 进入中台，录入首批真实内容：至少 1 个完整商品（2 个 SKU、每个 SKU 列表缩略图 + 多张详情大图）、1 个标签、2 张 Banner（中英文）、Logo、微信二维码、中英文联系说明。
2. 前台逐项核对，再按 §17.3 的 14 条核心验收场景走一遍。
3. 视口检查 4 档：1440×900、1024×768、390×844、360×800，截图留档。
4. 安全与性能抽查，然后签署上线验收表。

### 6.2 量化验收（全部勾选）

- [ ] 核心验收场景 14/14 通过（见 development-plan §17.3，逐条勾选）。
- [ ] 上传链路闭环：中台上传的每类图（缩略图/大图/Banner/Logo/二维码各 ≥ 1）在 OSS 中对象存在、数据库引用一致、经 CDN 访问 200。
- [ ] 图片规范抽查 3 张：尺寸、比例、格式、大小全部符合 `lib/image-specs.js`（比例容差 ±2px）。
- [ ] 安全：随机错误 accessKey（3 个）404；草稿商品直接访问 404；`git grep` 与前台上线资源中无 `ADMIN_ENTRY_KEY`、AccessKey Secret。
- [ ] 视口 4 档均无横向滚动、无内容与固定按钮重叠。
- [ ] 性能基线（移动 4G 模拟）：首屏 LCP < 2.5s、TTFB < 1s；页面图片引用 100% 走 `assets.example.com`（无本地 `/products/*.svg` 残留引用）。
- [ ] 英文缺省回退抽查 1 个商品（英文页显示中文兜底）。
- [ ] 运维记录齐全：HTTPS、健康检查、备份、恢复、回滚的日期与结果均已留档。

## 7. 验收签字表

| 阶段 | 执行人 | 执行日期 | 验收人 | 结果 | 证据 |
| --- | --- | --- | --- | --- | --- |
| 0 发布就绪 | 开发者 | | 项目方 | | CI 链接 / tag 截图 |
| 1 云资源 | 项目方 | | 开发者 | | 控制台截图 / dig 输出 |
| 2 服务器部署 | 项目方 | | 开发者 | | curl 输出 / systemctl 输出 |
| 3 备份与告警 | 项目方 | | 开发者 | | 演练记录 |
| 4 内容与功能 | 项目方 | | 开发者 | | 14 条场景记录 / 截图 |

全部 5 行签字完成后，一期才正式“上线完成”。

## 8. 回退与风险预案

- **上线回退**：代码回退 = 切回上一个 tag 或 commit 重新构建；数据回退 = 用阶段 3 的每日备份恢复。发布顺序固定为“先备份数据库，再更新代码，迁移失败不重启”。
- **证书到期**：主域名用 Let's Encrypt 自动续期；`assets` 域名用阿里云免费证书（90 天），到期前 7 天手动重新申请部署，建议设手机日历提醒。
- **磁盘写满**：70% 告警触发后扩容数据盘或清理日志，避免 SQLite 写满停机。
- **密钥泄露**：立即在 RAM 控制台禁用/轮换泄露的 AccessKey；accessKey 泄露则修改环境变量并重启。
- **图片误删**：Bucket 已开版本控制，误删可恢复；孤儿对象清理默认 dry-run，人工确认后才删除。
