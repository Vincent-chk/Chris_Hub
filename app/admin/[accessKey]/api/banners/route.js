// 中台 Banner 列表与新建接口（阶段 C · C4）
import { isValidAdminKey } from "../../../../../lib/admin/guard.js";
import { ValidationError, createBanner, listBanners } from "../../../../../lib/repositories/admin.js";

export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export async function GET(request, { params }) {
  const { accessKey } = await params;
  if (!isValidAdminKey(accessKey)) {
    return json({ error: "Not Found" }, 404);
  }
  try {
    return json({ items: listBanners() });
  } catch (err) {
    console.error("[banners] 读取列表失败:", err);
    return json({ error: "读取 Banner 列表失败" }, 500);
  }
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
    const banner = await createBanner(body);
    return json({ banner });
  } catch (err) {
    if (err instanceof ValidationError) {
      return json({ error: err.message }, 400);
    }
    console.error("[banners] 新建失败:", err);
    return json({ error: "新建 Banner 失败" }, 500);
  }
}
