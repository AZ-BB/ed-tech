"use client";

import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import type { Scholarship } from "./types";
import { cardBadgeClass, competitionColor } from "./badge-styles";

const TAB_IDS = [
  { id: "d-overview", label: "Overview" },
  { id: "d-eligibility", label: "Eligibility" },
  { id: "d-application", label: "Application" },
  { id: "d-coverage", label: "Coverage" },
] as const;

type Props = {
  scholarship: Scholarship | null;
  open: boolean;
  onClose: () => void;
  onApplyNow: () => void;
};

export function ScholarshipDetailPanel({
  scholarship: s,
  open,
  onClose,
  onApplyNow,
}: Props) {
  const [activeTab, setActiveTab] = useState<(typeof TAB_IDS)[number]["id"]>(
    "d-overview",
  );

  useEffect(() => {
    if (open) setActiveTab("d-overview");
  }, [open, s?.id]);

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

  const scrollToSection = useCallback((id: (typeof TAB_IDS)[number]["id"]) => {
    setActiveTab(id);
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  if (!s) return null;

  const natLocked = s.eligibleNationalities.length <= 3;

  return (
    <div
      className={clsx(
        "fixed inset-0 z-[100] overflow-y-auto bg-black/30 px-5 py-10 transition-opacity",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0 invisible",
      )}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={clsx(
          "mx-auto max-w-[920px] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--sand)] shadow-[0_8px_40px_rgba(0,0,0,0.12)] transition-transform",
          open ? "translate-y-0" : "translate-y-3",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sch-detail-title"
      >
        <div className="relative h-[170px] overflow-visible rounded-t-[var(--radius-lg)] bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#52B788]">
          <div
            className="pointer-events-none absolute inset-0 rounded-t-[var(--radius-lg)] opacity-[0.04]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <button
            type="button"
            className="absolute right-3.5 top-3.5 z-[5] flex h-[34px] w-[34px] items-center justify-center rounded-full border-0 bg-white/90 transition-colors hover:bg-white"
            onClick={onClose}
            aria-label="Close details"
          >
            <svg
              width="16"
              height="16"
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
          <div className="absolute right-14 top-3.5 z-[5] flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-white/90 px-3.5 py-1.5 text-[11px] font-semibold text-[var(--green)]">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span>Deadline: {s.deadline}</span>
          </div>
          <div className="absolute -bottom-6 left-7 z-[3] flex h-14 w-14 items-center justify-center rounded-[14px] border-[3px] border-white bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[11px] bg-[var(--green-bg)]">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D6A4F"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white px-7 pb-4 pt-8">
          <h2
            id="sch-detail-title"
            className="serif mb-1 text-[22px] font-bold leading-tight text-[var(--text)]"
          >
            {s.name}
          </h2>
          <div className="mb-2.5 flex items-center gap-1.5 text-[14px] text-[var(--text-light)]">
            <span className="text-base" aria-hidden>
              {s.flag}
            </span>
            {s.country}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={clsx(cardBadgeClass(s.badgeClass), "text-[11px]")}>
              {s.type}
            </span>
            {natLocked ? <NationalityLockBadge label={s.eligSummary} /> : null}
          </div>
        </div>

        <div className="sticky top-0 z-[5] flex flex-wrap gap-0 border-b border-[var(--border-light)] bg-white px-7">
          {TAB_IDS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => scrollToSection(tab.id)}
              className={clsx(
                "inline-block cursor-pointer border-b-2 border-transparent px-[18px] py-3 text-[13px] font-medium transition-colors",
                activeTab === tab.id
                  ? "border-[var(--green)] font-medium text-[var(--green-dark)]"
                  : "text-[var(--text-light)] hover:text-[var(--text-mid)]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 p-5 max-[700px]:flex-col lg:flex-row lg:gap-4 lg:p-5">
          <div className="min-w-0 flex-1 space-y-3.5">
            <DetailCard id="d-overview" title="Overview" icon={<InfoIcon />}>
              <p className="mb-1 text-[13.5px] leading-relaxed text-[var(--text-mid)]">
                {s.shortSummary}
              </p>
              <DetailRow label="Target students" value={s.eligSummary} />
              <DetailRow
                label="Destination"
                value={s.destinations.join(", ")}
              />
              <DetailRow label="Level" value={s.degreeLevels} />
              <DetailRow label="Fields" value={s.fieldsOfStudy} />
            </DetailCard>

            <DetailCard id="d-eligibility" title="Eligibility" icon={<UserIcon />}>
              <DetailRow
                label="Nationality"
                value={
                  natLocked ? (
                    <NationalityLockBadge label={s.eligSummary} />
                  ) : (
                    s.eligSummary
                  )
                }
              />
              <DetailRow label="Academic" value={s.academicElig} />
              <DetailRow label="English" value={s.englishReq} />
              <DetailRow label="Other" value={s.otherElig} />
            </DetailCard>

            <DetailCard
              id="d-application"
              title="Application info"
              icon={<CalendarIcon />}
            >
              <DetailRow
                label="Deadline"
                value={
                  <span className="font-semibold text-[var(--green)]">
                    {s.deadline}
                  </span>
                }
              />
              <DetailRow label="Method" value={s.applicationMethod} />
              <DetailRow label="Competition" value={s.competition} />
              <div className="mt-3.5">
                <div className="mb-2 text-[13px] font-semibold">
                  Documents required
                </div>
                <ul className="flex list-none flex-col gap-1.5">
                  {s.requiredDocs.map((d) => (
                    <li
                      key={d}
                      className="flex items-start gap-2 text-[13px] text-[var(--text-mid)]"
                    >
                      <span
                        className="mt-1.5 inline-block h-[5px] w-[5px] shrink-0 rounded-full bg-[var(--green-light)]"
                        aria-hidden
                      />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </DetailCard>

            <DetailCard id="d-coverage" title="What's covered" icon={<MoneyIcon />}>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 max-[700px]:grid-cols-1">
                <CovItem label="Tuition" value={s.coverageDetails.tuition} highlight />
                <CovItem
                  label="Living stipend"
                  value={s.coverageDetails.stipend}
                  highlight={s.coverageDetails.stipend !== "Not specified"}
                />
                <CovItem
                  label="Travel"
                  value={s.coverageDetails.travel}
                  highlight={
                    s.coverageDetails.travel !== "Not specified" &&
                    s.coverageDetails.travel !== "Not applicable"
                  }
                />
                <CovItem
                  label="Other benefits"
                  value={s.coverageDetails.other}
                  highlight={false}
                />
              </div>
              <div className="mt-3.5 rounded-[var(--radius-sm)] border-l-[3px] border-[var(--green-light)] bg-[var(--green-pale)] px-4 py-3 text-[12.5px] leading-normal text-[var(--text-mid)]">
                {s.importantNotes}
              </div>
            </DetailCard>
          </div>

          <aside className="w-full shrink-0 lg:w-[220px]">
            <div className="sticky top-5 rounded-[var(--radius)] border border-[var(--border-light)] bg-white p-5">
              <div className="mb-3.5 text-[14px] font-semibold">Your actions</div>
              <SideBtn icon={<HeartIcon />}>Save scholarship</SideBtn>
              <SideBtn icon={<StarIcon />}>Add to shortlist</SideBtn>
              <SideBtn primary icon={<ExternalIcon />} onClick={onApplyNow}>
                Apply now
              </SideBtn>
              <SideBtn icon={<UserCircleIcon />}>Book advisor</SideBtn>
              <div className="my-3.5 border-t border-[var(--border-light)]" />
              <div className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-hint)]">
                Quick info
              </div>
              <SideStat label="Coverage" value={s.coverageLabel} valueClass="text-[var(--green)]" />
              <SideStat
                label="Competition"
                value={s.competition}
                valueStyle={{ color: competitionColor(s.competition) }}
              />
              <SideStat label="Level" value={s.degreeLevels} />
              <SideStat
                label="Renewable"
                value={s.renewable}
                valueClass="text-[var(--green)]"
              />
              <div className="my-3.5 border-t border-[var(--border-light)]" />
              <div className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-hint)]">
                Application status
              </div>
              <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-light)] bg-[var(--sand)] px-3.5 py-2.5">
                <div className="h-2 w-2 shrink-0 rounded-full bg-[#E65100]" />
                <span className="text-[12px] font-medium text-[var(--text-mid)]">
                  Not started
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function NationalityLockBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-xl bg-[#FAEEDA] px-2.5 py-0.5 text-[10px] font-semibold text-[#854F0B]">
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden
      >
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
      {label}
    </span>
  );
}

function DetailCard({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className="scroll-mt-4 rounded-[var(--radius)] border border-[var(--border-light)] bg-white px-[22px] py-5"
    >
      <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-[var(--text)]">
        <span className="opacity-40">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 border-b border-[var(--border-light)] py-1.5 text-[13px] last:border-b-0">
      <span className="min-w-[110px] shrink-0 font-medium text-[var(--text-light)]">
        {label}
      </span>
      <span className="font-medium text-[var(--text)]">{value}</span>
    </div>
  );
}

function CovItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border-light)] bg-[var(--sand)] px-3.5 py-3">
      <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-hint)]">
        {label}
      </div>
      <div
        className={clsx(
          "text-[14px] font-semibold text-[var(--text)]",
          highlight && "text-[var(--green)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function SideBtn({
  children,
  icon,
  primary,
  onClick,
}: {
  children: ReactNode;
  icon: React.ReactNode;
  primary?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "mb-2 flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] border px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors",
        primary
          ? "border-[var(--green)] bg-[var(--green)] font-semibold text-white hover:bg-[var(--green-dark)]"
          : "border-[var(--border)] bg-white text-[var(--text)] hover:border-[var(--text-hint)] hover:bg-[var(--sand)]",
      )}
    >
      <span className="shrink-0 [&_svg]:block">{icon}</span>
      {children}
    </button>
  );
}

function SideStat({
  label,
  value,
  valueClass,
  valueStyle,
}: {
  label: string;
  value: string;
  valueClass?: string;
  valueStyle?: CSSProperties;
}) {
  return (
    <div className="flex justify-between py-1 text-[12px]">
      <span className="text-[var(--text-light)]">{label}</span>
      <span className={clsx("font-semibold", valueClass)} style={valueStyle}>
        {value}
      </span>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6M23 11h-6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function MoneyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 2l2.4 7.4H22l-6 4.6L18.3 21 12 16.4 5.7 21l2.3-7L2 9.4h7.6z" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
    </svg>
  );
}

function UserCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
