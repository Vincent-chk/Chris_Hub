"use client";

import Link from "next/link";
import { Globe2, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { copy, switchLocalePath } from "@/lib/i18n";

export default function SiteHeader({ locale, logoUrl }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const text = copy(locale);
  const otherLocale = locale === "cn" ? "en" : "cn";
  const otherPath = switchLocalePath(pathname || `/${locale}`, otherLocale);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand-lockup" href={`/${locale}`} onClick={() => setOpen(false)}>
          <img src={logoUrl || "/brand-mark.svg"} alt="" className="brand-mark" />
          <span className="brand-copy">
            <strong>{locale === "cn" ? "克里斯卡社" : "Chris Hub"}</strong>
            <small>{locale === "cn" ? "Chris Hub" : "克里斯卡社"}</small>
          </span>
        </Link>

        <button className="mobile-menu-button" type="button" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={`main-nav ${open ? "is-open" : ""}`} aria-label="Primary navigation">
          <Link href={`/${locale}`} onClick={() => setOpen(false)}>{text.navHome}</Link>
          <Link href={`/${locale}/products`} onClick={() => setOpen(false)}>{text.navProducts}</Link>
          <Link href={`/${locale}#contact`} onClick={() => setOpen(false)}>{text.navContact}</Link>
          <Link className="language-link" href={otherPath} onClick={() => setOpen(false)}>
            <Globe2 size={15} aria-hidden="true" />
            <span>{locale === "cn" ? "EN" : "中文"}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
