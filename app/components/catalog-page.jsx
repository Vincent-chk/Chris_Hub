"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, ListFilter, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import ProductGrid from "@/app/components/product-grid";
import SiteFooter from "@/app/components/site-footer";
import SiteHeader from "@/app/components/site-header";
import { copy } from "@/lib/i18n";

export default function CatalogPage({ locale, data, filters, tags, logoUrl }) {
  const text = copy(locale);
  const [query, setQuery] = useState(filters.query);

  function buildHref({ q = filters.query, tagIds = filters.tags, sort = filters.sort, page = 1 }) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tagIds.length) params.set("tags", tagIds.join(","));
    if (sort === "hot") params.set("sort", "hot");
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return `/${locale}/products${qs ? `?${qs}` : ""}`;
  }

  function toggleTag(tagId) {
    const next = filters.tags.includes(tagId)
      ? filters.tags.filter((id) => id !== tagId)
      : [...filters.tags, tagId];
    return buildHref({ tagIds: next, page: 1 });
  }

  return (
    <div className="site-frame">
      <SiteHeader locale={locale} logoUrl={logoUrl} />
      <main className="catalog-main section-pad">
        <div className="catalog-intro"><div className="section-label">Collection <span>{text.navProducts}</span></div><h1>{text.navProducts}</h1><p>{locale === "cn" ? "按商品浏览，不按 SKU 拆分。" : "Browse by product, never by SKU."}</p></div>
        <div className="catalog-toolbar">
          <form className="search-form" action={`/${locale}/products`} method="get">
            <Search size={17} aria-hidden="true" />
            <input name="q" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.searchPlaceholder} aria-label={text.searchPlaceholder} />
            <input type="hidden" name="tags" value={filters.tags.join(",")} />
            <input type="hidden" name="sort" value={filters.sort} />
            <button type="submit">{text.searchAction}</button>
          </form>
          <div className="sort-control" role="group" aria-label="Sort products"><SlidersHorizontal size={16} aria-hidden="true" />
            <Link className={filters.sort === "latest" ? "is-active" : ""} href={buildHref({ sort: "latest", page: 1 })}>{text.latest}</Link>
            <Link className={filters.sort === "hot" ? "is-active" : ""} href={buildHref({ sort: "hot", page: 1 })}>{text.hot}</Link>
          </div>
        </div>
        <div className="filter-line"><span><ListFilter size={16} aria-hidden="true" />{text.filters}</span><div className="filter-options">{tags.map((tag) => <Link className={`filter-pill ${filters.tags.includes(tag.id) ? "is-selected" : ""}`} href={toggleTag(tag.id)} key={tag.id}>{tag.name}</Link>)}</div>{filters.tags.length > 0 && <Link className="clear-button" href={buildHref({ tagIds: [], page: 1 })}>{text.clear}</Link>}</div>
        {data.items.length ? <ProductGrid products={data.items} locale={locale} /> : <div className="empty-state"><h2>{text.noResults}</h2><Link href={`/${locale}/products`}>{text.clear}</Link></div>}
        <div className="pagination">
          {data.page <= 1 ? <span className="pagination-button is-disabled"><ChevronLeft size={17} /> {text.previous}</span> : <Link className="pagination-button" href={buildHref({ page: data.page - 1 })}><ChevronLeft size={17} /> {text.previous}</Link>}
          <span>{text.pageOf(data.page, data.totalPages)}</span>
          {data.page >= data.totalPages ? <span className="pagination-button is-disabled">{text.next} <ChevronRight size={17} /></span> : <Link className="pagination-button" href={buildHref({ page: data.page + 1 })}>{text.next} <ChevronRight size={17} /></Link>}
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
