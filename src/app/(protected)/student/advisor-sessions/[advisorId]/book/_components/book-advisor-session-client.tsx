"use client";

import { createAdvisorSessionBooking, recordAdvisorSessionCalendlyBooking } from "@/actions/advisor-sessions";
import { CalendlyInlineEmbed } from "@/components/calendly-inline-embed";
import { COUNTRIES } from "@/lib/countries";
import { advisorSessionUtmContent, buildCalendlySchedulingPageUrl } from "@/lib/calendly-scheduling";
import type { StudentFormDefaults } from "@/lib/load-student-form-defaults";
import { useLocale } from "@/lib/i18n/locale-context";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowBackIcon, ArrowForwardIcon } from "../../../../_components/directional-icons";

const STAGE_VALUES = [
  "",
  "Just exploring",
  "Shortlisting universities",
  "Preparing application",
  "Ready to apply",
] as const;

const inputClass =
  "box-border w-full min-w-0 max-w-full rounded-[10px] border-[1.5px] border-[var(--border)] bg-white px-4 py-3 font-[family-name:var(--font-dm-sans)] text-sm text-[var(--text)] transition placeholder:text-[#c0bdb8] focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.08)] focus:outline-none";

const selectClass = `${inputClass} cursor-pointer appearance-none bg-[length:10px_6px] bg-[position:right_12px_center] bg-no-repeat pr-8`;

const formCardClass =
  "min-w-0 overflow-x-clip rounded-[var(--radius-xl)] border border-[#EEF2EF] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:p-6 md:p-8";

const formGridClass = "grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2";

const pageTitleClass =
  "font-[family-name:var(--font-dm-serif)] text-[22px] tracking-tight text-[var(--text)] break-words sm:text-[26px] md:text-[28px]";

type AdvisorBrief = {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
};

type Props = {
  advisor: AdvisorBrief;
  calendlySchedulingUrl: string | null;
  profileDefaults?: StudentFormDefaults;
};

