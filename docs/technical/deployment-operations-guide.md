# Chris Hub 阶段 D：部署与运维 · 新手操作手册

> 本文是 [deployment-guide.md](./deployment-guide.md) 的逐步操作版，面向没有云服务器经验的人。
> 全程假设你使用**阿里云中国站（aliyun.com）**、一台**海外地域 ECS**、域名用阿里云云解析。
> 控制台的菜单名称可能随版本微调，以你屏幕上实际看到的为准。

## 0. 先理解要买什么、为什么

你的项目是 Chris Hub：一个 Next.js 网站 + SQLite 数据库。上线后需要四样东西：

| 东西 | 它是什么 | 用来做什么 |
| --- | --- | --- |
| ECS | 一台长期开机的云服务器（相当于一台电脑） | 跑 Next.js 网站、存放 SQLite 数据库 |
| OSS | 阿里云的对象存储（网盘/文件仓库） | 存放商品图、Banner、Logo 等图片文件 |
| CDN | 内容分发网络（全球缓存加速） | 让全世界用户快速加载图片 |
| 域名 + HTTPS | 网站的网址和加密 | 用户通过 `example.com` 访问，图片走 `assets.example.com` |

整体关系：

```text
用户浏览器
   │
   ├── https://example.com ──────────► ECS（Nginx → Next.js :3000 → SQLite 数据盘）
   │
   └── https://assets.example.com ───► CDN ──► OSS（私有 Bucket，存图片）
```

注意事项：

- 服务器和 CDN 都选**海外节点**（如香港），**不需要 ICP 备案**。不要勾选大陆节点。
- OSS Bucket 必须是**私有**的。用户访问图片时走 CDN，CDN 有“回源鉴权”可以从私有桶取文件，但别人无法直接翻你的桶。
- ECS、OSS、CDN、域名可以**同一天分批买**：先买域名和 ECS（机器创建要几分钟），再建 OSS，再配 CDN。

## 0.1 准备清单

- 阿里云账号（已实名认证），支付宝或信用卡余额充足。
- 一个域名，例如 `example.com`（没买的话在第 2 步买）。
- GitHub 账号（项目仓库是 `Vincent-chk/Chris_Hub`，用于把代码传到服务器）。
- 一台电脑（本手册的 SSH 命令在 Mac 的“终端”App 里敲）。
- 预算：起步阶段每月大概几十到两三百元（ECS 是大头），以购买页实时价格为准。

---

## 1. 购买海外 ECS

### 1.1 打开购买页

