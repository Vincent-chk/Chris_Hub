// 中台 Banner 整体发布接口（阶段 C · C4 暂存模式）
import { isValidAdminKey } from "../../../../../../lib/admin/guard.js";
import {
  ValidationError,
  publishBanners,
} from "../../../../../../lib/repositories/admin.js";

export const dynamic = "force-dynamic";

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
  try {
    const items = await publishBanners(body?.purposes);
    return json({ items });
  } catch (err) {
    if (err instanceof ValidationError) {
      return json({ error: err.message }, 400);
    }
    console.error("[banners] 发布失败:", err);
    return json({ error: "发布 Banner 失败" }, 500);
  }
}
