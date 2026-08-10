// 中台 Banner 排序接口（阶段 C · C4）
import { isValidAdminKey } from "../../../../../../lib/admin/guard.js";
import { ValidationError, reorderBanners } from "../../../../../../lib/repositories/admin.js";

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
    const items = reorderBanners(body?.ids);
    return json({ items });
  } catch (err) {
    if (err instanceof ValidationError) {
      return json({ error: err.message }, 400);
    }
    console.error("[banners] 排序失败:", err);
    return json({ error: "排序 Banner 失败" }, 500);
  }
}
