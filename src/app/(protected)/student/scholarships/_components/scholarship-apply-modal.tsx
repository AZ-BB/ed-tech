"use client";

import clsx from "clsx";
import { useEffect } from "react";
import type { Scholarship } from "./types";
import { applyModalTypeBadgeClass } from "./badge-styles";

type Props = {
  scholarship: Scholarship | null;
  open: boolean;
  onClose: () => void;
};

export function ScholarshipApplyModal({ scholarship: s, open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!s) return null;

  const natLocked = s.eligibleNationalities.length <= 3;

  const verified =
    s.linkStatus === "verified" && Boolean(s.applicationUrl?.trim());
  const uncertain =
    s.linkStatus === "uncertain" && Boolean(s.applicationUrl?.trim());
  const fallbackOnly =
    !verified && !uncertain && Boolean(s.fallbackUrl?.trim());

  return (
    <div
      className={clsx(
        "fixed inset-0 z-[300] items-center justify-center bg-black/40 p-5 transition-opacity",
        open ? "flex" : "pointer-events-none hidden opacity-0",
      )}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-[480px] overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[0_16px_56px_rgba(0,0,0,0.18)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-modal-title"
      >
        <div className="border-b border-[var(--border-light)] px-6 pb-4 pt-6">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="apply-modal-title"
                className="serif mb-1 pr-3 text-[17px] font-bold leading-snug text-[var(--text)]"
              >
                {s.name}
              </h2>
              <p className="mb-1.5 text-[12px] text-[var(--text-light)]">
                {s.provider}
              </p>
              <p className="flex items-center gap-1 text-[12px] text-[var(--text-mid)]">
                <span aria-hidden>{s.flag}</span> {s.country}
              </p>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border-light)] bg-[var(--sand)] transition-colors hover:bg-[var(--border-light)]"
              onClick={onClose}
              aria-label="Close"
            >
              <svg
                width="14"
                height="14"
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
          <div className="flex flex-wrap items-center gap-2">
            <span className={applyModalTypeBadgeClass(s.type)}>{s.type}</span>
            {natLocked ? (
              <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[#FFE0B2] bg-[#FAEEDA] px-2.5 py-1 text-[10px] font-semibold text-[#854F0B]">
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                {s.eligSummary}
              </span>
            ) : (
              <span className="text-[10px] text-[var(--text-light)]">
                {s.eligSummary}
              </span>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 pt-5">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-hint)]">
            Application source
          </div>
          <div className="mb-3 rounded-[var(--radius)] border border-[var(--border-light)] bg-[var(--sand)] p-4">
            <div className="mb-2.5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--green-bg)]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2D6A4F"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-[var(--text)]">
                  {verified || uncertain
                    ? s.applicationWebsiteName
                    : "Application link not available"}
                </div>
                <div className="text-[11px] text-[var(--text-light)]">
                  {verified || uncertain
                    ? s.applicationWebsiteDomain || "—"
                    : "No direct URL found"}
                </div>
              </div>
            </div>
            {(verified || uncertain) && s.applicationUrl ? (
              <a
                href={s.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2 block break-all text-[12px] font-medium text-[var(--green)] hover:opacity-70"
              >
                {s.applicationUrl.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              {verified ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--green)]">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2D6A4F"
                    strokeWidth="2.5"
                    aria-hidden
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Official source
                </span>
              ) : null}
              {verified ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--green)]">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2D6A4F"
                    strokeWidth="2.5"
                    aria-hidden
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Verified link
                </span>
              ) : null}
              {uncertain ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-[#E65100]">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#E65100"
                    strokeWidth="2.5"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  Link may be outdated
                </span>
              ) : null}
              {!verified && !uncertain ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-[#C0392B]">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#C0392B"
                    strokeWidth="2.5"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9l-6 6M9 9l6 6" />
                  </svg>
                  Link not available
                </span>
              ) : null}
            </div>
          </div>

          <p className="mb-4 px-0.5 text-[11px] leading-normal text-[var(--text-hint)]">
            {verified
              ? "You will be redirected to the official scholarship website to complete your application."
              : uncertain
                ? "This link points to an official domain but the specific page may have changed. Please verify."
                : fallbackOnly
                  ? "A direct application link could not be verified. You can visit the official website for more information."
                  : "No verified application link is available at this time."}
          </p>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              className="cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white px-5 py-2.5 text-[12px] font-medium text-[var(--text-mid)] transition-colors hover:border-[var(--green)] hover:bg-[var(--green-pale)] hover:text-[var(--green)]"
              onClick={onClose}
            >
              Close
            </button>
            {verified || uncertain ? (
              <a
                href={s.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--green)] px-6 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-[var(--green-dark)]"
              >
                <svg
                  width="14"
                  height="14"
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
                Go to official website
              </a>
            ) : fallbackOnly ? (
              <a
                href={s.fallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--green)] px-6 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-[var(--green-dark)]"
              >
                <svg
                  width="14"
                  height="14"
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
                Visit official website
              </a>
            ) : (
              <span className="cursor-not-allowed rounded-[var(--radius-pill)] bg-[var(--border)] px-6 py-2.5 text-[12px] font-semibold text-[var(--text-hint)] opacity-40">
                Link not available
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
