// 中台标签启用/停用接口（阶段 C · C7）
import { isValidAdminKey } from "../../../../../../../lib/admin/guard.js";
import { setTagEnabled } from "../../../../../../../lib/repositories/admin.js";

export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request, { params }) {
  const { accessKey, tagId } = await params;
  if (!isValidAdminKey(accessKey)) {
    return json({ error: "Not Found" }, 404);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "请求体必须是 JSON" }, 400);
  }
  if (typeof body?.enabled !== "boolean" && body?.enabled !== 0 && body?.enabled !== 1) {
    return json({ error: "缺少有效的 enabled 参数" }, 400);
  }
  const tag = setTagEnabled(tagId, body.enabled);
  if (!tag) {
    return json({ error: "Not Found" }, 404);
  }
  return json({ tag });
}
