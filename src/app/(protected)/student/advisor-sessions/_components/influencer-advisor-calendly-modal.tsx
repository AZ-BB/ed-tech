"use client";

import { CalendlyInlineEmbed } from "@/components/calendly-inline-embed";
import { useEffect } from "react";

type Prefill = {
  name: string;
  email: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  closeAria: string;
  prefill: Prefill;
};

export function InfluencerAdvisorCalendlyModal({
  open,
  onClose,
  url,
  title,
  closeAria,
  prefill,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-[rgba(20,40,30,0.42)] p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="influencer-advisor-calendly-title"
        className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-[14px] bg-white shadow-[-12px_0_40px_rgba(20,40,30,0.25)] sm:rounded-[14px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-light)] px-4 py-3.5 sm:px-5">
          <h2
            id="influencer-advisor-calendly-title"
            className="min-w-0 font-[family-name:var(--font-dm-serif)] text-[15px] leading-snug text-[var(--text)] sm:text-base"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-mid)] transition hover:bg-[var(--cream)] hover:text-[var(--text)]"
            aria-label={closeAria}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {url ? (
            <CalendlyInlineEmbed
              url={url}
              prefill={prefill}
              title={title}
              className="min-h-[680px] w-full min-w-0 rounded-none border-0 bg-white sm:min-h-[720px]"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
