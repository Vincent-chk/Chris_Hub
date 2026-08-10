// 中台 Banner 更新接口（阶段 C · C4）
import { isValidAdminKey } from "../../../../../../lib/admin/guard.js";
import {
  ValidationError,
  updateBanner,
} from "../../../../../../lib/repositories/admin.js";

export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request, { params }) {
  const { accessKey, bannerId } = await params;
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
    const banner = await updateBanner(bannerId, body);
    if (!banner) {
      return json({ error: "Not Found" }, 404);
    }
    return json({ banner });
  } catch (err) {
    if (err instanceof ValidationError) {
      return json({ error: err.message }, 400);
    }
    console.error("[banners] 更新失败:", err);
    return json({ error: "更新 Banner 失败" }, 500);
  }
}
