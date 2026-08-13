// 中台网站设置读取与保存接口（阶段 C · C6）
import { isValidAdminKey } from "../../../../../lib/admin/guard.js";
import {
  ValidationError,
  getSiteSettings,
  saveSiteSettings,
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
  try {
    return json(getSiteSettings());
  } catch (err) {
    console.error("[site-settings] 读取失败:", err);
    return json({ error: "读取网站设置失败" }, 500);
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
    const settings = await saveSiteSettings({
      logo: body?.logo ?? null,
      qr: body?.qr ?? null,
      contactTextCn: body?.contactTextCn,
      contactTextEn: body?.contactTextEn,
      wechatId: body?.wechatId,
    });
    return json({ settings });
  } catch (err) {
    if (err instanceof ValidationError) {
      return json({ error: err.message }, 400);
    }
    console.error("[site-settings] 保存失败:", err);
    return json({ error: "保存网站设置失败" }, 500);
  }
}
