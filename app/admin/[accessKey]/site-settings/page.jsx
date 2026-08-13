import { notFound } from "next/navigation";
import SiteSettingsManager from "@/app/components/site-settings-manager";
import { isValidAdminKey } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

export default async function AdminSiteSettings({ params }) {
  const { accessKey } = await params;
  if (!isValidAdminKey(accessKey)) notFound();
  return <SiteSettingsManager accessKey={accessKey} />;
}
