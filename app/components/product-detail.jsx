"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, MessageCircle, ZoomIn } from "lucide-react";
import { useState } from "react";
import ContactModal from "@/app/components/contact-modal";
import SiteFooter from "@/app/components/site-footer";
import SiteHeader from "@/app/components/site-header";
import { copy, localized } from "@/lib/i18n";

export default function ProductDetail({ locale, product }) {
  const text = copy(locale);
  const [skuIndex, setSkuIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const sku = product.skus[skuIndex];
  const image = sku.images[imageIndex];
  const productTitle = localized(product.name, locale);

  function selectSku(index) {
    setSkuIndex(index);
    setImageIndex(0);
  }

  function shiftImage(delta) {
    setImageIndex((value) => (value + delta + sku.images.length) % sku.images.length);
  }

  return (
    <div className="site-frame">
      <SiteHeader locale={locale} />
      <main className="detail-main section-pad">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href={`/${locale}`}>{text.breadcrumbHome}</Link><span>/</span><Link href={`/${locale}/products`}>{text.breadcrumbProducts}</Link><span>/</span><span>{productTitle}</span></nav>
        <div className="detail-layout">
          <section className="detail-info">
            <div className="section-label">{text.selectedSku} <span>{skuIndex + 1} / {product.skus.length}</span></div>
            <h1>{localized(sku.name, locale)}</h1>
            <div className="detail-price"><span>¥{sku.price}</span>{product.skus.length > 1 && <small>{localized(sku.tab, locale)}</small>}</div>
            {product.skus.length > 1 && <div className="sku-tabs" role="tablist" aria-label={text.selectedSku}>{product.skus.map((item, index) => <button key={item.id} type="button" role="tab" aria-selected={index === skuIndex} className={index === skuIndex ? "is-active" : ""} onClick={() => selectSku(index)}>{localized(item.tab, locale)}</button>)}</div>}
            <p className="detail-description">{localized(product.description, locale)}</p>
            <button className="primary-button detail-contact" type="button" onClick={() => setContactOpen(true)}><MessageCircle size={17} /> {text.contactAction}</button>
            <div className="detail-note">{locale === "cn" ? "价格为人民币，具体规格以当前选中的 SKU 为准。" : "Prices are shown in CNY. The selected SKU determines the current specification."}</div>
          </section>
          <section className="gallery" aria-label="Product images">
            <div className="gallery-main">
              <img src={image} alt={localized(sku.name, locale)} />
              <button className="icon-button gallery-zoom" type="button" aria-label="View image" title="View image" onClick={() => setLightboxOpen(true)}><ZoomIn size={18} /></button>
              {sku.images.length > 1 && <><button className="icon-button gallery-arrow gallery-arrow-left" type="button" aria-label="Previous image" title="Previous image" onClick={() => shiftImage(-1)}><ChevronLeft size={18} /></button><button className="icon-button gallery-arrow gallery-arrow-right" type="button" aria-label="Next image" title="Next image" onClick={() => shiftImage(1)}><ChevronRight size={18} /></button></>}
            </div>
            <div className="thumbnail-row">{sku.images.map((item, index) => <button className={`thumbnail ${index === imageIndex ? "is-active" : ""}`} type="button" key={item} onClick={() => setImageIndex(index)}><img src={item} alt="" /></button>)}</div>
          </section>
        </div>
      </main>
      <SiteFooter locale={locale} />
      {contactOpen && <ContactModal locale={locale} onClose={() => setContactOpen(false)} />}
      {lightboxOpen && <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setLightboxOpen(false)}><button className="icon-button lightbox-close" type="button" aria-label={text.close} title={text.close} onClick={() => setLightboxOpen(false)}>×</button><img src={image} alt={localized(sku.name, locale)} onClick={(event) => event.stopPropagation()} /></div>}
    </div>
  );
}
