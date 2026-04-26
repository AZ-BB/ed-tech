"use client";

import { useState } from "react";

const ITEMS: { q: string; a: string }[] = [
  {
    q: "What is this platform and how does it work?",
    a: "We guide you through the entire university journey — from discovering universities to preparing your application and submitting it — all in one place.",
  },
  {
    q: "Who is this platform for?",
    a: "This platform is designed for students across the Middle East who are planning to apply to universities locally or abroad.",
  },
  {
    q: "Do I need SAT, IELTS, or ACT to apply?",
    a: "It depends on the universities you are applying to. We help you understand exactly what each university requires and guide you on how to prepare.",
  },
  {
    q: "How does the AI university matching work?",
    a: "You answer a few questions about your grades, interests, and goals, and our system recommends universities that best match your profile.",
  },
  {
    q: "Can I speak to someone who studied at my target university?",
    a: "Yes — you can connect with student ambassadors and book 1:1 sessions to learn from their experience.",
  },
  {
    q: 'What is the "Apply for Me" service?',
    a: "You tell us which universities you want to apply to, provide your documents, and we handle the application process on your behalf.",
  },
  {
    q: "Can I use the platform through my school?",
    a: "Yes — if your school is partnered with us, you will receive login details and access without needing to purchase individually.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes — you can cancel your subscription at any time based on our cancellation policy.",
  },
];

export function LandingFaq() {
  const [open, setOpen] = useState<Record<number, boolean>>({});

  return (
    <section className="faq-section" id="faq">
      <div className="section-inner" style={{ textAlign: "center" }}>
        <div className="section-label">FAQ</div>
        <div
          className="section-title serif"
          style={{ maxWidth: "100%", margin: "0 auto 0" }}
        >
          Frequently asked questions
        </div>
      </div>
      <div className="faq-grid">
        {ITEMS.map((item, i) => (
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
