import { notFound } from "next/navigation";
import BannerManager from "@/app/components/banner-manager";
import { isValidAdminKey } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

export default async function AdminBanners({ params }) {
  const { accessKey } = await params;
  if (!isValidAdminKey(accessKey)) notFound();

  return (
    <section>
      <h1 className="admin-title">Banner 管理</h1>
      <p className="admin-lead">
        最多 5 张；中文与英文桌面图必填，移动图可选（未上传时前台回退对应语言桌面图）。
      </p>
      <BannerManager accessKey={accessKey} />
    </section>
  );
}
