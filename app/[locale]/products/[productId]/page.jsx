import { notFound } from "next/navigation";
import ProductDetail from "@/app/components/product-detail";
import { isLocale } from "@/lib/i18n";
import { getProduct } from "@/lib/mock-data";

export default async function ProductPage({ params }) {
  const { locale, productId } = await params;
  if (!isLocale(locale)) notFound();
  const product = getProduct(productId);
  if (!product) notFound();
  return <ProductDetail locale={locale} product={product} />;
}