登录 [阿里云控制台](https://www.aliyun.com/)，搜索“云服务器 ECS”，进入 ECS 控制台，点击**创建实例**（或“立即购买”）。

### 1.2 地域：选新加坡（推荐）或香港

在“地域”下拉框里选择海外地域：

- **新加坡**：你已经在阿里云国内站把 OSS 测试链路验证在新加坡（`ap-southeast-1`，7/7 通过）。ECS 与 OSS 同地域，服务器直连 OSS 校验图片最快，**推荐首选**。
- **香港**：中国用户和亚洲用户访问都快；ECS 在香港、OSS 在新加坡也可以正常工作，仅服务器直连 OSS 略多几毫秒。
- 日本（东京）：日本用户为主时选它。
- 美国（硅谷）：欧美用户为主时选它。

你目前是中英双语站、主要联系方式是微信，推测目标用户在中港台及海外华人圈。考虑到 OSS 已在新加坡验证，ECS 首选新加坡、其次香港。

> 只要不选“华东/华北/华南”等大陆地域，就不需要备案。

### 1.3 实例规格：2 vCPU 4 GB 起步

选择**计算型/通用型**，2 vCPU、4 GB 内存即可。月 PV 约 1,000、商品 500 个以内，这个配置足够，以后不够再升级。

### 1.4 镜像（操作系统）：Ubuntu 22.04 LTS 64 位

选 Ubuntu 22.04 LTS。本文所有命令都按它写。

### 1.5 存储：系统盘 40 GB + 一块 40 GB 数据盘

- 系统盘：40 GB ESSD，装系统用。
- **再买一块 40 GB 数据盘（ESSD 云盘）**：SQLite 数据库文件专门放这里。这样即使系统盘出问题，数据也不丢。这是“重启不丢数据”的关键。

### 1.6 网络：固定公网 IP + 按固定带宽 5 Mbps

- 公网 IP 选“分配公网 IPv4 地址”。
- 带宽计费方式选**按固定带宽，5 Mbps**。预算清楚，不怕流量账单失控；对 1,000 月 PV 完全够。

### 1.7 安全组：只放行 22、80、443

安全组就是服务器的防火墙。创建安全组后，入方向只允许：

| 端口 | 用途 |
| --- | --- |
| 22 | SSH 远程登录 |
| 80 | HTTP（会自动跳转 HTTPS） |
| 443 | HTTPS 访问网站 |

其他端口全部不放行。

### 1.8 登录凭证

建议选**密钥对**：登录时不需要输密码，更安全。

- 不会创建密钥对的话，先选“创建新密钥对”，把下载下来的 `.pem` 文件保存好（只下载一次，丢失无法找回）。
- 也可以选“自定义密码”并设置强密码，先用着。

### 1.9 下单

选择包年包月或按量付费（新手建议包年包月，价格确定、不会忘关造成浪费）。确认配置后付款，等待创建完成。

创建完成后，在 ECS 控制台记下**公网 IP**（形如 `47.xx.xx.xx`）。

### 1.10 备选：轻量应用服务器

阿里云还有“轻量应用服务器”，海外地域更便宜、自带简单管理面板。但现有部署文档按 ECS 写，本手册也按 ECS 写，所以**优先买 ECS**。预算非常紧张时再考虑轻量服务器。

---

## 2. 域名与 DNS

### 2.1 买域名

没有域名的话，在阿里云搜索“域名注册”，买一个 `.com` 域名（例如 `chrishub.example`），完成实名认证。

已有域名的话，把 DNS 解析迁到阿里云“云解析 DNS”（控制台搜索“云解析”）。

### 2.2 添加解析记录

打开“云解析 DNS → 解析设置”，添加三条记录（第 4 步配置 CDN 后再补 assets 那条）：

| 记录类型 | 主机记录 | 记录值 | 说明 |
| --- | --- | --- | --- |
| A | `@` | 你的 ECS 公网 IP | 让 `example.com` 指向服务器 |
| A | `www` | 你的 ECS 公网 IP | 让 `www.example.com` 也指向服务器 |
| CNAME | `assets` | （第 4 步 CDN 给的值） | 图片域名，稍后添加 |

TTL 默认即可。解析生效通常几分钟。

---

## 3. 建生产 OSS

### 3.1 创建 Bucket

阿里云控制台搜索“对象存储 OSS”，进入后点**创建 Bucket**：

- Bucket 名称：`chris-hub-assets`（全局唯一，创建后不能改，名字自己取，建议含项目名）。
- 地域：**和 ECS 同地域**，沿用你已验证的新加坡 `ap-southeast-1`。
- 读写权限：**私有**（Private，关键！）。
- 版本控制：建议开启（防止误删图片后无法找回）。

### 3.2 建目录前缀

创建完成后进入 Bucket，建三个“目录”（OSS 里叫前缀）：

- `sku/`：商品列表缩略图和详情大图（与代码 `lib/oss/sts.js` 生成的对象 Key 一致）
- `banner/`：Banner 图
- `site/`：Logo、二维码等站点图片
- `backups/`：数据库备份（第 6.2 步的备份脚本会自动创建，不用手建）

### 3.3 创建 RAM 用户、角色和 AccessKey

现在的上传链路是“服务端签发 STS 临时凭证 → 浏览器直传”，所以需要**一个 RAM 用户 + 一个 RAM 角色**两样东西：

- **RAM 用户 `chris-hub-server`**：长期 AccessKey 只放在服务器上，用于签发临时凭证、服务端校验图片、清理孤儿对象和做备份。
- **RAM 角色 `chris-hub-oss-uploader`**：上传能力的中转站。服务器用 RAM 用户调用 AssumeRole 拿到临时凭证，再交给浏览器直传；临时凭证 15 分钟过期，而且被进一步限制为“只能上传一个指定文件”。

AccessKey 是程序访问阿里云的“账号密码”，**只给服务器用，绝不放进代码仓库或网页**。

#### 3.3.1 创建 RAM 用户

1. 阿里云控制台搜索“RAM 访问控制”，进入“身份管理 → 用户”，点**创建用户**。
2. 登录名称：`chris-hub-server`；访问方式勾选**OpenAPI 调用访问**。
3. 创建后页面会显示 **AccessKey ID** 和 **AccessKey Secret**。Secret 只显示这一次，立刻复制保存到密码管理器（或写进手机备忘录）。
4. 给这个用户授权（“用户 → chris-hub-server → 权限管理 → 添加权限”）：

- 添加系统策略 **AliyunSTSAssumeRoleAccess**（允许它调用 STS 的 AssumeRole 接口签发临时凭证）。
- 再添加一个**自定义策略**（把 `chris-hub-assets` 换成你的生产桶名）：

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:GetObject",
        "oss:PutObject",
        "oss:DeleteObject",
        "oss:ListObjects",
        "oss:HeadObject"
      ],
      "Resource": [
        "acs:oss:*:*:chris-hub-assets",
        "acs:oss:*:*:chris-hub-assets/*"
      ]
    }
  ]
}
```

这份自定义策略只覆盖生产桶，不包含 `oss:*` 通配，也不使用 `AliyunOSSFullAccess`。

#### 3.3.2 创建 RAM 角色

1. 在 RAM 控制台进入“身份管理 → 角色”，点**创建角色**，角色类型选 **RAM 角色**。
2. 角色名称：`chris-hub-oss-uploader`。
3. 信任策略（“选择信任的云账号”里选“当前阿里云账号”，再把主体改细为上面创建的 RAM 用户，`<账号ID>` 换成你的阿里云账号数字 ID）：

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Principal": {
        "RAM": ["acs:ram::<账号ID>:user/chris-hub-server"]
      }
    }
  ]
}
```

