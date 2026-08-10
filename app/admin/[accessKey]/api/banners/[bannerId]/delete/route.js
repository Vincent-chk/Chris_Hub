// 中台 Banner 删除接口（阶段 C · C4）
import { isValidAdminKey } from "../../../../../../../lib/admin/guard.js";
import { deleteBannerImage } from "../../../../../../../lib/repositories/admin.js";

export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request, { params }) {
  const { accessKey, bannerId } = await params;
  if (!isValidAdminKey(accessKey)) {
    return json({ error: "Not Found" }, 404);
  }
  try {
    const deleted = await deleteBannerImage(bannerId);
    if (!deleted) {
      return json({ error: "Not Found" }, 404);
    }
    return json({ deleted: true, id: bannerId });
  } catch (err) {
    console.error("[banners] 删除失败:", err);
    return json({ error: "删除 Banner 失败" }, 500);
  }
}
