// OSS 连通性冒烟测试（阶段 3）
// 运行：node --env-file=.env.local scripts/oss-smoke.mjs
// 依赖 .env.local 中的 OSS_REGION / OSS_BUCKET / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET
import OSS from "ali-oss";

const REQUIRED = ["OSS_REGION", "OSS_BUCKET", "OSS_ACCESS_KEY_ID", "OSS_ACCESS_KEY_SECRET"];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`[FATAL] 缺少环境变量 ${key}（请在 .env.local 中配置）`);
    process.exit(1);
  }
}

const region = process.env.OSS_REGION;
const bucket = process.env.OSS_BUCKET;
const client = new OSS({
  endpoint: `https://oss-${region}.aliyuncs.com`,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket,
});

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

const key = `test/smoke-${Date.now()}.txt`;
const content = Buffer.from("chris-hub oss smoke test\n", "utf8");
const unsignedUrl = `https://${bucket}.oss-${region}.aliyuncs.com/${key}`;

console.log(`[INFO] bucket=${bucket} region=${region} key=${key}`);

await check("1. 上传 put", async () => {
  const { res } = await client.put(key, content);
  if (res.status !== 200) throw new Error(`put status=${res.status}`);
  return `status=${res.status}`;
});

await check("2. 元信息 getObjectMeta", async () => {
  const { status, res } = await client.getObjectMeta(key);
  if (status !== 200) throw new Error(`getObjectMeta status=${status}`);
  const headers = res.headers || {};
  const size = Number(headers["content-length"]);
  if (size !== content.length) throw new Error(`content-length=${size} expected=${content.length}`);
  return `size=${size} etag=${headers.etag}`;
});

await check("3. 下载并逐字节比对 get", async () => {
  const got = await client.get(key);
  if (Buffer.compare(got.content, content) !== 0) throw new Error("内容不一致");
  return `bytes=${got.content.length} match`;
});

await check("4. 签名 URL 可访问（私有桶）", async () => {
  const signed = client.signatureUrl(key, { expires: 600 });
  const resp = await fetch(signed);
  if (resp.status !== 200) throw new Error(`signed status=${resp.status}`);
  const text = await resp.text();
  if (text !== content.toString("utf8")) throw new Error("签名 URL 内容不一致");
  return `status=${resp.status}`;
});

await check("5. 未签名 URL 返回 403（桶为私有）", async () => {
  const resp = await fetch(unsignedUrl);
  if (resp.status !== 403) throw new Error(`unsigned status=${resp.status}，桶可能不是私有`);
  return `status=${resp.status}`;
});

await check("6. 删除 delete", async () => {
  const { res } = await client.delete(key);
  if (res.status !== 204 && res.status !== 200) throw new Error(`delete status=${res.status}`);
  return `status=${res.status}`;
});

await check("7. 列表无残留 list", async () => {
  let list;
  try {
    list = await client.list({ prefix: "test/" });
  } catch (err) {
    if (/does not belong|AccessDenied|Forbidden/i.test(err?.message || "")) {
      throw new Error(
        `${err.message}（RAM 策略缺少 oss:ListObjects 或桶级 Resource：acs:oss:*:*:${bucket}）`
      );
    }
    throw err;
  }
  const objects = list.objects || [];
  if (objects.some((obj) => obj.name === key)) throw new Error("测试对象仍存在");
  return `objects=${objects.length}`;
});

const failed = results.filter((r) => !r.ok);
console.log("\n================ 汇总 ================");
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name} (${r.ms}ms)`);
console.log(`结果：${results.length - failed.length}/${results.length} 通过`);
process.exit(failed.length ? 1 : 0);
