"use client";

import type { ReactNode } from "react";
import type { AmbassadorCatalogEntry } from "../_lib/ambassador-catalog";
import { CountryFlag } from "@/components/country-flag";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { useLocale } from "@/lib/i18n/locale-context";
import Link from "next/link";
import { ArrowForwardIcon } from "../../_components/directional-icons";

const AVATAR_PALETTE: { bg: string; fg: string }[] = [
  { bg: "#E8F3EC", fg: "#2F5D50" },
  { bg: "#EEF0F4", fg: "#3D4A5C" },
  { bg: "#F5F0E8", fg: "#6B5B3E" },
  { bg: "#E8EFF8", fg: "#3B5998" },
  { bg: "#F3E8EE", fg: "#7A3B5B" },
];

function initials(first: string, last: string): string {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}

function paletteForId(id: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 997;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]!;
}

function formatStudyYears(start: number | null, end: number | null): string {
  if (start != null && end != null) return `${start} – ${end}`;
  if (start != null) return String(start);
  if (end != null) return String(end);
  return "—";
}

function SectionIcon({ children }: { children: ReactNode }) {
  return (
    <span
      className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[var(--text-hint)]"
      aria-hidden
    >
      {children}
    </span>
  );
}

function ProfileSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-2.5 flex items-center gap-2">
        <SectionIcon>{icon}</SectionIcon>
        <h3 className="text-[13px] font-semibold text-[var(--text)]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

type Props = {
  ambassador: AmbassadorCatalogEntry;
  onClose: () => void;
};

