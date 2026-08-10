// 中台 OSS 上传凭证接口（阶段 C · C1）
// 路径内携带 accessKey，服务端逐次校验；错误 Key 一律 404。
import { buildSignedPutUrl, createUploadCredentials } from "../../../../../lib/oss/sts.js";
import { isValidAdminKey } from "../../../../../lib/admin/guard.js";

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

  const { purpose, extension, skuId, contentType } = body || {};
  try {
    const result = await createUploadCredentials({ purpose, extension, skuId });
    const uploadUrl = buildSignedPutUrl({
      objectKey: result.objectKey,
      region: result.region,
      bucket: result.bucket,
      credentials: result.credentials,
      contentType: typeof contentType === "string" && contentType ? contentType : undefined,
    });
    return json({
      objectKey: result.objectKey,
      uploadUrl,
      expiresAt: result.expiresAt,
      region: result.region,
      bucket: result.bucket,
    });
  } catch (err) {
    console.error("[upload-token] 签发失败:", err);
    const message = typeof err?.message === "string" ? err.message : "";
    if (/不支持的|必须提供/.test(message)) {
      return json({ error: message }, 400);
    }
    if (/缺少环境变量/.test(message)) {
      return json({ error: "服务端配置不完整" }, 500);
    }
    return json({ error: "凭证签发失败" }, 500);
  }
}
