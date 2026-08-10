// 中台图片对象删除接口（阶段 C · C2）
// 仅允许删除本站受控前缀下的对象，防止任意路径删除。
import { isValidAdminKey } from "../../../../../../lib/admin/guard.js";
import { createOssAdminClient } from "../../../../../../lib/oss/validate.js";

export const dynamic = "force-dynamic";

const ALLOWED_PREFIXES = ["sku/", "banner/", "site/"];

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request, { params }) {
  const { accessKey } = await params;
  if (!isValidAdminKey(accessKey)) {
    return json({ error: "Not Found" }, 404);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "请求体必须是 JSON" }, 400);
  }

  const { objectKey } = body || {};
  if (typeof objectKey !== "string" || !objectKey) {
    return json({ error: "缺少 objectKey" }, 400);
  }
  if (!ALLOWED_PREFIXES.some((prefix) => objectKey.startsWith(prefix))) {
    return json({ error: "objectKey 前缀不在允许范围" }, 400);
  }

  try {
    const client = createOssAdminClient();
    await client.delete(objectKey);
    return json({ deleted: true, objectKey });
  } catch (err) {
    console.error("[images/cleanup] 删除失败:", err);
    const message = typeof err?.message === "string" ? err.message : "";
    if (/缺少环境变量/.test(message)) {
      return json({ error: "服务端配置不完整" }, 500);
    }
    return json({ error: "删除失败" }, 500);
  }
}
