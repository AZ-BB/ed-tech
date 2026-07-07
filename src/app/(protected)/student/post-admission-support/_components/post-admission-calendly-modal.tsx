"use client";

import { CalendlyInlineEmbed } from "@/components/calendly-inline-embed";
import type { CalendlyPrefill } from "@/components/calendly-inline-embed";
import { useLocale } from "@/lib/i18n/locale-context";
import { format } from "date-fns";
import { useEffect } from "react";

type PostAdmissionCalendlyModalProps = {
  open: boolean;
  onClose: () => void;
  url: string;
  prefill: CalendlyPrefill;
  title: string;
  scheduledAt?: string | null;
};

function formatScheduledMeetingDate(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return format(date, "d MMM yyyy · h:mm a");
  } catch {
    return iso;
  }
}

export function PostAdmissionCalendlyModal({
  open,
  onClose,
  url,
  prefill,
  title,
  scheduledAt,
}: PostAdmissionCalendlyModalProps) {
  const { dict } = useLocale();
  const t = dict.student.postAdmission;

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
  }, [open, onClose]);

  if (!open) return null;

  const alreadyScheduledMessage = scheduledAt
    ? t.modal.alreadyScheduledMessage.replace(
        "{date}",
        formatScheduledMeetingDate(scheduledAt),
      )
    : null;

  return (
    <div
      className="pas-calendly-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pas-calendly-modal-title"
        className="pas-calendly-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pas-calendly-modal-header">
          <h2 id="pas-calendly-modal-title" className="pas-calendly-modal-title">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="pas-calendly-modal-close"
            aria-label={t.modal.closeAria}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="pas-calendly-modal-body">
          {scheduledAt ? (
            <div className="pas-calendly-modal-already-booked">
              <p className="pas-calendly-modal-already-booked-message">
                {alreadyScheduledMessage}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="pas-calendly-modal-already-booked-cta"
              >
                {t.modal.alreadyScheduledClose}
              </button>
            </div>
          ) : url ? (
            <CalendlyInlineEmbed
              url={url}
              prefill={prefill}
              title={title}
              className="pas-calendly-modal-embed"
            />
          ) : (
            <div className="pas-calendly-modal-loading">
              <p className="text-sm text-(--text-hint)">{t.modal.loading}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