export function AmbassadorProfileModal({ ambassador, onClose }: Props) {
  const { dict } = useLocale();
  const am = dict.student.ambassadors;
  const pal = paletteForId(ambassador.id);
  const ini = initials(ambassador.firstName, ambassador.lastName);
  const destName =
    getCountryNameByAlpha2(ambassador.destinationCode) ?? ambassador.destinationCode;
  const natName =
    getCountryNameByAlpha2(ambassador.nationalityCode) ?? ambassador.nationalityCode;
  const statusLabel = ambassador.isCurrentStudent ? am.currentStudent : am.graduate;
  const helps =
    ambassador.helps.length > 0 ? ambassador.helps : [...am.defaultHelps];
  const headerTags =
    ambassador.tags.length > 0
      ? ambassador.tags
      : [
          statusLabel,
          ambassador.destinationCode,
          ...(ambassador.major ? [ambassador.major] : []),
        ].filter(Boolean);

  const majorPart = ambassador.major?.trim();
  const yearPart =
    ambassador.graduationYear != null
      ? String(ambassador.graduationYear)
      : ambassador.startYear != null
        ? String(ambassador.startYear)
        : null;
  const statusWord = ambassador.isCurrentStudent ? am.student : am.graduate;
  const headlineSubtitle =
    majorPart && yearPart
      ? `${majorPart} ${statusWord} — ${yearPart}`
      : majorPart
        ? `${majorPart} ${statusWord}`
        : yearPart
          ? `${statusWord} — ${yearPart}`
          : statusWord;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/30 px-5 py-10"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ambassador-profile-name"
        className="relative mx-auto max-w-[600px] overflow-hidden rounded-[var(--radius-xl)] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-4 top-4 z-[5] flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-white transition hover:bg-[var(--sand)]"
          onClick={onClose}
          aria-label={am.close}
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

        <div className="rounded-t-[var(--radius-xl)] bg-[var(--green-pale)] px-7 pb-5 pt-7">
          <div className="flex gap-4 pr-8">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white text-xl font-bold shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              style={{ background: pal.bg, color: pal.fg }}
            >
              {ambassador.avatarUrl ? (
                <img src={ambassador.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                ini
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="ambassador-profile-name"
                className="bidi-ltr font-[family-name:var(--font-dm-serif)] text-[26px] leading-tight font-bold text-[var(--text)]"
                dir="ltr"
              >
                {ambassador.firstName} {ambassador.lastName}
              </h2>
              <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[var(--text-mid)]">
                <CountryFlag code={ambassador.destinationCode} size={18} />
                <span className="bidi-ltr truncate" dir="ltr">
                  {ambassador.displayUniversity}
                </span>
              </div>
              <p className="bidi-ltr mt-1 text-[13px] text-[var(--text-light)]" dir="ltr">
                {headlineSubtitle}
              </p>
            </div>
          </div>
          {headerTags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {headerTags.map((tag) => (
                <span
                  key={tag}
                  className="bidi-ltr rounded-[50px] border border-[var(--border-light)] bg-white px-3 py-1 text-[11px] font-medium text-[var(--text-mid)]"
                  dir="ltr"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="px-7 pt-6">
          {ambassador.about ? (
            <ProfileSection
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
                  <path d="M12 11v5" strokeLinecap="round" />
                </svg>
              }
              title={am.about}
            >
              <p className="bidi-ltr text-[13px] leading-relaxed text-[var(--text-mid)]" dir="ltr">
                {ambassador.about}
              </p>
            </ProfileSection>
          ) : null}

          <ProfileSection
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M6 12h12" strokeLinecap="round" />
              </svg>
            }
            title={am.nationality}
          >
            <p className="bidi-ltr text-[13px] text-[var(--text-mid)]" dir="ltr">
              {natName}
            </p>
          </ProfileSection>

          <ProfileSection
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 21s7-4.5 7-10a7 7 0 10-14 0c0 5.5 7 10 7 10z" strokeLinejoin="round" />
                <circle cx="12" cy="11" r="2.5" />
              </svg>
            }
            title={am.studyDestinationLabel}
          >
            <p className="bidi-ltr text-[13px] text-[var(--text-mid)]" dir="ltr">
              {destName}
            </p>
          </ProfileSection>

          <ProfileSection
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M22 10v6M2 10l10-6 10 6-10 6-10-6z" strokeLinejoin="round" />
                <path d="M6 12v5c0 1 2 2 6 2s6-1 6-2v-5" strokeLinejoin="round" />
              </svg>
            }
            title={am.academicBackground}
          >
            <dl className="mt-0.5 grid grid-cols-[5.75rem_1fr] items-baseline gap-x-5 gap-y-2">
              <dt className="text-[12px] text-[var(--text-light)]">{am.university}</dt>
              <dd className="bidi-ltr text-[13px] text-[var(--text)]" dir="ltr">
                {ambassador.displayUniversity}
              </dd>
              <dt className="text-[12px] text-[var(--text-light)]">{am.major}</dt>
              <dd className="bidi-ltr text-[13px] text-[var(--text)]" dir="ltr">
                {ambassador.major?.trim() || "—"}
              </dd>
              <dt className="text-[12px] text-[var(--text-light)]">{am.years}</dt>
              <dd className="text-[13px] text-[var(--text)]">
                {formatStudyYears(ambassador.startYear, ambassador.graduationYear)}
              </dd>
              <dt className="text-[12px] text-[var(--text-light)]">{am.statusLabel}</dt>
              <dd className="text-[13px] text-[var(--text)]">{statusLabel}</dd>
            </dl>
          </ProfileSection>

          <ProfileSection
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12.5l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title={am.whatICanHelp}
          >
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {helps.map((x) => (
                <li key={x} className="flex items-start gap-2 text-[12.5px] leading-snug text-[var(--text-mid)]">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--green)]" />
                  <span className="bidi-ltr" dir="ltr">
                    {x}
                  </span>
                </li>
              ))}
            </ul>
          </ProfileSection>
        </div>

        <div className="px-7 pb-7 pt-1 text-center">
          <Link
            href={`/student/ambassadors/${ambassador.id}/book`}
            className="inline-flex w-full max-w-[320px] items-center justify-center gap-2 rounded-[50px] bg-[var(--green)] px-7 py-3.5 text-[14px] font-semibold !text-white no-underline shadow-[0_2px_10px_rgba(45,106,79,0.2)] transition hover:bg-[var(--green-dark)] hover:!text-white sm:w-auto"
            onClick={onClose}
          >
            {am.bookCall}
            <ArrowForwardIcon size={16} strokeWidth={2} />
          </Link>
          <p className="mx-auto mt-3 max-w-[340px] text-[11px] leading-relaxed text-[var(--text-hint)]">
            {am.modalFooterNote}
          </p>
        </div>
      </div>
    </div>
  );
}
