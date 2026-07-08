"use client";

import clsx from "clsx";
import { useEffect, useTransition } from "react";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Internship } from "./types";

type Props = {
  internship: Internship | null;
  open: boolean;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: () => void | Promise<void>;
};

function formatLabel(
  format: Internship["format"],
  t: {
    formatInPerson: string;
    formatRemote: string;
    formatHybrid: string;
    formatDirectory: string;
  },
): string {
  switch (format) {
    case "in_person":
      return t.formatInPerson;
    case "remote":
      return t.formatRemote;
    case "hybrid":
      return t.formatHybrid;
    case "directory":
      return t.formatDirectory;
    default:
      return format;
  }
}

export function InternshipDetailOverlay({
  internship: it,
  open,
  onClose,
  isSaved,
  onToggleSave,
}: Props) {
  const { dict } = useLocale();
  const t = dict.student.internships;
  const [isPending, startTransition] = useTransition();

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

  if (!it) return null;

  const isDirectory = it.format === "directory" || it.urlStatus === "directory";
  const payClass =
    it.payTier === "paid" ? "green" : it.payTier === "free" ? "blue" : "orange";
  const hasLink = Boolean(it.officialUrl && it.officialUrl !== "#");

  return (
    <div
      className={clsx("internship-detail-overlay", open && "show")}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="detail-page"
        role="dialog"
        aria-modal="true"
        aria-labelledby="internship-detail-title"
      >
        <div className="detail-banner">
          <div className="detail-banner-left">
            <div
              className="s-logo detail-banner-logo"
              style={{ background: it.logoColor }}
            >
              <span>{it.initials}</span>
            </div>
            <div className="detail-banner-text">
              <h2 id="internship-detail-title">{it.name}</h2>
              <div className="detail-banner-provider">{it.provider}</div>
            </div>
          </div>
          <button
            type="button"
            className="detail-close"
            onClick={onClose}
            aria-label={t.closeDetails}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="detail-layout">
          <div className="detail-content">
            <div className="d-card">
              <div className="d-title">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                {t.aboutTitle}
              </div>
              <div className="d-desc">{it.summary}</div>
            </div>
            {it.whatYoullDo.length > 0 ? (
              <div className="d-card">
                <div className="d-title">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden
                  >
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                  {t.whatYoullDo}
                </div>
                <ul className="d-list">
                  {it.whatYoullDo.map((line) => (
                    <li key={line}>
                      <span className="d-dot" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {it.whatYoullGain.length > 0 ? (
              <div className="d-card">
                <div className="d-title">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden
                  >
                    <circle cx="12" cy="8" r="6" />
                    <path d="M15.5 13.5L17 22l-5-3-5 3 1.5-8.5" />
                  </svg>
                  {t.whatYoullGain}
                </div>
                <ul className="d-list">
                  {it.whatYoullGain.map((line) => (
                    <li key={line}>
                      <span className="d-dot" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="d-card">
              <div className="d-title">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 0v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <path d="M20 8v6M23 11h-6" />
                </svg>
                {t.whoCanApply}
              </div>
              <div className="d-desc">{it.eligibility}</div>
              {it.nationalsOnly ? (
                <div className="nat-lock" style={{ marginTop: 10 }}>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    aria-hidden
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  {t.restrictedCheckEligibility}
                </div>
              ) : null}
            </div>
            <div className="d-card">
              <div className="d-title">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                {t.howToApply}
              </div>
              <div className="d-desc">{it.howToApply}</div>
            </div>
          </div>
          <div className="detail-sidebar">
            <div className="side-card">
              <div className="side-mini">{t.quickInfo}</div>
              <div className="side-stat">
                <span className="side-stat-l">{t.compensation}</span>
                <span className={clsx("side-stat-v", payClass)}>
                  {it.payLabel}
                </span>
              </div>
              <div className="side-stat">
                <span className="side-stat-l">{t.duration}</span>
                <span className="side-stat-v">{it.duration}</span>
              </div>
              <div className="side-stat">
                <span className="side-stat-l">{t.format}</span>
                <span className="side-stat-v">{formatLabel(it.format, t)}</span>
              </div>
              <div className="side-stat">
                <span className="side-stat-l">{t.field}</span>
                <span className="side-stat-v">{it.field}</span>
              </div>
              <div className="side-stat">
                <span className="side-stat-l">{t.location}</span>
                <span className="side-stat-v">{it.locationLabel}</span>
              </div>
              <div className="side-divider" />
              {hasLink ? (
                <a
                  href={it.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="act-btn-link"
                >
                  <div className="act-btn primary">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <path d="M15 3h6v6" />
                      <path d="M10 14L21 3" />
                    </svg>
                    <span>
                      {isDirectory
                        ? t.searchThisDirectory
                        : t.officialApplicationPage}
                    </span>
                  </div>
                </a>
              ) : null}
              <button
                type="button"
                className="act-btn"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await onToggleSave();
                  });
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={isSaved ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
                </svg>
                {isSaved ? t.saved : t.saveInternship}
              </button>
              {it.phone ? (
                <div className="side-phone">
                  <div className="side-phone-label">
                    {t.applicantSupportLine}
                  </div>
                  <a href={`tel:${it.phone.replace(/\s/g, "")}`}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />
                    </svg>
                    {it.phone}
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
