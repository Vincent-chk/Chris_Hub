// 中台标签读取与新建/编辑接口（阶段 C · C3/C7）
import { isValidAdminKey } from "../../../../../lib/admin/guard.js";
import {
  createOrUpdateTag,
  listAdminTags,
  ValidationError,
} from "../../../../../lib/repositories/admin.js";
import { db } from "../../../../../lib/db/connection.js";
import { tags } from "../../../../../lib/schema/index.js";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export async function GET(request, { params }) {
  const { accessKey } = await params;
  if (!isValidAdminKey(accessKey)) {
    return json({ error: "Not Found" }, 404);
  }
  // 标签管理页使用 ?all=1 获取全部（含停用）；商品表单默认只取启用标签
  const url = new URL(request.url);
  if (url.searchParams.get("all") === "1") {
    return json({ items: listAdminTags() });
  }
  const rows = db
    .select({ id: tags.id, nameCn: tags.nameCn, nameEn: tags.nameEn })
    .from(tags)
    .where(eq(tags.enabled, 1))
    .orderBy(tags.nameCn)
    .all();
  return json({ items: rows });
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
    const tag = createOrUpdateTag({
      id: typeof body?.id === "string" && body.id ? body.id : undefined,
      nameCn: body?.nameCn,
      nameEn: body?.nameEn,
    });
    return json({ tag });
  } catch (err) {
    if (err instanceof ValidationError) {
      return json({ error: err.message }, 400);
    }
    console.error("[tags] 保存失败:", err);
    return json({ error: "保存标签失败" }, 500);
  }
}
