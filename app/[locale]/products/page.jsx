import { notFound } from "next/navigation";
import CatalogPage from "@/app/components/catalog-page";
import { isLocale } from "@/lib/i18n";

export default async function ProductsPage({ params, searchParams }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  return (
    <CatalogPage
      locale={locale}
      initialQuery={typeof query?.q === "string" ? query.q : ""}
      initialTags={typeof query?.tags === "string" ? query.tags : ""}
      initialSort={query?.sort === "hot" ? "hot" : "latest"}
      initialPage={Math.max(Number(query?.page) || 1, 1)}
    />
  );
}