4. 给角色添加权限策略（只给上传能力，会话策略会进一步把它限制到单个文件）：

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "oss:PutObject",
      "Resource": [
        "acs:oss:*:*:chris-hub-assets",
        "acs:oss:*:*:chris-hub-assets/*"
      ]
    }
  ]
}
```

5. 创建完成后，在角色详情页复制角色 ARN（形如 `acs:ram::<账号ID>:role/chris-hub-oss-uploader`），保存到密码管理器。这就是服务器环境变量 `OSS_ROLE_ARN` 的值。

> 如果你希望更省事，也可以复用测试期已经建好的 RAM 用户和角色，把生产桶加进它们的策略里。但测试密钥曾在对话中传输过，更稳妥的做法是生产单独建一套并轮换。

### 3.4 上传现有图片（验证用，可先跳过）

为了让 CDN 有东西可测，可以把仓库里现有的 SVG 图传上去。在你的**本地电脑**（不是服务器）装 [ossutil](https://help.aliyun.com/zh/oss/developer-reference/install-ossutil)，配置 AccessKey 后执行：

```bash
ossutil cp -r public/products/ oss://chris-hub-assets/sku/
ossutil cp -r public/banners/  oss://chris-hub-assets/banner/
ossutil ls oss://chris-hub-assets/sku/
```

能看到文件列表就说明 OSS 配置成功。

> 说明：这一步只是验证 CDN 链路能取到文件。前台种子数据仍走本地 SVG，正式商品图由中台上传接口直接写入 OSS，不需要手工搬运。

---

## 4. 配置 CDN

### 4.1 添加加速域名

阿里云控制台搜索“CDN”，进入“域名管理”，点**添加域名**：

- 加速域名：`assets.example.com`
- 业务类型：图片小文件
- 服务区域：选**全球（不含中国大陆）**或“海外及港澳台”——不要选大陆，避免备案问题
- 源站类型：**OSS 域名**，选中 `chris-hub-assets` 的默认域名

### 4.2 授权 CDN 访问私有 Bucket

添加后进入该域名的“回源配置”，找到**阿里云 OSS 私有 Bucket 回源**，点击**点击授权**并确认。

这一步让 CDN 可以用阿里云内部角色从你的私有桶取图，而用户依然只能通过 CDN 域名访问。

### 4.3 回填 CNAME

CDN 控制台会给你一个 CNAME 地址（形如 `assets.example.com.w.cdngslb.com`）。回到云解析 DNS，添加：

| 记录类型 | 主机记录 | 记录值 |
| --- | --- | --- |
| CNAME | `assets` | CDN 给的 CNAME 地址 |

### 4.4 HTTPS 证书

在 CDN 域名管理的“HTTPS 配置”里：

- 申请阿里云**免费证书**（数字证书管理服务，有效期 90 天，到期重新申请并部署），或
- 已有证书直接上传。

证书申请时用 DNS 验证方式，阿里云会自动在云解析里加一条验证记录。

### 4.5 验证

在浏览器打开（前提是第 3.4 步上传过至少一张图）：

```text
https://assets.example.com/sku/card-01.svg
```

能显示图片就成功了。

### 4.6 不用 CDN 行不行

也可以直接用 OSS 的默认域名访问图片，但你的桶是私有的，直接访问会 403，而且海外用户访问慢、没有缓存。所以按部署文档走 CDN。

---

## 5. 服务器初始化与部署

下面所有命令都在你的 **Mac 终端** 或 **服务器 SSH 里**执行。以 `#` 开头的行是注释，不要输入。

