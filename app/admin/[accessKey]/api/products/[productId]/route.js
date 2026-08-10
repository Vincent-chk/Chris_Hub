// 中台商品聚合读取接口（阶段 C · C3，编辑回显）
import { isValidAdminKey } from "../../../../../../lib/admin/guard.js";
import { getProductAggregate } from "../../../../../../lib/repositories/admin.js";

export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export async function GET(request, { params }) {
  const { accessKey, productId } = await params;
  if (!isValidAdminKey(accessKey)) {
    return json({ error: "Not Found" }, 404);
  }
  const aggregate = getProductAggregate(productId);
  if (!aggregate) {
    return json({ error: "Not Found" }, 404);
  }
  return json(aggregate);
}
