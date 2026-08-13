// 中台标签绑定商品列表接口（阶段 C · C7）
import { isValidAdminKey } from "../../../../../../../lib/admin/guard.js";
import { listTagProducts } from "../../../../../../../lib/repositories/admin.js";

export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export async function GET(request, { params }) {
  const { accessKey, tagId } = await params;
  if (!isValidAdminKey(accessKey)) {
    return json({ error: "Not Found" }, 404);
  }
  const items = listTagProducts(tagId);
  if (!items) {
    return json({ error: "Not Found" }, 404);
  }
  return json({ items });
}