### 5.1 SSH 登录

```bash
ssh root@你的ECS公网IP
```

第一次登录会提示确认主机指纹，输入 `yes`。密钥对方式登录不需要密码；密码方式会提示输入。

### 5.2 挂载数据盘（重要！）

先看磁盘：

```bash
lsblk
```

你会看到类似 `vda`（系统盘）和 `vdb`（数据盘）。把数据盘格式化并挂载到数据库目录：

```bash
sudo mkfs.ext4 /dev/vdb
sudo mkdir -p /var/lib/chris-hub
sudo mount /dev/vdb /var/lib/chris-hub
sudo blkid /dev/vdb
```

最后一条命令会输出 `UUID="..."`，把 UUID 填进下面命令（改 `设备名` 换成你的 ECS 主机名，例如 `chris-hub`）：

```bash
echo 'UUID=上一步的UUID /var/lib/chris-hub ext4 defaults,noatime 0 2' | sudo tee -a /etc/fstab
sudo mount -a
```

`mount -a` 不报错，就说明重启后也会自动挂载。

### 5.3 安装运行环境

```bash
sudo apt-get update
sudo apt-get install -y git nginx sqlite3 build-essential python3
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pnpm@11
node -v   # 应显示 v22 开头的版本
pnpm -v   # 应显示 11 开头的版本（与仓库 CI 使用的 11.9.0 一致）
```

> 如果 `pnpm install` 时 better-sqlite3 编译报错，就说明缺 `build-essential` 或 `python3`，上面已安装。

### 5.4 创建专用用户和目录

应用不要用 root 跑，创建专用用户：

```bash
sudo useradd -m -s /bin/bash chris-hub
sudo mkdir -p /srv/chris-hub /var/log/chris-hub /etc/chris-hub
sudo chown -R chris-hub:chris-hub /srv/chris-hub /var/log/chris-hub
sudo chown chris-hub:chris-hub /var/lib/chris-hub
```

### 5.5 把代码传到服务器

仓库 `Vincent-chk/Chris_Hub` 是 GitHub 私有仓库，推荐用“部署密钥”方式，只读、安全：

```bash
sudo -u chris-hub ssh-keygen -t ed25519 -N "" -f /home/chris-hub/.ssh/id_ed25519
sudo cat /home/chris-hub/.ssh/id_ed25519.pub
```

复制输出的公钥，打开 GitHub 仓库 `Settings → Deploy keys → Add deploy key`，标题随意，勾不勾“Allow write access”都可以（只读就够）。

然后回到服务器：

```bash
sudo -u chris-hub git clone git@github.com:Vincent-chk/Chris_Hub.git /srv/chris-hub
cd /srv/chris-hub && sudo -u chris-hub git checkout v1.0.0
```

`v1.0.0` 是上线 tag（阶段 0 打的）；以后每次发布都先打新 tag，再在服务器上 checkout 对应 tag，出问题时可以精确回退。不想用 GitHub 的话，也可以在你本地把仓库打成压缩包，用 `scp` 传到服务器再解压，效果一样。

