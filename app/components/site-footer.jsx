import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { copy } from "@/lib/i18n";

export default function SiteFooter({ locale }) {
  const text = copy(locale);
  return (
    <footer className="site-footer">
      <div>
        <span className="footer-brand">{locale === "cn" ? "克里斯卡社" : "Chris Hub"}</span>
        <p>{text.footerNote}</p>
      </div>
      <Link href={`/${locale}/products`} className="footer-link">
        {text.navProducts} <ArrowUpRight size={15} aria-hidden="true" />
      </Link>
    </footer>
  );
}
