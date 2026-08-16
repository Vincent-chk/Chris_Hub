// 中台商品列表与保存接口（阶段 C · C3）
import { isValidAdminKey } from "../../../../../lib/admin/guard.js";
import {
  ConflictError,
  ValidationError,
  listAdminProducts,
  saveProductAggregate,
} from "../../../../../lib/repositories/admin.js";

export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export async function GET(request, { params }) {
  const { accessKey } = await params;
  if (!isValidAdminKey(accessKey)) {
    return json({ error: "Not Found" }, 404);
  }
  const url = new URL(request.url);
  const query = url.searchParams.get("query") ?? "";
  const statusParam = url.searchParams.get("status");
  const status = statusParam === "draft" || statusParam === "published" ? statusParam : undefined;
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize")) || 20, 1), 50);
  try {
    return json(listAdminProducts({ query, status, page, pageSize }));
  } catch (err) {
    console.error("[products] 读取列表失败:", err);
    return json({ error: "读取商品列表失败" }, 500);
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
    const product = await saveProductAggregate(body);
    return json({ product });
  } catch (err) {
    if (err instanceof ConflictError) {
      return json({ error: err.message }, 409);
    }
    if (err instanceof ValidationError) {
      return json({ error: err.message }, 400);
    }
    console.error("[products] 保存失败:", err);
    return json({ error: "保存商品失败" }, 500);
  }
}