### 5.6 安装依赖并构建

```bash
cd /srv/chris-hub
sudo -u chris-hub pnpm install --frozen-lockfile
sudo -u chris-hub pnpm build
```

构建成功会显示 `✓ Compiled successfully`。

### 5.7 写生产环境变量

用编辑器创建文件（本手册用 nano）：

```bash
sudo nano /etc/chris-hub/app.env
```

内容如下（把尖括号里的内容替换掉）：

```dotenv
NODE_ENV=production
DATABASE_PATH=/var/lib/chris-hub/chris-hub.sqlite
ADMIN_ENTRY_KEY=<随机长字符串，见下>
ASSET_BASE_URL=https://assets.example.com
OSS_REGION=<OSS 所在地域短名，新加坡为 ap-southeast-1，香港为 cn-hongkong>
OSS_BUCKET=chris-hub-assets
OSS_ROLE_ARN=<第 3.3.2 步保存的角色 ARN>
OSS_ACCESS_KEY_ID=<第 3.3 步的 AccessKey ID>
OSS_ACCESS_KEY_SECRET=<第 3.3 步的 AccessKey Secret>
```

随机 accessKey 的生成命令（在终端跑，把输出填进 `ADMIN_ENTRY_KEY`）：

```bash
openssl rand -base64 32
```

保存后收紧权限：

```bash
sudo chown root:chris-hub /etc/chris-hub/app.env
sudo chmod 640 /etc/chris-hub/app.env
```

> `ADMIN_ENTRY_KEY` 和 OSS 密钥只放这里，绝不提交 Git、不进浏览器。

### 5.8 首次迁移和种子数据

```bash
sudo -u chris-hub bash -c 'set -a; . /etc/chris-hub/app.env; set +a; cd /srv/chris-hub; pnpm db:migrate'
sudo -u chris-hub bash -c 'set -a; . /etc/chris-hub/app.env; set +a; cd /srv/chris-hub; pnpm db:seed'
```

`db:seed` 会重建演示数据，**只在第一次部署时执行**，以后不要乱跑（会清空当前数据）。

### 5.9 用 systemd 托管服务

创建服务文件：

```bash
sudo nano /etc/systemd/system/chris-hub.service
```

内容：

```ini
[Unit]
Description=Chris Hub (Next.js)
After=network.target

[Service]
Type=simple
User=chris-hub
Group=chris-hub
WorkingDirectory=/srv/chris-hub
EnvironmentFile=/etc/chris-hub/app.env
ExecStart=/usr/local/bin/pnpm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

先确认 pnpm 的真实路径，不对就改：

```bash
which pnpm
```

启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now chris-hub
sudo systemctl status chris-hub
```

看到 `active (running)` 就成功了。看日志用：

```bash
sudo journalctl -u chris-hub -f
```

### 5.10 Nginx 反向代理

创建站点配置：

```bash
sudo nano /etc/nginx/sites-available/chris-hub
```

内容（替换域名）：

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 20m;
}
```

启用并测试：

```bash
sudo ln -s /etc/nginx/sites-available/chris-hub /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

现在用浏览器打开 `http://example.com/cn`（域名解析生效后）应该能看到网站。

### 5.11 HTTPS（Let's Encrypt，自动续期）

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

按提示输入邮箱并同意条款，选“重定向 HTTP 到 HTTPS”。certbot 会自动改 Nginx 配置并每 90 天自动续期（`systemctl list-timers | grep certbot` 可以看到）。

> 阿里云免费证书也可以，但有效期 90 天且要手动重新申请部署；Let's Encrypt 自动续期，省心。

### 5.12 健康检查

```bash
curl -sS -o /dev/null -w "首页 %{http_code}\n" https://example.com/cn
curl -sS -o /dev/null -w "列表 %{http_code}\n" https://example.com/cn/products
curl -sS -o /dev/null -w "详情 %{http_code}\n" https://example.com/cn/products/product-01
```

三个都返回 `200` 即部署成功。`product-01` 是种子数据的示例 ID；如果没有跑 `db:seed`，详情页检查改用中台创建的第一个商品 ID。

---

## 6. 备份、日志与告警

### 6.1 在服务器装 ossutil

