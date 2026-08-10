// 中台标签读取与快速新建接口（阶段 C · C3）
import { isValidAdminKey } from "../../../../../lib/admin/guard.js";
import { createOrUpdateTag, ValidationError } from "../../../../../lib/repositories/admin.js";
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
    const tag = createOrUpdateTag({ nameCn: body?.nameCn, nameEn: body?.nameEn });
    return json({ tag });
  } catch (err) {
    if (err instanceof ValidationError) {
      return json({ error: err.message }, 400);
    }
    console.error("[tags] 新建失败:", err);
    return json({ error: "新建标签失败" }, 500);
  }
}
