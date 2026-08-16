import { notFound } from "next/navigation";
import DevOpsPanel from "@/app/components/devops-panel";
import { isValidAdminKey } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

export default async function AdminDevOps({ params }) {
  const { accessKey } = await params;
  if (!isValidAdminKey(accessKey)) notFound();
  return <DevOpsPanel accessKey={accessKey} />;
}
