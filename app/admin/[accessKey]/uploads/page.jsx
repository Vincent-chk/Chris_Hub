import { notFound } from "next/navigation";
import UploadTestArea from "@/app/components/upload-test-area";
import { isValidAdminKey } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

export default async function AdminUploads({ params }) {
  const { accessKey } = await params;
  if (!isValidAdminKey(accessKey)) notFound();

  return (
    <section>
      <h1 className="admin-title">图片上传测试</h1>
      <p className="admin-lead">
        选择上传区与图片，完成固定比例裁剪后直传 OSS，并验证服务端校验（不写入数据库）。
      </p>
      <UploadTestArea accessKey={accessKey} />
    </section>
  );
}
