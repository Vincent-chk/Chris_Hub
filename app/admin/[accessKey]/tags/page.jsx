import { notFound } from "next/navigation";
import TagManager from "@/app/components/tag-manager";
import { isValidAdminKey } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

export default async function AdminTags({ params }) {
  const { accessKey } = await params;
  if (!isValidAdminKey(accessKey)) notFound();
  return <TagManager accessKey={accessKey} />;
}
