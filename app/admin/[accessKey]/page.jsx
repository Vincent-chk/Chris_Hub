import { notFound } from "next/navigation";
import UploadTokenCheck from "@/app/components/upload-token-check";
import { isValidAdminKey } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

export default async function AdminHome({ params }) {
  const { accessKey } = await params;
  if (!isValidAdminKey(accessKey)) notFound();

  return (
    <section>
      <h1 className="admin-title">欢迎使用中台</h1>
      <p className="admin-lead">
        本后台仅限授权人员使用。后续将在这里提供商品、标签、Banner 和网站设置管理。
      </p>
      <UploadTokenCheck accessKey={accessKey} />
    </section>
  );
}
