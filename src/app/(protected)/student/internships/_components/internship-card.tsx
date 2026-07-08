"use client";

import clsx from "clsx";
import { useLocale } from "@/lib/i18n/locale-context";
import { ArrowForwardIcon } from "../../_components/directional-icons";
import type { Internship } from "./types";

type Props = {
  internship: Internship;
  onOpenDetail: () => void;
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

export function InternshipCard({ internship: it, onOpenDetail }: Props) {
  const { dict } = useLocale();
  const t = dict.student.internships;

  const payBadgeClass =
    it.payTier === "paid"
      ? "pay-paid"
      : it.payTier === "free"
        ? "pay-free"
        : "pay-unpaid";

  const payValClass =
    it.payTier === "paid" ? "green" : it.payTier === "free" ? "" : "orange";

  return (
    <div
      role="button"
      tabIndex={0}
      className="internship-card internship-card-ltr"
      dir="ltr"
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail();
        }
      }}
    >
      <div className="s-top">
        <div className="s-logo" style={{ background: it.logoColor }}>
          <span>{it.initials}</span>
        </div>
        <div className="s-head">
          <div className="s-name">{it.name}</div>
          <div className="s-provider">{it.provider}</div>
        </div>
        <span className={clsx("s-pay-badge", payBadgeClass)}>
          {it.payLabel}
        </span>
      </div>
      <div className="s-desc">{it.summary}</div>
      <div className="s-info-row">
        <div className="s-info">
          <div className="s-info-label">{t.duration}</div>
          <div className="s-info-val">{it.duration}</div>
        </div>
        <div className="s-info">
          <div className="s-info-label">{t.format}</div>
          <div className="s-info-val">{formatLabel(it.format, t)}</div>
        </div>
        <div className="s-info">
          <div className="s-info-label">{t.pay}</div>
          <div className={clsx("s-info-val", payValClass)}>{it.payLabel}</div>
        </div>
      </div>
      <div className="s-actions">
        <div className="s-region-tag">
          <span className="s-flag" aria-hidden>
            {it.flag}
          </span>
          {it.locationLabel}
        </div>
        <button
          type="button"
          className="s-cta"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail();
          }}
        >
          {t.view}
          <ArrowForwardIcon size={13} />
        </button>
      </div>
      {it.nationalsOnly ? (
        <div className="nat-lock">
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
          {t.restrictedEligibility}
        </div>
      ) : null}
    </div>
  );
}
