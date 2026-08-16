import { notFound } from "next/navigation";
import Link from "next/link";
import { isValidAdminKey } from "@/lib/admin/guard";
import { listAdminProducts } from "@/lib/repositories/admin";

export const dynamic = "force-dynamic";

export default async function AdminProducts({ params, searchParams }) {
  const { accessKey } = await params;
  if (!isValidAdminKey(accessKey)) notFound();

  const sp = await searchParams;
  const query = typeof sp?.query === "string" ? sp.query.trim() : "";
  const status = sp?.status === "draft" || sp?.status === "published" ? sp.status : "";
  const page = Math.max(Number(sp?.page) || 1, 1);
  const data = listAdminProducts({ query, status: status || undefined, page, pageSize: 20 });

  const pageHref = (targetPage) =>
    `/admin/${accessKey}/products?query=${encodeURIComponent(query)}&status=${status}&page=${targetPage}`;

  return (
    <section>
      <div className="admin-page-head">
        <h1 className="admin-title">商品管理</h1>
        <Link className="admin-check-button" href={`/admin/${accessKey}/products/new`}>
          新建商品
        </Link>
      </div>

      <form className="admin-toolbar" method="get">
        <input className="admin-input" name="query" defaultValue={query} placeholder="搜索商品名称" />
        <select className="admin-select" name="status" defaultValue={status}>
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
        </select>
        <button className="admin-check-button admin-button-ghost" type="submit">
          筛选
        </button>
      </form>

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>状态</th>
              <th>SKU</th>
              <th>浏览次数</th>
              <th>更新时间</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.nameCn}</strong>
                  {item.nameEn && <small className="admin-hint"> / {item.nameEn}</small>}
                </td>
                <td>
                  <span className={`admin-badge ${item.status === "published" ? "is-published" : ""}`}>
                    {item.status === "published" ? "已发布" : "草稿"}
                  </span>
                </td>
                <td>{item.skuCount}</td>
                <td>{item.viewCount}</td>
                <td>{item.updatedAt?.slice(0, 19).replace("T", " ")}</td>
                <td>
                  <Link className="admin-link" href={`/admin/${accessKey}/products/${item.id}/edit`}>
                    编辑
                  </Link>
                </td>
              </tr>
            ))}
            {!data.items.length && (
              <tr>
                <td colSpan={6} className="admin-empty">
                  暂无商品
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <div className="admin-pagination">
          {page > 1 && (
            <Link className="admin-link" href={pageHref(page - 1)}>
              上一页
            </Link>
          )}
          <span>
            第 {page} / {data.totalPages} 页
          </span>
          {page < data.totalPages && (
            <Link className="admin-link" href={pageHref(page + 1)}>
              下一页
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
