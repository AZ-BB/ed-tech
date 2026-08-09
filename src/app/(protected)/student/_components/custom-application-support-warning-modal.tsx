"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { useEffect } from "react";

type CustomApplicationSupportWarningModalProps = {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
};

export function CustomApplicationSupportWarningModal({
  open,
  onClose,
  onContinue,
}: CustomApplicationSupportWarningModalProps) {
  const { dict } = useLocale();
  const copy = dict.student.applicationSupport.customWarning;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(20,30,24,0.45)] p-6 backdrop-blur-[3px] max-[640px]:p-2.5"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-app-support-warning-title"
        aria-describedby="custom-app-support-warning-body"
        className="relative w-full max-w-[560px] rounded-[20px] bg-white px-8 pb-8 pt-9 shadow-[0_20px_60px_rgba(10,20,14,0.25)] max-[640px]:px-5 max-[640px]:pb-6 max-[640px]:pt-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.closeAria}
          className="absolute end-4 top-4 flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-[9px] border border-[var(--border-light)] bg-white text-[var(--text-light)] transition hover:border-[var(--border)] hover:bg-[var(--sand)] hover:text-[var(--text)]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-[13px] bg-[#FEF3E2]">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#B45309"
            strokeWidth="1.8"
            aria-hidden
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <span className="mb-2 inline-block text-[10.5px] font-bold uppercase tracking-[1.2px] text-[#B45309]">
          {copy.eyebrow}
        </span>
        <h2
          id="custom-app-support-warning-title"
          className="mb-2.5 font-[family-name:var(--font-dm-serif)] text-[26px] leading-tight text-[var(--text)] max-[640px]:text-[22px]"
        >
          {copy.title}
        </h2>
        <p
          id="custom-app-support-warning-body"
          className="mb-4 text-[13.5px] leading-relaxed text-[var(--text-mid)]"
        >
          {copy.body}
        </p>
        <p className="mb-6 rounded-xl bg-[var(--sand)] px-4 py-3 text-[12.5px] leading-relaxed text-[var(--text-mid)]">
          {copy.note}
        </p>

        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--text-mid)] transition hover:bg-[var(--sand)]"
          >
            {copy.cancel}
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex cursor-pointer items-center justify-center rounded-xl border-none bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--green-dark)]"
          >
            {copy.continue}
          </button>
        </div>
      </div>
    </div>
  );
}