按[官方安装文档](https://help.aliyun.com/zh/oss/developer-reference/install-ossutil)下载 Linux 版 ossutil 2.0，解压到 `/usr/local/bin/ossutil`，然后配置：

```bash
ossutil config
```

按提示填入 AccessKey ID、Secret、Region（例如 `ap-southeast-1` 新加坡）。验证：

```bash
ossutil ls oss://chris-hub-assets/
```

### 6.2 备份脚本

创建脚本文件：

```bash
sudo mkdir -p /srv/ops
sudo nano /srv/ops/backup.sh
```

内容：

```bash
#!/usr/bin/env bash
set -euo pipefail

DB=/var/lib/chris-hub/chris-hub.sqlite
BUCKET=oss://chris-hub-assets/backups
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

DAY=$(date +%F)
WEEK=$(date +%F)
IS_SUNDAY=$(date +%u)

# 先做完整性检查，再生成一致性备份
sqlite3 "$DB" "PRAGMA integrity_check;"
sqlite3 "$DB" ".backup '$TMPDIR/chris-hub.sqlite'"

# 每日备份
ossutil cp -f "$TMPDIR/chris-hub.sqlite" "$BUCKET/daily/chris-hub-$DAY.sqlite" >/dev/null

# 每周日额外存一份周备份
if [ "$IS_SUNDAY" = "7" ]; then
  ossutil cp -f "$TMPDIR/chris-hub.sqlite" "$BUCKET/weekly/chris-hub-$WEEK.sqlite" >/dev/null
fi

# 每日只保留最近 7 份
ossutil ls "$BUCKET/daily/" | awk 'NR>1 {print $NF}' | sort | head -n -7 \
  | xargs -r -I{} ossutil rm "{}" >/dev/null

# 每周只保留最近 4 份
ossutil ls "$BUCKET/weekly/" | awk 'NR>1 {print $NF}' | sort | head -n -4 \
  | xargs -r -I{} ossutil rm "{}" >/dev/null
```

设置定时执行（每天凌晨 3 点）：

```bash
sudo chmod +x /srv/ops/backup.sh
sudo crontab -e
```

在打开的编辑器里加一行：

```cron
0 3 * * * /srv/ops/backup.sh >> /var/log/chris-hub/backup.log 2>&1
```

先手动跑一次确认成功：

```bash
sudo /srv/ops/backup.sh
ossutil ls oss://chris-hub-assets/backups/daily/
```

### 6.3 查看日志

```bash
# 应用日志
sudo journalctl -u chris-hub -f

# Nginx 访问/错误日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 6.4 磁盘告警

阿里云控制台搜索“云监控”，进入“报警规则”：

1. 创建报警规则，关联 ECS 实例。
2. 指标选“磁盘使用率”，阈值 70%，持续 1 分钟报警。
3. 通知方式选短信/邮件。

磁盘到 70% 就扩容数据盘或清理日志，避免 SQLite 所在盘写满。

---

## 7. 恢复与回滚演练（上线前必须做一次）

### 7.1 备份恢复演练

目的：证明备份真的能救回数据。

```bash
# 1) 从 OSS 下载一份备份到临时目录
ossutil cp oss://chris-hub-assets/backups/daily/chris-hub-2026-08-11.sqlite /tmp/restore-test.sqlite

# 2) 完整性检查
sqlite3 /tmp/restore-test.sqlite "PRAGMA integrity_check;"
# 应输出 ok

# 3) 用这份备份临时启动一个测试实例（不同端口）
cd /srv/chris-hub
sudo -u chris-hub env DATABASE_PATH=/tmp/restore-test.sqlite pnpm start -p 3999 &

# 4) 验证页面
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3999/cn
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3999/cn/products

# 5) 确认正常后关掉测试实例，删除测试文件
kill %1
rm /tmp/restore-test.sqlite
```

> 上面的日期文件名要换成 OSS 里实际存在的备份文件名。

### 7.2 代码回滚演练

发布新版本前先打 tag，回滚就是切回旧版本：

```bash
# 发布前：备份数据库 + 记录当前版本
cp /var/lib/chris-hub/chris-hub.sqlite /var/lib/chris-hub/chris-hub.sqlite.bak
cd /srv/chris-hub && git tag deploy-$(date +%F) && git push origin --tags

# 回滚时：
sudo systemctl stop chris-hub
cd /srv/chris-hub
git checkout <要回滚到的 tag 或 commit>
sudo -u chris-hub pnpm install --frozen-lockfile
sudo -u chris-hub pnpm build
sudo systemctl start chris-hub

# 健康检查
curl -sS -o /dev/null -w "%{http_code}\n" https://example.com/cn
```

要点：

- 数据库迁移必须保持向前兼容；回滚旧代码时，如果新迁移已经执行过，先确认旧代码能兼容新表结构。
- 不可逆的迁移先在备份副本上验证，再上生产。

### 7.3 演练记录

每次演练后在 `docs/technical/deployment-guide.md` 的对应小节或验收记录里写：

```text
日期：
演练内容：恢复 / 回滚
结果：成功 / 失败（原因）
```

---

## 8. 验收清单（对应执行计划阶段 D）

- [ ] 新机器按本文档能完成部署（买一台/重装一台后走一遍第 5 步）
- [ ] 重启 ECS 后网站自动恢复、SQLite 数据不丢（数据盘在 `/var/lib/chris-hub`）
- [ ] HTTPS 生效，HTTP 自动跳转 HTTPS
- [ ] `https://example.com/cn`、`/cn/products`、详情页均 200
- [ ] 每日备份脚本已执行成功，OSS 里能看到 `backups/daily/` 文件
- [ ] 磁盘 70% 告警已配置
- [ ] 至少完成一次备份恢复演练和一次代码回滚演练
- [ ] 正确 accessKey 可进入中台，错误 Key 返回 404

---

## 9. 常见问题

**HTTPS 打不开 / 证书不生效**
先确认安全组放行了 443，再确认域名 A 记录指向 ECS 公网 IP，最后看 `sudo systemctl status nginx` 和 certbot 输出。

**网站 502 Bad Gateway**
Next.js 没起来。看 `sudo systemctl status chris-hub` 和 `sudo journalctl -u chris-hub -e`。

**网站 500，日志里有 SQLite 权限错误**
数据库文件属主不对。执行：

```bash
sudo chown -R chris-hub:chris-hub /var/lib/chris-hub
sudo systemctl restart chris-hub
```

**图片裂了**
先确认 `assets.example.com` 能打开第 3.4 步上传的测试图；再确认 `ASSET_BASE_URL` 写对。当前种子图仍走本地，属正常，阶段 C 接入 OSS 后会统一处理。

**CDN 域名 403**
检查 CDN“回源配置”里 OSS 私有 Bucket 回源授权是否开启。

**证书过期**
Let's Encrypt 会自动续期；阿里云免费证书 90 天到期需手动重新申请部署，可以在手机日历里设提醒。

**重启后数据没了**
检查数据盘是否挂载：`df -h /var/lib/chris-hub`。重启后不显示挂载就是 `/etc/fstab` 没写对。

---

## 10. 阶段 C 已完成，本手册即为生产部署版本

阶段 C（中台 + OSS 直传）已经在 `codex/oss-test` 分支完成并通过 CI，因此本手册按“阶段 C 代码直接上生产”编写，与阶段 C 的衔接已经内置：

1. 中台上传接口使用第 3.3 步的 RAM 用户 + STS 角色签发单文件临时凭证，浏览器直传 OSS；`OSS_ROLE_ARN` 是新增必填环境变量。
2. 商品/Banner/Logo/二维码由管理员在中台上传，对象 Key 前缀为 `sku/`、`banner/`、`site/`，`ASSET_BASE_URL` 指向 CDN 域名后全站生效。
3. 种子数据里的演示图仍走本地 SVG（`mock/` 前缀），属于首启演示内容；正式上线由管理员录入真实商品后逐步替换。
4. 部署完成后按 [deployment-acceptance-plan.md](./deployment-acceptance-plan.md) 逐阶段验收，重点是“中台上传 → OSS 可见 → 前台显示”这条链路。

建议节奏：先按第 1-5 步把基础设施买好并部署（前台即可访问），然后管理员在中台录入首批真实内容，最后按验收方案做备份恢复与回滚演练。
