# OSS 测试规划与验收记录

## 1. 背景与结论

项目进入阶段 C（中台 + OSS 上传）前的并行准备：验证阿里云 OSS 的账号、区域、密钥与 SDK 链路。

环境约束：项目方为大陆地区用户，使用阿里云**国内站**账号，OSS 使用**新加坡（ap-southeast-1）**海外节点。海外节点无需 ICP 备案。

结论：**当前量级下 OSS 仅用于静态图片存储与 CDN 回源，测试成本可忽略（按量付费，预计 < ¥0.1）。**

## 2. 已确认资源

| 项目 | 值 |
| --- | --- |
| 测试桶名 | `chris-hub-oss-test` |
| 地域 | 新加坡（ap-southeast-1） |
| Endpoint | `oss-ap-southeast-1.aliyuncs.com` |
| 访问身份 | RAM 子账号（最小权限策略，仅限测试桶） |
| 凭据存放 | `.env.local`（已被 `.gitignore` 排除，不提交） |

## 3. 阶段与验收

### 阶段 0：账号前置（已完成）

- 实名认证、开通 OSS、确认账户可用。
- 验收：控制台可进入 Bucket 列表，地域可切换至新加坡。

### 阶段 1：测试桶（已完成）

- 创建私有桶 `chris-hub-oss-test`（新加坡），建 `test/` 前缀。
- 验收：未签名访问不存在对象返回 403（桶为私有）。

### 阶段 2：RAM 子账号 + 最小权限（已完成）

- 创建子账号 `chris-hub-oss-test`，绑定仅覆盖测试桶的权限策略（Put/Get/Delete/List/Head）。
- 验收：用该 AK 调用桶外操作被拒绝（最小权限生效）。

### 阶段 3：SDK 连通性测试（已完成）

- 安装官方 SDK：`pnpm add ali-oss`（已加入依赖）。
- 运行脚本：`pnpm smoke:oss`（即 `node --env-file=.env.local scripts/oss-smoke.mjs`）。
- 脚本验证项与验收指标：

| # | 验证项 | 量化验收 |
| --- | --- | --- |
| 1 | 上传 put | ✅ 200 |
| 2 | 元信息 getObjectMeta | ✅ 200，content-length 与上传内容一致 |
| 3 | 下载 get | ✅ 与上传内容逐字节一致 |
| 4 | 签名 URL | ✅ 200 且内容一致 |
| 5 | 未签名 URL | ✅ 403（证明桶私有） |
| 6 | 删除 delete | ✅ 204 |
| 7 | 列表 list | ✅ `test/` 前缀下无残留对象 |

- 耗时记录为性能基线（国内访问新加坡节点预期 100–400ms），供阶段 D 配置 CDN 后对比。
- 实测记录（2026-08-10，国内网络 → 新加坡节点）：上传 708ms / 元信息 145ms / 下载 126ms / 签名 URL 560ms / 未签名 437ms / 删除 133ms / 列表 110ms。
- 过程问题记录：① `head()` 在无 `x-oss-meta-*` 头时 `meta` 为 null，改用 `getObjectMeta`；② RAM 策略最初缺 `oss:ListObjects` 或桶级 Resource（不带 `/*`），补齐后列表通过。**结论：OSS 链路全部验证通过（7/7）。**

### 阶段 4：安全与成本收尾

- `git grep` 确认无密钥入库；`.env.local` 不出现于 `git status`。
- 桶权限保持私有；测试后无残留对象。
- 费用核对：测试期账单预计 < ¥1。
- **凭据轮换建议**：测试结束后轮换该 RAM 子账号 AccessKey（密钥已在对话中传输过，按最小权限已控制风险，但轮换更稳妥）。

## 4. 与阶段 C 的衔接

- 阶段 C 上传实现使用"服务端生成 STS 临时凭证 → 浏览器直传"（见 `data-access-contract.md` §3），长期密钥只放服务器，不下发浏览器。
- 对象 Key 前缀在阶段 C 定稿（`database-architecture.md` 与 `deployment-guide.md` 当前前缀描述不一致，需统一）。
- 生产桶与测试桶隔离；生产图片域名走 CDN（`ASSET_BASE_URL`）。
