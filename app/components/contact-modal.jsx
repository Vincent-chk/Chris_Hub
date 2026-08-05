"use client";

import { X } from "lucide-react";
import { copy } from "@/lib/i18n";

export default function ContactModal({ locale, onClose }) {
  const text = copy(locale);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-title">
        <button className="icon-button modal-close" type="button" aria-label={text.close} title={text.close} onClick={onClose}>
          <X size={18} />
        </button>
        <div className="modal-kicker">{text.contactAction}</div>
        <h2 id="contact-title">{text.contactTitle}</h2>
        <p>{text.contactBody}</p>
        <div className="contact-modal-grid">
          <div className="qr-placeholder" aria-label={text.wechatPlaceholder}>
            <span>WECHAT</span>
            <i />
          </div>
          <div className="contact-details">
            <span>{text.wechat}</span>
            <strong>ChrisHub_Cards</strong>
            <small>{text.wechatPlaceholder}</small>
          </div>
        </div>
      </section>
    </div>
  );
}
