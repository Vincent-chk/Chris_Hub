// 中台图片对象服务端校验接口（阶段 C · C2）
import { isValidAdminKey } from "../../../../../../lib/admin/guard.js";
import { validateUploadedImage } from "../../../../../../lib/oss/validate.js";

export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
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

  const { objectKey, specId, checksum } = body || {};
  if (typeof objectKey !== "string" || !objectKey) {
    return json({ error: "缺少 objectKey" }, 400);
  }
  if (typeof specId !== "string" || !specId) {
    return json({ error: "缺少 specId" }, 400);
  }

  try {
    const result = await validateUploadedImage({
      objectKey,
      specId,
      checksum: typeof checksum === "string" && checksum ? checksum : undefined,
    });
    return json(result);
  } catch (err) {
    console.error("[images/validate] 校验失败:", err);
    const message = typeof err?.message === "string" ? err.message : "";
    if (/缺少环境变量/.test(message)) {
      return json({ error: "服务端配置不完整" }, 500);
    }
    return json({ error: message }, 400);
  }
}
