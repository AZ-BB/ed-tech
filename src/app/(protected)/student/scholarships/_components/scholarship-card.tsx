"use client";

import clsx from "clsx";
import { useLocale } from "@/lib/i18n/locale-context";
import { ArrowForwardIcon } from "../../_components/directional-icons";
import type { Scholarship } from "./types";
import { cardBadgeClass } from "./badge-styles";

type Props = {
  scholarship: Scholarship;
  onOpenDetail: () => void;
  saved: boolean;
  onToggleSave: () => void | Promise<void>;
};

export function ScholarshipCard({
  scholarship: s,
  onOpenDetail,
  saved,
  onToggleSave,
}: Props) {
  const { dict } = useLocale();
  const t = dict.student.scholarships;
  const covClass =
    s.coverage === "full"
      ? "text-[var(--green)]"
      : "text-[#E65100]";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail();
        }
      }}
      className="scholarship-card-ltr relative w-full min-w-0 max-w-full cursor-pointer rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white p-4 text-left transition-all hover:border-[var(--border)] hover:shadow-[0_3px_12px_rgba(0,0,0,0.04)] sm:p-5 sm:px-[22px]"
      dir="ltr"
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 text-[14px] font-semibold leading-snug text-[var(--text)] break-words">
          {s.name}
        </div>
        <span className={clsx(cardBadgeClass(s.badgeClass), "shrink-0")}>{s.type}</span>
      </div>
      <div className="mb-2.5 flex items-center gap-1.5 text-[12px] text-[var(--text-light)]">
        <span
          className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-[var(--border-light)] bg-[var(--sand)] text-[11px]"
          aria-hidden
        >
          {s.flag}
        </span>
        {s.country}
      </div>
      <p className="mb-3.5 line-clamp-2 text-[12.5px] leading-normal text-[var(--text-mid)]">
        {s.shortSummary}
      </p>
      <div className="mb-3.5 flex min-w-0 border-y border-[var(--border-light)]">
        <div className="min-w-0 flex-1 border-r border-[var(--border-light)] px-1 py-2.5 text-center last:border-r-0">
          <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-hint)]">
            {t.coverage}
          </div>
          <div className={clsx("text-[11px] font-semibold leading-snug text-[var(--text)] break-words sm:text-[12px]", covClass)}>
            {s.coverageLabel}
          </div>
        </div>
        <div className="min-w-0 flex-1 border-r border-[var(--border-light)] px-1 py-2.5 text-center last:border-r-0">
          <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-hint)]">
            {t.deadline}
          </div>
          <div className="text-[11px] font-semibold leading-snug text-[var(--text)] break-words sm:text-[12px]">
            {s.deadline}
          </div>
        </div>
        <div className="min-w-0 flex-1 px-1 py-2.5 text-center">
          <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-hint)]">
            {t.eligibility}
          </div>
          <div className="line-clamp-2 text-[11px] font-semibold leading-snug text-[var(--text)] sm:text-[12px]">
            {s.eligSummary}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="flex cursor-pointer h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-white transition-colors hover:border-[var(--green-bg)] hover:bg-[var(--green-bg)]"
          aria-label={saved ? t.removeFromSaved : t.saveScholarship}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave();
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={saved ? "currentColor" : "none"}
            className={saved ? "text-[var(--green)]" : "stroke-[#7a7a7a]"}
            strokeWidth="1.8"
            aria-hidden
          >
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>
        <span className="inline-flex w-full min-w-0 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--green)] px-4 py-2 text-[12px] font-semibold text-white sm:w-auto sm:px-[18px]">
          {t.viewDetails}
          <ArrowForwardIcon size={12} />
        </span>
      </div>
    </div>
  );
}
