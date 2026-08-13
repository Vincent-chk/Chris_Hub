"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { copy } from "@/lib/i18n";
import ContactModal from "@/app/components/contact-modal";

export default function ContactSection({ locale, contact }) {
  const [open, setOpen] = useState(false);
  const text = copy(locale);
  return (
    <section className="contact-section section-pad" id="contact">
      <div className="contact-section-inner">
        <div><div className="section-label">03 <span>{text.navContact}</span></div><h2>{text.contactTitle}</h2><p>{text.contactBody}</p></div>
        <button className="primary-button" type="button" onClick={() => setOpen(true)}><MessageCircle size={17} /> {text.contactAction}</button>
      </div>
      {open && <ContactModal locale={locale} contact={contact} onClose={() => setOpen(false)} />}
    </section>
  );
}
