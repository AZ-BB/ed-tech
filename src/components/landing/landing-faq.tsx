"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/locale-context";

export function LandingFaq() {
  const { dict } = useLocale();
  const h = dict.home;
  const [open, setOpen] = useState<Record<number, boolean>>({});

  return (
    <section className="faq-section" id="faq">
      <div className="section-inner" style={{ textAlign: "center" }}>
        <div className="section-label">{h.faqLabel}</div>
        <div className="section-title serif" style={{ maxWidth: "100%", margin: "0 auto 0" }}>
          {h.faqTitle}
        </div>
      </div>
      <div className="faq-grid">
        {h.faqItems.map((item, i) => (
          <div key={item.q} className={`faq-item${open[i] ? " open" : ""}`}>
            <button
              type="button"
              className="faq-q"
              onClick={() => setOpen((s) => ({ ...s, [i]: !s[i] }))}
            >
              {item.q}
              <span className="faq-chevron">&#9662;</span>
            </button>
            <div className="faq-a">
              <div className="faq-a-text">{item.a}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
