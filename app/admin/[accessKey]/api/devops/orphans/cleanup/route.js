// 中台"开发者运维"：孤儿对象清理（服务端重新检测后删除当前孤儿）（阶段 C · 补充任务）
import { isValidAdminKey } from "../../../../../../../lib/admin/guard.js";
import { db } from "../../../../../../../lib/db/connection.js";
import { createOssAdminClient } from "../../../../../../../lib/oss/validate.js";
import { deleteOrphanObjects, detectOrphanObjects } from "../../../../../../../lib/oss/orphans.js";

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
    // 以服务端最新检测结果为准，不信任客户端传入的清单
    const result = await detectOrphanObjects(client, db);
    const { deleted, failures } = await deleteOrphanObjects(
      client,
      result.items.map((item) => item.key),
    );
    return json({ deleted, failures });
  } catch (err) {
    console.error("[devops] 孤儿对象清理失败:", err);
    return json({ error: "孤儿对象清理失败（请检查 OSS 配置）" }, 500);
  }
}
