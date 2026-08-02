"use client";

import { CalendlyInlineEmbed } from "@/components/calendly-inline-embed";
import {
  applicationUtmContent,
  buildCalendlySchedulingPageUrl,
} from "@/lib/calendly-scheduling";
import { useLocale } from "@/lib/i18n/locale-context";
import { useEffect, useMemo, useState } from "react";

import type { StudentApplicationSupportAdvisor } from "../_lib/student-application-support-dashboard-types";

function advisorInitials(firstName: string, lastName: string): string {
  const a = firstName.trim().charAt(0);
  const b = lastName.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}

function AdvisorCalendlyModal({
  open,
  onClose,
  url,
  title,
  prefill,
  closeAria,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  prefill: { name: string; email: string };
  closeAria: string;
}) {
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
        aria-labelledby="app-support-calendly-title"
        className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-[14px] bg-white shadow-[-12px_0_40px_rgba(20,40,30,0.25)] sm:rounded-[14px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-light)] px-4 py-3.5 sm:px-5">
          <h2
            id="app-support-calendly-title"
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

type Props = {
  advisor: StudentApplicationSupportAdvisor;
  applicationId: number;
  studentName: string;
  studentEmail: string;
};

export function StudentApplicationSupportAdvisorTab({
  advisor,
  applicationId,
  studentName,
  studentEmail,
}: Props) {
  const { dict } = useLocale();
  const ad = dict.student.applicationSupport.dashboard.advisor;
  const displayName = `${advisor.firstName} ${advisor.lastName}`.trim();
  const calendlySchedulingUrl = advisor.calendlySchedulingUrl?.trim() ?? "";
  const canBook = Boolean(calendlySchedulingUrl);
  const [calendlyOpen, setCalendlyOpen] = useState(false);

  const supportsLine = useMemo(() => {
    if (advisor.sessionFor) return advisor.sessionFor;
    if (advisor.specializationsLabel) {
      return ad.supportsAdmissions.replace("{regions}", advisor.specializationsLabel);
    }
    return null;
  }, [ad.supportsAdmissions, advisor.sessionFor, advisor.specializationsLabel]);

  const experienceLine = useMemo(() => {
    if (advisor.experienceYears == null || advisor.experienceYears <= 0) return null;
    return ad.experienceYears.replace("{count}", String(advisor.experienceYears));
  }, [ad.experienceYears, advisor.experienceYears]);

  const calendlyUrl = useMemo(() => {
    if (!canBook) return "";
    return buildCalendlySchedulingPageUrl({
      base: calendlySchedulingUrl,
      name: studentName.trim(),
      email: studentEmail.trim(),
      utmContent: applicationUtmContent(applicationId),
      ctxParts: [
        `Application support session with ${displayName}`,
        `Application ref: #${applicationId}`,
        `Advisor ID: ${advisor.id}`,
      ],
    });
  }, [
    advisor.id,
    applicationId,
    calendlySchedulingUrl,
    canBook,
    displayName,
    studentEmail,
    studentName,
  ]);

  const calendlyTitle = ad.calendlyTitle.replace("{name}", displayName);
  const hintName = advisor.firstName || displayName;

  return (
    <div className="animate-[my-apps-fade-in_0.2s_ease] min-w-0">
      {/* callout */}
      <div className="mb-[18px] flex items-start gap-[11px] rounded-[var(--radius)] border border-[var(--green-bg)] bg-[var(--green-pale)] px-[17px] py-[13px] text-[13px] leading-normal text-[var(--text-mid)]">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--green)] text-white">
          <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <p>
          <span className="font-semibold text-[var(--green-dark)]">{ad.hintBold}</span>{" "}
          {ad.hintBody.replace("{name}", hintName)}
        </p>
      </div>

      {/* card adv-wide */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white p-[22px] shadow-[0_1px_2px_rgba(20,40,30,0.03),0_8px_22px_-16px_rgba(20,40,30,0.14)]">
        {/* card-h */}
        <div className="mb-[18px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-[var(--green-bg)] text-[var(--green)]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2 className="font-[family-name:var(--font-dm-serif)] text-lg leading-none text-[var(--text)]">
              {ad.panelTitle}
            </h2>
          </div>
          <span className="inline-flex items-center gap-[5px] rounded-[50px] bg-[#E8F5EE] px-[11px] py-1 text-[11px] font-semibold leading-normal text-[#2D6A4F]">
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" aria-hidden />
            {ad.onlineNow}
          </span>
        </div>

        {/* adv-grid */}
        <div className="grid grid-cols-1 items-center gap-[18px] pt-1.5 max-[760px]:gap-[18px] min-[761px]:grid-cols-2 min-[761px]:gap-7">
          {/* adv-gleft */}
          <div className="min-w-0 min-[761px]:border-e min-[761px]:border-[var(--border-light)] min-[761px]:pe-7 max-[760px]:border-b max-[760px]:border-[var(--border-light)] max-[760px]:pb-[18px]">
            {/* adv-top */}
            <div className="mb-4 flex items-center gap-3.5">
              {advisor.avatarUrl ? (
                <img
                  src={advisor.avatarUrl}
                  alt=""
                  className="h-[58px] w-[58px] shrink-0 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2D6A4F] to-[#52B788] font-[family-name:var(--font-dm-serif)] text-[21px] font-semibold text-white">
                  {advisorInitials(advisor.firstName, advisor.lastName)}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-base font-bold text-[var(--text)]">{displayName}</div>
                {advisor.title ? (
                  <div className="text-[12.5px] font-medium text-[var(--green)]">{advisor.title}</div>
                ) : null}
              </div>
            </div>

            {/* adv-rows */}
            <div className="flex flex-col gap-2">
              {supportsLine ? (
                <div className="flex items-center gap-[9px] text-[12.5px] text-[var(--text-mid)]">
                  <svg className="h-3.5 w-3.5 shrink-0 text-[var(--text-hint)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15 15 0 010 20 15 15 0 010-20z" />
                  </svg>
                  <span>{supportsLine}</span>
                </div>
              ) : null}
              {advisor.languages ? (
                <div className="flex items-center gap-[9px] text-[12.5px] text-[var(--text-mid)]">
                  <svg className="h-3.5 w-3.5 shrink-0 text-[var(--text-hint)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" />
                  </svg>
                  <span>{advisor.languages}</span>
                </div>
              ) : null}
              {experienceLine ? (
                <div className="flex items-center gap-[9px] text-[12.5px] text-[var(--text-mid)]">
                  <svg className="h-3.5 w-3.5 shrink-0 text-[var(--text-hint)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>{experienceLine}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* adv-gright */}
          <div className="flex min-w-0 flex-col gap-4">
            {advisor.about ? (
              <div className="rounded-[var(--radius-sm)] border-s-[3px] border-[var(--green-light)] bg-[var(--sand)] px-3.5 py-3 text-[12.5px] leading-[1.6] text-[var(--text-light)]">
                {advisor.about}
              </div>
            ) : null}

            {canBook ? (
              <button
                type="button"
                onClick={() => setCalendlyOpen(true)}
                className="inline-flex max-w-[220px] items-center justify-center gap-[7px] rounded-[var(--radius-pill)] bg-[var(--green)] px-3.5 py-[11px] text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--green-dark)]"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                {ad.bookSession}
              </button>
            ) : (
              <p className="max-w-[220px] text-[12.5px] leading-[1.6] text-[var(--text-light)]">
                {ad.calendlyUnavailable.replace("{name}", displayName)}
              </p>
            )}
          </div>
        </div>
      </div>

      <AdvisorCalendlyModal
        open={calendlyOpen}
        onClose={() => setCalendlyOpen(false)}
        url={calendlyUrl}
        prefill={{ name: studentName.trim(), email: studentEmail.trim() }}
        title={calendlyTitle}
        closeAria={ad.modal.closeAria}
      />
    </div>
  );
}
