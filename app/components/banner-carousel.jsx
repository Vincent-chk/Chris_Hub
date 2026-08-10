"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

const INTERVAL_MS = 3000;
const MOBILE_QUERY = "(max-width: 680px)";

export default function BannerCarousel({ banners }) {
  const [isMobile, setIsMobile] = useState(false);
  const [active, setActive] = useState(0);
  const list = isMobile ? banners.mobile : banners.desktop;
  const count = list.length;

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setActive(0);
  }, [isMobile]);

  useEffect(() => {
    if (count <= 1) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [count]);

  if (!count) return null;

  return (
    <div className="banner-shell" aria-label="Promotional banner">
      <div className="banner-stack">
        {list.map((url, index) => (
          <img
            key={`${url}-${index}`}
            className={`banner-image${index === active ? " is-active" : ""}`}
            src={url}
            alt=""
            aria-hidden={index !== active}
          />
        ))}
      </div>
      <div className="banner-controls">
        <button className="icon-button banner-arrow" type="button" aria-label="Previous banner" title="Previous banner" onClick={() => setActive((active - 1 + count) % count)}><ChevronLeft size={18} /></button>
        <div className="banner-dots" role="tablist" aria-label="Banner selection">
          {list.map((url, index) => <button key={url} type="button" className={`banner-dot ${index === active ? "is-active" : ""}`} role="tab" aria-selected={index === active} aria-label={`Banner ${index + 1}`} onClick={() => setActive(index)} />)}
        </div>
        <button className="icon-button banner-arrow" type="button" aria-label="Next banner" title="Next banner" onClick={() => setActive((active + 1) % count)}><ChevronRight size={18} /></button>
      </div>
    </div>
  );
}
