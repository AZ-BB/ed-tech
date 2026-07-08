"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { ArrowForwardIcon } from "../../_components/directional-icons";

type Props = {
  onRequest: () => void;
};

export function InternshipRequestCta({ onRequest }: Props) {
  const { dict } = useLocale();
  const t = dict.student.internships;

  return (
    <div className="internship-req-cta">
      <div className="req-cta-icon">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#2D6A4F"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      </div>
      <div className="req-cta-text">
        <div className="req-cta-title">{t.requestCtaTitle}</div>
        <div className="req-cta-sub">{t.requestCtaSub}</div>
      </div>
      <button type="button" className="req-cta-btn" onClick={onRequest}>
        {t.requestCtaButton}
        <ArrowForwardIcon size={13} strokeWidth={2} />
      </button>
    </div>
  );
}
