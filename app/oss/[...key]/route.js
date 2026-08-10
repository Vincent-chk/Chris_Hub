// 本地 OSS 图片代理（阶段 C · C3，仅开发期无 CDN 时使用）
// 服务端用长期 AK 读取私有桶对象并回传；生产环境改用 ASSET_BASE_URL（CDN）。
import { createOssAdminClient } from "../../../lib/oss/validate.js";

export const dynamic = "force-dynamic";

const ALLOWED_PREFIXES = ["sku/", "banner/", "site/"];

export async function GET(request, { params }) {
  const { key } = await params;
  const objectKey = Array.isArray(key) ? key.join("/") : String(key ?? "");
  if (!ALLOWED_PREFIXES.some((prefix) => objectKey.startsWith(prefix))) {
    return new Response("Not Found", { status: 404 });
  }
  try {
    const client = createOssAdminClient();
    const result = await client.get(objectKey);
    const buffer = Buffer.isBuffer(result.content) ? result.content : Buffer.from(result.content || "");
    const contentType =
      result.res?.headers?.["content-type"] || "application/octet-stream";
    return new Response(buffer, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error(`[oss-proxy] 读取失败: ${objectKey}`, err?.message || err);
    const message = typeof err?.message === "string" ? err.message : "";
    if (/缺少环境变量/.test(message)) {
      return new Response("服务端配置不完整", { status: 500 });
    }
    return new Response("Not Found", { status: 404 });
  }
}
