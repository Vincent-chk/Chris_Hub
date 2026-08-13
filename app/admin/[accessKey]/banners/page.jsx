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
        每个用途最多 5 张；编辑为本地暂存，点击"保存并发布"后生效，点击"取消"恢复原样。
      </p>
      <BannerManager accessKey={accessKey} />
    </section>
  );
}
