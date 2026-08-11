"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav({ accessKey }) {
  const pathname = usePathname();
  const isActive = (href) => pathname?.startsWith(href);

  return (
    <nav className="admin-nav" aria-label="中台导航">
      <Link
        className={`admin-nav-item ${isActive(`/admin/${accessKey}/products`) ? "is-active" : ""}`}
        href={`/admin/${accessKey}/products`}
      >
        商品管理
      </Link>
      <Link
        className={`admin-nav-item ${isActive(`/admin/${accessKey}/tags`) ? "is-active" : ""}`}
        href={`/admin/${accessKey}/tags`}
      >
        标签管理
      </Link>
      <Link
        className={`admin-nav-item ${isActive(`/admin/${accessKey}/banners`) ? "is-active" : ""}`}
        href={`/admin/${accessKey}/banners`}
      >
        Banner 管理
      </Link>
      <Link
        className={`admin-nav-item ${isActive(`/admin/${accessKey}/site-settings`) ? "is-active" : ""}`}
        href={`/admin/${accessKey}/site-settings`}
      >
        网站设置
      </Link>
      <Link
        className={`admin-nav-item ${isActive(`/admin/${accessKey}/uploads`) ? "is-active" : ""}`}
        href={`/admin/${accessKey}/uploads`}
      >
        上传测试
      </Link>
      <Link
        className={`admin-nav-item ${isActive(`/admin/${accessKey}/devops`) ? "is-active" : ""}`}
        href={`/admin/${accessKey}/devops`}
      >
        开发者运维
      </Link>
    </nav>
  );
}
