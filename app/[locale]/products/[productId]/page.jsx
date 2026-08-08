import { notFound } from "next/navigation";
import ProductDetail from "@/app/components/product-detail";
import { isLocale } from "@/lib/i18n";
import { getProductDetail, incrementProductView } from "@/lib/repositories/catalog";

export default async function ProductPage({ params }) {
  const { locale, productId } = await params;
  if (!isLocale(locale)) notFound();
  const product = getProductDetail({ productId, locale });
  if (!product) notFound();
  incrementProductView(productId);
  return <ProductDetail locale={locale} product={product} />;
}
