"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

export default function BannerCarousel({ locale, banners }) {
  const [active, setActive] = useState(0);
  const current = banners[active];

  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % banners.length), 5600);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  return (
    <div className="banner-shell" aria-label="Promotional banner">
      <picture>
        <source media="(max-width: 680px)" srcSet={current[`${locale}Mobile`] || current[locale]} />
        <img className="banner-image" src={current[locale]} alt="" />
      </picture>
      <div className="banner-controls">
        <button className="icon-button banner-arrow" type="button" aria-label="Previous banner" title="Previous banner" onClick={() => setActive((active - 1 + banners.length) % banners.length)}><ChevronLeft size={18} /></button>
        <div className="banner-dots" role="tablist" aria-label="Banner selection">
          {banners.map((banner, index) => <button key={banner.id} type="button" className={`banner-dot ${index === active ? "is-active" : ""}`} role="tab" aria-selected={index === active} aria-label={`Banner ${index + 1}`} onClick={() => setActive(index)} />)}
        </div>
        <button className="icon-button banner-arrow" type="button" aria-label="Next banner" title="Next banner" onClick={() => setActive((active + 1) % banners.length)}><ChevronRight size={18} /></button>
      </div>
    </div>
  );
}
