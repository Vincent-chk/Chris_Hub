import { notFound } from "next/navigation";
import ProductForm from "@/app/components/product-form";
import { isValidAdminKey } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

export default async function NewProduct({ params }) {
  const { accessKey } = await params;
  if (!isValidAdminKey(accessKey)) notFound();
  return <ProductForm accessKey={accessKey} />;
}
