"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import {
  FEATURE_TO_QUICK_ACTION_DICT_KEY,
  type StudentFeatureKey,
} from "@/lib/student-feature-access";
import { useEffect, useMemo } from "react";
import { StudentFunnelSubscribeButton } from "./student-funnel-subscribe-button";

type StudentSubscriptionModalProps = {
  open: boolean;
  onClose: () => void;
  featureKey?: StudentFeatureKey | null;
};

export function StudentSubscriptionModal({
  open,
  onClose,
  featureKey = null,
}: StudentSubscriptionModalProps) {
  const { dict } = useLocale();
  const copy = dict.student.subscription;
  const featureItems = dict.student.dashboard.disabledFeaturesModal.items;

  const featureCopy = useMemo(() => {
    if (!featureKey) return null;
    const dictKey = FEATURE_TO_QUICK_ACTION_DICT_KEY[featureKey];
    const item = featureItems[dictKey as keyof typeof featureItems];
    if (!item) return null;
    return item;
  }, [featureKey, featureItems]);

  const title = featureCopy
    ? copy.modalTitleForFeature.replace("{feature}", featureCopy.title)
    : copy.modalTitle;
  const body = featureCopy?.description ?? copy.modalBody;

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
        aria-labelledby="subscription-modal-title"
        aria-describedby="subscription-modal-body"
        className="relative max-h-[calc(100vh-48px)] w-full max-w-[760px] overflow-y-auto rounded-[20px] bg-white px-10 pb-8 pt-9 shadow-[0_20px_60px_rgba(10,20,14,0.25)] max-[640px]:max-h-[calc(100vh-20px)] max-[640px]:px-5 max-[640px]:pb-6 max-[640px]:pt-7"
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

        <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-[13px] bg-[var(--green-bg)]">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2D6A4F"
            strokeWidth="1.8"
            aria-hidden
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>

        <span className="mb-2 inline-block text-[10.5px] font-bold uppercase tracking-[1.2px] text-[var(--green)]">
          {copy.modalEyebrow}
        </span>
        <h2
          id="subscription-modal-title"
          className="mb-2.5 font-[family-name:var(--font-dm-serif)] text-[26px] leading-tight text-[var(--text)] max-[640px]:text-[22px]"
        >
          {title}
        </h2>
        <p
          id="subscription-modal-body"
          className="mb-[18px] max-w-[560px] text-[13.5px] leading-relaxed text-[var(--text-mid)]"
        >
          {body}
        </p>

        <ul className="mb-[22px] flex list-none flex-col gap-2.5 p-0">
          {copy.modalBenefits.map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-2.5 text-[13px] leading-snug text-[var(--text-mid)]"
            >
              <span className="mt-px flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)]">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2D6A4F"
                  strokeWidth="3"
                  aria-hidden
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              {benefit}
            </li>
          ))}
        </ul>

        <div className="mb-2.5 text-[13px] font-semibold text-[var(--text)]">
          {copy.modalVideoHeading}
        </div>
        {/*
          Video embed placeholder — replace with YouTube/Vimeo/Wistia iframe
          or <video controls> when URLs are available.
        */}
        <div
          className="relative mb-6 flex aspect-video w-full cursor-default flex-col items-center justify-center gap-3.5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1B4332] to-[#2b5844]"
          role="img"
          aria-label={copy.modalVideoAria}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-[0_6px_20px_rgba(0,0,0,0.25)]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="#1B4332"
              aria-hidden
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <p className="max-w-[360px] px-5 text-center text-[12.5px] leading-snug text-white/85">
            {copy.modalVideoText}
          </p>
        </div>

        <StudentFunnelSubscribeButton
          className="w-full"
          label={copy.modalCta}
          buttonClassName="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-[var(--green)] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--green-dark)] hover:shadow-[0_6px_18px_rgba(27,67,50,0.22)] disabled:cursor-not-allowed disabled:opacity-55 font-[family-name:var(--font-dm-sans)]"
        />
        <button
          type="button"
          onClick={onClose}
          className="mt-3 block w-full cursor-pointer border-none bg-transparent p-2 text-center text-[12.5px] font-semibold text-[var(--text-light)] transition hover:text-[var(--green-dark)] hover:underline"
        >
          {copy.maybeLater}
        </button>
        <p className="mt-2.5 text-center text-[11px] text-[var(--text-hint)]">
          {copy.modalReassure}
        </p>
      </div>
    </div>
  );
}
