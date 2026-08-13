import { notFound } from "next/navigation";
import AdminNav from "@/app/components/admin-nav";
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
        <AdminNav accessKey={accessKey} />
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
