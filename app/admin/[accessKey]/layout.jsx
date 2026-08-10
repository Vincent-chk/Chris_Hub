import { notFound } from "next/navigation";
import Link from "next/link";
import { isValidAdminKey } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children, params }) {
  const { accessKey } = await params;
  if (!isValidAdminKey(accessKey)) notFound();

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <strong>克里斯卡社 · 中台</strong>
      </header>
      <div className="admin-body">
        <nav className="admin-nav" aria-label="中台导航">
          <span className="admin-nav-item is-active">商品管理</span>
          <span className="admin-nav-item">标签管理</span>
          <span className="admin-nav-item">Banner 管理</span>
          <span className="admin-nav-item">网站设置</span>
          <Link className="admin-nav-item" href={`/admin/${accessKey}/uploads`}>
            上传测试
          </Link>
          <small className="admin-nav-note">以上功能即将开放</small>
        </nav>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
