"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, ListFilter, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import ProductGrid from "@/app/components/product-grid";
import SiteFooter from "@/app/components/site-footer";
import SiteHeader from "@/app/components/site-header";
import { copy, localized } from "@/lib/i18n";
import { PRODUCTS, TAGS } from "@/lib/mock-data";

const PAGE_SIZE = 20;

export default function CatalogPage({ locale, initialQuery, initialTags, initialSort, initialPage }) {
  const text = copy(locale);
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [selectedTags, setSelectedTags] = useState(initialTags ? initialTags.split(",").filter(Boolean) : []);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);

  const filtered = useMemo(() => {
    const needle = submittedQuery.trim().toLocaleLowerCase();
    return PRODUCTS.filter((product) => {
      const matchesQuery = !needle || product.name.cn.toLocaleLowerCase().includes(needle) || product.name.en.toLocaleLowerCase().includes(needle);
      const matchesTags = !selectedTags.length || selectedTags.some((tag) => product.tags.includes(tag));
      return matchesQuery && matchesTags;
    }).sort((a, b) => sort === "hot" ? b.viewCount - a.viewCount || b.createdAt.localeCompare(a.createdAt) : b.createdAt.localeCompare(a.createdAt));
  }, [selectedTags, sort, submittedQuery]);

  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function syncUrl(nextPage = 1, nextQuery = submittedQuery, nextTags = selectedTags, nextSort = sort) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextTags.length) params.set("tags", nextTags.join(","));
    if (nextSort !== "latest") params.set("sort", nextSort);
    if (nextPage > 1) params.set("page", String(nextPage));
    window.history.pushState({}, "", `/${locale}/products${params.toString() ? `?${params}` : ""}`);
  }

  function submit(event) {
    event.preventDefault();
    setSubmittedQuery(query);
    setPage(1);
    syncUrl(1, query);
  }

  function toggleTag(tagId) {
    const next = selectedTags.includes(tagId) ? selectedTags.filter((id) => id !== tagId) : [...selectedTags, tagId];
    setSelectedTags(next);
    setPage(1);
    syncUrl(1, submittedQuery, next);
  }

  function changeSort(next) {
    setSort(next);
    setPage(1);
    syncUrl(1, submittedQuery, selectedTags, next);
  }

  function goTo(nextPage) {
    const safePage = Math.max(1, Math.min(nextPage, totalPages));
    setPage(safePage);
    syncUrl(safePage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="site-frame">
      <SiteHeader locale={locale} />
      <main className="catalog-main section-pad">
        <div className="catalog-intro"><div className="section-label">Collection <span>{text.navProducts}</span></div><h1>{text.navProducts}</h1><p>{locale === "cn" ? "按商品浏览，不按 SKU 拆分。" : "Browse by product, never by SKU."}</p></div>
        <div className="catalog-toolbar">
          <form className="search-form" onSubmit={submit}>
            <Search size={17} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.searchPlaceholder} aria-label={text.searchPlaceholder} /><button type="submit">{text.searchAction}</button>
          </form>
          <div className="sort-control" role="group" aria-label="Sort products"><SlidersHorizontal size={16} aria-hidden="true" /><button className={sort === "latest" ? "is-active" : ""} type="button" onClick={() => changeSort("latest")}>{text.latest}</button><button className={sort === "hot" ? "is-active" : ""} type="button" onClick={() => changeSort("hot")}>{text.hot}</button></div>
        </div>
        <div className="filter-line"><span><ListFilter size={16} aria-hidden="true" />{text.filters}</span><div className="filter-options">{TAGS.map((tag) => <button className={`filter-pill ${selectedTags.includes(tag.id) ? "is-selected" : ""}`} type="button" key={tag.id} onClick={() => toggleTag(tag.id)}>{localized(tag, locale)}</button>)}</div>{selectedTags.length > 0 && <button className="clear-button" type="button" onClick={() => { setSelectedTags([]); setPage(1); syncUrl(1, submittedQuery, []); }}>{text.clear}</button>}</div>
        {visible.length ? <ProductGrid products={visible} locale={locale} /> : <div className="empty-state"><h2>{text.noResults}</h2><Link href={`/${locale}/products`}>{text.clear}</Link></div>}
        <div className="pagination"><button className="pagination-button" type="button" disabled={currentPage <= 1} onClick={() => goTo(currentPage - 1)}><ChevronLeft size={17} /> {text.previous}</button><span>{text.pageOf(currentPage, totalPages)}</span><button className="pagination-button" type="button" disabled={currentPage >= totalPages} onClick={() => goTo(currentPage + 1)}>{text.next} <ChevronRight size={17} /></button></div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
