// OSS STS 直传凭证冒烟测试（阶段 C · C0）
// 运行：node --env-file=.env.local scripts/sts-smoke.mjs
// 依赖 .env.local：OSS_REGION / OSS_BUCKET / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / OSS_ROLE_ARN
import OSS from "ali-oss";
import { createUploadCredentials } from "../lib/oss/sts.js";

const REQUIRED = ["OSS_REGION", "OSS_BUCKET", "OSS_ACCESS_KEY_ID", "OSS_ACCESS_KEY_SECRET", "OSS_ROLE_ARN"];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`[FATAL] 缺少环境变量 ${key}（请在 .env.local 中配置）`);
    process.exit(1);
  }
}

const results = [];

async function check(name, fn) {
  const start = Date.now();
  try {
    const detail = await fn();
    const ms = Date.now() - start;
    results.push({ name, ok: true, ms });
    console.log(`[PASS] ${name} (${ms}ms)${detail ? ` -> ${detail}` : ""}`);
  } catch (err) {
    const ms = Date.now() - start;
    results.push({ name, ok: false, ms });
    console.error(`[FAIL] ${name} (${ms}ms) -> ${err?.message || err}`);
  }
}

const content = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

let creds;
let tempClient;

await check("1. 获取 STS 临时凭证", async () => {
  creds = await createUploadCredentials({ purpose: "banner", extension: "png" });
  if (!creds.objectKey.startsWith("banner/")) throw new Error(`objectKey 前缀错误: ${creds.objectKey}`);
  if (!creds.credentials?.securityToken) throw new Error("缺少 securityToken");
  if (!creds.expiresAt) throw new Error("缺少 expiresAt");
  return `${creds.objectKey} expires=${creds.expiresAt}`;
});

await check("2. 临时凭证直传 PUT（目标 Key）", async () => {
  tempClient = new OSS({
    endpoint: `https://oss-${creds.region}.aliyuncs.com`,
    accessKeyId: creds.credentials.accessKeyId,
    accessKeySecret: creds.credentials.accessKeySecret,
    stsToken: creds.credentials.securityToken,
    bucket: creds.bucket,
  });
  const { res } = await tempClient.put(creds.objectKey, content);
  if (res.status !== 200) throw new Error(`put status=${res.status}`);
  return `status=${res.status}`;
});

await check("3. 会话策略最小权限（其他 Key 应被拒）", async () => {
  const otherKey = `banner/other-${Date.now()}.png`;
  try {
    await tempClient.put(otherKey, content);
    throw new Error(`意外成功：临时凭证可写入 ${otherKey}`);
  } catch (err) {
    const status = Number(err?.status) || Number(err?.code);
    const denied = status === 403 || /AccessDenied|Forbidden|does not belong/i.test(err?.message || "");
    if (!denied) throw err;
    return `已拒绝（${err?.message || err?.code || status}）`;
  }
});

const adminClient = new OSS({
  endpoint: `https://oss-${process.env.OSS_REGION}.aliyuncs.com`,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
});

await check("4. 长期 AK 确认对象存在且大小一致", async () => {
  const { status, res } = await adminClient.getObjectMeta(creds.objectKey);
  if (status !== 200) throw new Error(`getObjectMeta status=${status}`);
  const size = Number(res.headers["content-length"]);
  if (size !== content.length) throw new Error(`content-length=${size} expected=${content.length}`);
  return `status=${status} size=${size}`;
});

await check("5. 清理：删除 + 列表无残留", async () => {
  const del = await adminClient.delete(creds.objectKey);
  if (del.res.status !== 204 && del.res.status !== 200) throw new Error(`delete status=${del.res.status}`);
  const list = await adminClient.list({ prefix: "banner/" });
  const objects = list.objects || [];
  if (objects.some((obj) => obj.name === creds.objectKey)) throw new Error("测试对象仍存在");
  return `deleted, objects=${objects.length}`;
});

const failed = results.filter((r) => !r.ok);
console.log("\n================ 汇总 ================");
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name} (${r.ms}ms)`);
console.log(`结果：${results.length - failed.length}/${results.length} 通过`);
process.exit(failed.length ? 1 : 0);
