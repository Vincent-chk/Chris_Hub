"use client";

import { X } from "lucide-react";
import { copy } from "@/lib/i18n";

export default function ContactModal({ locale, contact, onClose }) {
  const text = copy(locale);
  const wechatId = contact?.wechatId?.trim() || "";
  const description = contact?.description?.trim() || text.contactBody;
  const qrUrl = contact?.qrUrl || null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-title">
        <button className="icon-button modal-close" type="button" aria-label={text.close} title={text.close} onClick={onClose}>
          <X size={18} />
        </button>
        <div className="modal-kicker">{text.contactAction}</div>
        <h2 id="contact-title">{text.contactTitle}</h2>
        <p>{description}</p>
        <div className="contact-modal-grid">
          {qrUrl ? (
            <img className="qr-image" src={qrUrl} alt={text.wechat} />
          ) : (
            <div className="qr-placeholder" aria-label={text.wechatPlaceholder}>
              <span>WECHAT</span>
              <i />
            </div>
          )}
          <div className="contact-details">
            <span>{text.wechat}</span>
            <strong>{wechatId || "—"}</strong>
            {!qrUrl && <small>{text.wechatPlaceholder}</small>}
          </div>
        </div>
      </section>
    </div>
  );
}
