"use client";

import { useState } from "react";

type FaqItem = {
  q: string;
  a: string;
};

type LandingFaqProps = {
  label: string;
  title: string;
  items: readonly FaqItem[];
};

export function LandingFaq({ label, title, items }: LandingFaqProps) {
  const [open, setOpen] = useState<Record<number, boolean>>({});

  return (
    <section className="faq-section" id="faq">
      <div className="section-inner" style={{ textAlign: "center" }}>
        <div className="section-label">{label}</div>
        <div className="section-title serif" style={{ maxWidth: "100%", margin: "0 auto 0" }}>
          {title}
        </div>
      </div>
      <div className="faq-grid">
        {items.map((item, i) => (
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
