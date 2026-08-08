import { notFound } from "next/navigation";
import CatalogPage from "@/app/components/catalog-page";
import { isLocale } from "@/lib/i18n";
import { listEnabledTags, listProducts } from "@/lib/repositories/catalog";

export default async function ProductsPage({ params, searchParams }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const q = typeof query?.q === "string" ? query.q.trim() : "";
  const tagIds = typeof query?.tags === "string" ? query.tags.split(",").filter(Boolean) : [];
  const sort = query?.sort === "hot" ? "hot" : "latest";
  const page = Math.max(Number(query?.page) || 1, 1);
  const data = listProducts({ locale, query: q, tagIds, sort, page, pageSize: 20 });
  const tags = listEnabledTags(locale);
  return (
    <CatalogPage
      locale={locale}
      data={data}
      filters={{ query: q, tags: tagIds, sort }}
      tags={tags}
    />
  );
}