export function BookAdvisorSessionClient({
  advisor,
  calendlySchedulingUrl,
  profileDefaults,
}: Props) {
  const { dict } = useLocale();
  const bt = dict.student.advisors.book;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(profileDefaults?.fullName ?? "");
  const [email, setEmail] = useState(profileDefaults?.email ?? "");
  const [phone, setPhone] = useState(profileDefaults?.phone ?? "");
  const [destinationAlpha2, setDestinationAlpha2] = useState(
    profileDefaults?.destinationCountryCode ?? "",
  );
  const [stage, setStage] = useState("");
  const [specificUnis, setSpecificUnis] = useState("");
  const [helpWith, setHelpWith] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [calendlyBookingSaved, setCalendlyBookingSaved] = useState(false);

  const displayName = `${advisor.firstName} ${advisor.lastName}`;
  const hasCalendly = Boolean(calendlySchedulingUrl?.trim());

  const stageLabels: Record<string, string> = useMemo(
    () => ({
      "Just exploring": bt.stages.exploring,
      "Shortlisting universities": bt.stages.shortlisting,
      "Preparing application": bt.stages.preparing,
      "Ready to apply": bt.stages.ready,
    }),
    [bt],
  );

  const calendlyPageUrl = useMemo(() => {
    if (!hasCalendly || sessionId == null || !calendlySchedulingUrl?.trim()) return "";
    const destinationLabel = destinationAlpha2
      ? (COUNTRIES.find((c) => c.alpha2 === destinationAlpha2)?.name ?? destinationAlpha2)
      : "";
    return buildCalendlySchedulingPageUrl({
      base: calendlySchedulingUrl,
      name: fullName.trim(),
      email: email.trim(),
      utmContent: advisorSessionUtmContent(sessionId),
      ctxParts: [
        `Advisor session with ${displayName}`,
        `Advisor ID: ${advisor.id}`,
        `Session ID: ${sessionId}`,
        destinationLabel ? `Destination: ${destinationLabel}` : "",
        stage ? `Stage: ${stage}` : "",
        specificUnis.trim() ? `Universities: ${specificUnis.trim().slice(0, 120)}` : "",
        helpWith.trim() ? `Help: ${helpWith.trim().slice(0, 160)}` : "",
      ].filter(Boolean),
    });
  }, [
    advisor.id,
    calendlySchedulingUrl,
    destinationAlpha2,
    displayName,
    email,
    fullName,
    hasCalendly,
    helpWith,
    sessionId,
    specificUnis,
    stage,
  ]);

  useEffect(() => {
    if (step !== 3 || sessionId == null || calendlyBookingSaved) return;
    const activeSessionId = sessionId;

    function onCalendlyMessage(event: MessageEvent) {
      if (event.origin !== "https://calendly.com") return;
      const payload = event.data as {
        event?: string;
        payload?: { event?: { start_time?: string } };
      };
      if (payload?.event !== "calendly.event_scheduled") return;

      const startTime = payload.payload?.event?.start_time?.trim();
      if (!startTime) return;

      void recordAdvisorSessionCalendlyBooking(activeSessionId, startTime).then((result) => {
        if (result.ok) {
          setCalendlyBookingSaved(true);
        }
      });
    }

    window.addEventListener("message", onCalendlyMessage);
    return () => window.removeEventListener("message", onCalendlyMessage);
  }, [calendlyBookingSaved, sessionId, step]);

  const goConfirm = useCallback(() => {
    setError(null);
    if (!fullName.trim() || !email.trim()) {
      setError(bt.errors.nameEmail);
      return;
    }
    if (!phone.trim()) {
      setError(bt.errors.phone);
      return;
    }
    if (!destinationAlpha2) {
      setError(bt.errors.destination);
      return;
    }
    if (!stage) {
      setError(bt.errors.stage);
      return;
    }
    if (!helpWith.trim()) {
      setError(bt.errors.help);
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [bt.errors, destinationAlpha2, email, fullName, helpWith, phone, stage]);

  const submitBooking = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await createAdvisorSessionBooking({
        advisorId: advisor.id,
        studentName: fullName.trim(),
        studentEmail: email.trim(),
        studentPhone: phone.trim(),
        destinationCountryCode: destinationAlpha2,
        currentStage: stage,
        specificUniversities: specificUnis.trim(),
        helpWith: helpWith.trim(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSessionId(res.sessionId);
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  }, [advisor.id, destinationAlpha2, email, fullName, helpWith, phone, specificUnis, stage]);

  const selectChevron =
    "data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237a7a7a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E";

  return (
    <div className="-mx-6 min-h-[calc(100dvh-4rem)] bg-[linear-gradient(180deg,#F7FBF8_0%,var(--sand)_280px)] md:-mx-10 lg:-mx-16">
      <div className="relative mx-auto w-full min-w-0 max-w-[1120px] overflow-x-clip px-6 py-6 pb-16 md:px-10 md:py-8 lg:px-16">
        <Link
          href="/student/advisor-sessions"
          className="mb-5 inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-[50px] border-[1.5px] border-[var(--border)] bg-white px-4 py-2 text-[12px] font-medium text-[var(--text-mid)] no-underline transition hover:border-[var(--text-hint)] hover:-translate-x-0.5 sm:mb-7 sm:px-[18px] sm:text-[13px]"
        >
          <ArrowBackIcon size={16} />
          {bt.backToAdvisors}
        </Link>

        <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:gap-5">
          <div className="min-w-0 flex-1">
            {step === 1 ? (
              <>
                <h1 className={pageTitleClass}>
                  {bt.step1Title}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[#8a8a8a] break-words">
                  {bt.step1Subtitle.replace("{name}", displayName)}
                </p>
                <p className="mt-2 text-xs font-medium text-[var(--green)] break-words">{bt.step1Highlight}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {bt.badges.filter((label) => hasCalendly || !label.toLowerCase().includes("calendly")).map((label) => (
                    <div
                      key={label}
                      className="flex max-w-full min-w-0 items-center gap-1.5 rounded-[50px] border border-[#d5e8db] bg-[var(--green-pale)] px-3 py-1.5 text-[11px] font-medium text-[var(--green-dark)] sm:px-4 sm:py-2 sm:text-[11.5px]"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" className="shrink-0" aria-hidden>
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                        <path d="M22 4L12 14.01l-3-3" />
                      </svg>
                      <span className="min-w-0 break-words">{label}</span>
                    </div>
                  ))}
                </div>
                <div className={`mt-5 sm:mt-6 ${formCardClass}`}>
                  <div className={formGridClass}>
                    <div className="mb-4 min-w-0">
                      <label className="mb-2 block text-xs font-semibold text-[var(--text)]" htmlFor="bk-name">
                        {bt.fullName}
                      </label>
                      <input id="bk-name" className={inputClass} placeholder={bt.fullNamePlaceholder} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="mb-4 min-w-0">
                      <label className="mb-2 block text-xs font-semibold text-[var(--text)]" htmlFor="bk-email">
                        {bt.email}
                      </label>
                      <input
                        id="bk-email"
                        type="email"
                        className={inputClass}
                        placeholder={bt.emailPlaceholder}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mb-4 min-w-0">
                    <label className="mb-2 block text-xs font-semibold text-[var(--text)]" htmlFor="bk-phone">
                      {bt.phone} <span className="font-normal text-[var(--text-hint)]">{bt.phoneHint}</span>
                    </label>
                    <input id="bk-phone" className={inputClass} placeholder={bt.phonePlaceholder} value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className={formGridClass}>
                    <div className="mb-4 min-w-0">
                      <label className="mb-2 block text-xs font-semibold text-[var(--text)]" htmlFor="bk-dest">
                        {bt.destination}
                      </label>
                      <select
                        id="bk-dest"
                        className={selectClass}
                        style={{ backgroundImage: `url("${selectChevron}")` }}
                        value={destinationAlpha2}
                        onChange={(e) => setDestinationAlpha2(e.target.value)}
                      >
                        <option value="">{bt.destinationPlaceholder}</option>
                        {COUNTRIES.map((c) => (
                          <option key={c.alpha2} value={c.alpha2}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-4 min-w-0">
                      <label className="mb-2 block text-xs font-semibold text-[var(--text)]" htmlFor="bk-stage">
                        {bt.currentStage}
                      </label>
                      <select
                        id="bk-stage"
                        className={selectClass}
                        style={{ backgroundImage: `url("${selectChevron}")` }}
                        value={stage}
                        onChange={(e) => setStage(e.target.value)}
                      >
                        <option value="">{bt.stagePlaceholder}</option>
                        {STAGE_VALUES.filter(Boolean).map((s) => (
                          <option key={s} value={s}>
                            {stageLabels[s] ?? s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mb-4 min-w-0">
                    <label className="mb-2 block text-xs font-semibold text-[var(--text)]" htmlFor="bk-unis">
                      {bt.specificUnis}
                    </label>
                    <input
                      id="bk-unis"
                      className={inputClass}
                      placeholder={bt.specificUnisPlaceholder}
                      value={specificUnis}
                      onChange={(e) => setSpecificUnis(e.target.value)}
                    />
                  </div>
                  <div className="mb-4 min-w-0">
                    <label className="mb-2 block text-xs font-semibold text-[var(--text)]" htmlFor="bk-help">
                      {bt.helpWith}
                    </label>
                    <textarea
                      id="bk-help"
                      className={`${inputClass} min-h-[80px] resize-y`}
                      placeholder={bt.helpWithPlaceholder}
                      value={helpWith}
                      onChange={(e) => setHelpWith(e.target.value)}
                    />
                  </div>
                  {error ? (
                    <div className="mb-4 rounded-lg border border-[#f0c4c4] bg-[#FCEBEB] px-4 py-3 text-[13px] text-[#991b1b]" role="alert">
                      {error}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[50px] bg-[var(--green)] px-4 py-3.5 text-sm font-semibold !text-white shadow-[0_4px_14px_rgba(45,106,79,0.25)] transition hover:-translate-y-px hover:bg-[var(--green-dark)] hover:!text-white hover:shadow-[0_6px_20px_rgba(45,106,79,0.3)]"
                    onClick={goConfirm}
                  >
                    {bt.continue}
                    <ArrowForwardIcon size={14} className="text-white" strokeWidth={2.5} />
                  </button>
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h1 className={pageTitleClass}>
                  {bt.step2Title}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[#8a8a8a] break-words">
                  {bt.step2Subtitle.replace("{name}", displayName)}
                </p>
                <div className={`mt-5 sm:mt-6 ${formCardClass}`}>
                  <div className="mb-4 min-w-0 rounded-[var(--radius)] border border-[var(--border-light)] bg-[var(--sand)] p-4 sm:p-5">
                    <div className="mb-4 flex items-start gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--green-bg)]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" aria-hidden>
                          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                          <path d="M22 4L12 14.01l-3-3" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--text)]">{bt.requestTitle}</div>
                        <div className="text-xs text-[var(--text-light)] break-words">{bt.requestSubtitle}</div>
                      </div>
                    </div>
                    <ul className="flex flex-col gap-2.5">
                      {bt.includes.map((line) => (
                        <li key={line} className="flex min-w-0 items-start gap-2.5 text-[13px] leading-snug text-[var(--text-mid)]">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)]">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" aria-hidden>
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          </span>
                          <span className="min-w-0 break-words">{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {error ? (
                    <div className="mb-4 rounded-lg border border-[#f0c4c4] bg-[#FCEBEB] px-4 py-3 text-[13px] text-[#991b1b]" role="alert">
                      {error}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    disabled={loading}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[50px] bg-[var(--green)] px-4 py-3.5 text-sm font-semibold !text-white shadow-[0_4px_14px_rgba(45,106,79,0.25)] transition hover:bg-[var(--green-dark)] hover:!text-white disabled:cursor-not-allowed disabled:opacity-70"
                    onClick={() => void submitBooking()}
                  >
                    {loading ? (
                      <span className="inline-block h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" aria-hidden>
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                        <path d="M22 4L12 14.01l-3-3" />
                      </svg>
                    )}
                    {bt.confirmBooking}
                  </button>
                  <button
                    type="button"
                    className="mt-2 w-full cursor-pointer rounded-[50px] border-[1.5px] border-[var(--border)] bg-transparent py-2.5 text-[13px] font-medium text-[var(--text-mid)] transition hover:border-[var(--text-hint)] hover:bg-[var(--sand)]"
                    onClick={() => {
                      setStep(1);
                      setError(null);
                    }}
                  >
                    {bt.back}
                  </button>
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <div className={`${formCardClass} px-5 py-8 sm:px-6 sm:py-10 md:px-8 md:py-12`}>
                <div className="text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--green-bg)] sm:h-20 sm:w-20">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <path d="M22 4L12 14.01l-3-3" />
                    </svg>
                  </div>
                  <h2 className="font-[family-name:var(--font-dm-serif)] text-xl text-[var(--text)] sm:text-2xl">{bt.step3Title}</h2>
                  <p className="mx-auto mt-2 max-w-[480px] text-[13px] leading-relaxed text-[#8a8a8a] break-words sm:text-[13.5px]">
                    {hasCalendly ? bt.step3Subtitle : bt.step3SubtitleNoCalendly}
                  </p>
                  {hasCalendly ? (
                    <p className="mt-2 text-xs font-medium text-[var(--green)] break-words">{bt.step3Highlight}</p>
                  ) : null}
                </div>
                {calendlyPageUrl ? (
                  <div className="mt-6 min-w-0 overflow-x-clip rounded-[var(--radius-lg)] border border-[#E8ECE9] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] sm:mt-8">
                    <CalendlyInlineEmbed
                      url={calendlyPageUrl}
                      title={bt.calendlyTitle.replace("{name}", displayName)}
                      className="min-h-[520px] w-full min-w-0 max-w-full rounded-none border-0 bg-white sm:min-h-[620px] md:min-h-[720px]"
                    />
                  </div>
                ) : !hasCalendly ? (
                  <div className="mt-6 rounded-[var(--radius-lg)] border border-[#E8ECE9] bg-[var(--sand)] px-5 py-8 text-center sm:mt-8 sm:px-8">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8a8a8a" strokeWidth="1.8" aria-hidden>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                    </div>
                    <h3 className="font-[family-name:var(--font-dm-serif)] text-lg text-[var(--text)]">
                      {bt.calendlyUnavailableTitle}
                    </h3>
                    <p className="mx-auto mt-2 max-w-[420px] text-[13px] leading-relaxed text-[var(--text-mid)]">
                      {bt.calendlyUnavailableMessage.replace("{name}", displayName)}
                    </p>
                  </div>
                ) : null}
                <div className="mt-6 text-center sm:mt-8">
                  <Link
                    href="/student/advisor-sessions"
                    className="mx-auto inline-flex w-full max-w-[320px] cursor-pointer items-center justify-center gap-2 rounded-[50px] bg-[var(--green)] px-6 py-3 text-sm font-semibold !text-white no-underline transition hover:bg-[var(--green-dark)] hover:!text-white sm:px-8 sm:py-3.5"
                  >
                    {bt.backToAdvisors}
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          <aside className="w-full min-w-0 shrink-0 lg:w-[260px] lg:sticky lg:top-6">
            <div className="rounded-2xl border border-[#EEF2EF] bg-[linear-gradient(180deg,var(--white)_0%,#FAFBFA_100%)] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.04)] sm:p-4">
              <div className="text-sm font-bold text-[var(--text)]">{bt.summaryTitle}</div>
              <div className="mt-4 flex flex-col gap-3 text-[12.5px] text-[var(--text-mid)]">
                <div className="flex items-start gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden>
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="min-w-0 break-words">{bt.withAdvisor.replace("{name}", displayName)}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <span className="min-w-0 break-words">{bt.duration}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden>
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <path d="M22 4L12 14.01l-3-3" />
                  </svg>
                  <span className="min-w-0 break-words">{bt.personalizedGuidance}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden>
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                  <span className="min-w-0 break-words">{bt.qaFollowUp}</span>
                </div>
              </div>
              {advisor.title ? (
                <p className="bidi-ltr mt-4 break-words text-xs text-[var(--text-light)]" dir="ltr">
                  {advisor.title}
                </p>
              ) : null}

              <div className="mt-5 border-t border-[#E8ECE9] pt-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 gap-y-1">
                  <span className="text-[13px] font-normal leading-none text-[#8a8a8a]">{bt.sessionCost}</span>
                  <span className="font-[family-name:var(--font-dm-serif)] text-[20px] font-bold leading-none tracking-tight text-[var(--green)] sm:text-[22px]">
                    {bt.oneCredit}
                  </span>
                </div>
                <div className="mt-4 flex gap-3 rounded-xl border border-[#c5dfc9] bg-[#ecf6ef] px-3 py-3 sm:px-3.5 sm:py-3.5">
                  <div
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[var(--green)] bg-white/80 sm:h-9 sm:w-9"
                    aria-hidden
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <div className="min-w-0 text-[12px] leading-snug text-[#3d5247] sm:text-[13px]">
                    <p>{bt.coveredByCredits}</p>
                    <p className="mt-0.5">{bt.noExtraPayment}</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
