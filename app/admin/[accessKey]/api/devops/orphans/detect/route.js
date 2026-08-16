// 中台"开发者运维"：孤儿对象检测（只读，不删除）（阶段 C · 补充任务）
import { isValidAdminKey } from "../../../../../../../lib/admin/guard.js";
import { db } from "../../../../../../../lib/db/connection.js";
import { createOssAdminClient } from "../../../../../../../lib/oss/validate.js";
import { detectOrphanObjects } from "../../../../../../../lib/oss/orphans.js";

export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request, { params }) {
  const { accessKey } = await params;
  if (!isValidAdminKey(accessKey)) {
    return json({ error: "Not Found" }, 404);
  }
  try {
    const client = createOssAdminClient();
    const result = await detectOrphanObjects(client, db);
    return json(result);
  } catch (err) {
    console.error("[devops] 孤儿对象检测失败:", err);
    return json({ error: "孤儿对象检测失败（请检查 OSS 配置）" }, 500);
  }
}
