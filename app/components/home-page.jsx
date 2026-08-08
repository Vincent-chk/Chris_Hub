import Link from "next/link";
import { ArrowRight } from "lucide-react";
import BannerCarousel from "@/app/components/banner-carousel";
import ContactSection from "@/app/components/contact-section";
import ProductGrid from "@/app/components/product-grid";
import SiteFooter from "@/app/components/site-footer";
import SiteHeader from "@/app/components/site-header";
import { copy } from "@/lib/i18n";

export default function HomePage({ locale, banners, popularProducts }) {
  const text = copy(locale);
  return (
    <div className="site-frame">
      <SiteHeader locale={locale} />
      <main>
        <section className="hero-section section-pad">
          <div className="hero-copy">
            <span className="eyebrow">{text.heroEyebrow}</span>
            <h1>{text.heroTitle}</h1>
            <p>{text.heroBody}</p>
            <Link className="text-link" href={`/${locale}/products`}>{text.explore} <ArrowRight size={16} /></Link>
          </div>
          <BannerCarousel banners={banners} />
        </section>

        <section className="brand-section section-pad">
          <div className="section-label">01 <span>{text.brandEyebrow}</span></div>
          <div className="brand-intro">
            <h2>{text.brandTitle}</h2>
            <p>{text.brandBody}</p>
          </div>
        </section>

        <section className="products-section section-pad">
          <div className="section-heading">
            <div><div className="section-label">02 <span>{text.hotTitle}</span></div><h2>{text.hotTitle}</h2><p>{text.hotBody}</p></div>
            <Link className="text-link" href={`/${locale}/products`}>{text.viewAll} <ArrowRight size={16} /></Link>
          </div>
          <ProductGrid products={popularProducts} locale={locale} />
        </section>

        <ContactSection locale={locale} />
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
