"use client";

import { createAdvisorSessionBooking } from "@/actions/advisor-sessions";
import { CalendlyInlineEmbed } from "@/components/calendly-inline-embed";
import { COUNTRIES } from "@/lib/countries";
import { advisorSessionUtmContent, buildCalendlySchedulingPageUrl } from "@/lib/calendly-scheduling";
import { useLocale } from "@/lib/i18n/locale-context";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ArrowBackIcon, ArrowForwardIcon } from "../../../../_components/directional-icons";

const STAGE_VALUES = [
  "",
  "Just exploring",
  "Shortlisting universities",
  "Preparing application",
  "Ready to apply",
] as const;

const inputClass =
  "w-full rounded-[10px] border-[1.5px] border-[var(--border)] bg-white px-4 py-3 font-[family-name:var(--font-dm-sans)] text-sm text-[var(--text)] transition placeholder:text-[#c0bdb8] focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.08)] focus:outline-none";

const selectClass = `${inputClass} cursor-pointer appearance-none bg-[length:10px_6px] bg-[position:right_12px_center] bg-no-repeat pr-8`;

type AdvisorBrief = {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
};

type Props = {
  advisor: AdvisorBrief;
};

export function BookAdvisorSessionClient({ advisor }: Props) {
  const { dict } = useLocale();
  const bt = dict.student.advisors.book;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [destinationAlpha2, setDestinationAlpha2] = useState("");
  const [stage, setStage] = useState("");
  const [specificUnis, setSpecificUnis] = useState("");
  const [helpWith, setHelpWith] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);

  const displayName = `${advisor.firstName} ${advisor.lastName}`;

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
    if (sessionId == null) return "";
    const destinationLabel = destinationAlpha2
      ? (COUNTRIES.find((c) => c.alpha2 === destinationAlpha2)?.name ?? destinationAlpha2)
      : "";
    return buildCalendlySchedulingPageUrl({
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
  }, [advisor.id, destinationAlpha2, displayName, email, fullName, helpWith, sessionId, specificUnis, stage]);

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
    <div className="min-h-screen bg-[linear-gradient(180deg,#F7FBF8_0%,var(--sand)_280px)]">
      <div className="relative mx-auto max-w-[880px] px-5 py-8 pb-16">
        <Link
          href="/student/advisor-sessions"
          className="mb-7 inline-flex cursor-pointer items-center gap-1.5 rounded-[50px] border-[1.5px] border-[var(--border)] bg-white px-[18px] py-2 text-[13px] font-medium text-[var(--text-mid)] no-underline transition hover:border-[var(--text-hint)] hover:-translate-x-0.5"
        >
          <ArrowBackIcon size={16} />
          {bt.backToAdvisors}
        </Link>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            {step === 1 ? (
              <>
                <h1 className="font-[family-name:var(--font-dm-serif)] text-[28px] tracking-tight text-[var(--text)]">
                  {bt.step1Title}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[#8a8a8a]">
                  {bt.step1Subtitle.replace("{name}", displayName)}
                </p>
                <p className="mt-2 text-xs font-medium text-[var(--green)]">{bt.step1Highlight}</p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {bt.badges.map((label) => (
                    <div
                      key={label}
                      className="flex items-center gap-1.5 rounded-[50px] border border-[#d5e8db] bg-[var(--green-pale)] px-4 py-2 text-[11.5px] font-medium text-[var(--green-dark)]"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" aria-hidden>
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                        <path d="M22 4L12 14.01l-3-3" />
                      </svg>
                      {label}
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-[var(--radius-xl)] border border-[#EEF2EF] bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)] max-[600px]:px-5 max-[600px]:py-6">
                  <div className="grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">
                    <div className="mb-4">
                      <label className="mb-2 block text-xs font-semibold text-[var(--text)]" htmlFor="bk-name">
                        {bt.fullName}
                      </label>
                      <input id="bk-name" className={inputClass} placeholder={bt.fullNamePlaceholder} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="mb-4">
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
                  <div className="mb-4">
                    <label className="mb-2 block text-xs font-semibold text-[var(--text)]" htmlFor="bk-phone">
                      {bt.phone} <span className="font-normal text-[var(--text-hint)]">{bt.phoneHint}</span>
                    </label>
                    <input id="bk-phone" className={inputClass} placeholder={bt.phonePlaceholder} value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">
                    <div className="mb-4">
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
                    <div className="mb-4">
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
                  <div className="mb-4">
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
                  <div className="mb-4">
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
                <h1 className="font-[family-name:var(--font-dm-serif)] text-[28px] tracking-tight text-[var(--text)]">
                  {bt.step2Title}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[#8a8a8a]">
                  {bt.step2Subtitle.replace("{name}", displayName)}
                </p>
                <div className="mt-6 rounded-[var(--radius-xl)] border border-[#EEF2EF] bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)] max-[600px]:px-5 max-[600px]:py-6">
                  <div className="mb-4 rounded-[var(--radius)] border border-[var(--border-light)] bg-[var(--sand)] p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--green-bg)]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" aria-hidden>
                          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                          <path d="M22 4L12 14.01l-3-3" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[var(--text)]">{bt.requestTitle}</div>
                        <div className="text-xs text-[var(--text-light)]">{bt.requestSubtitle}</div>
                      </div>
                    </div>
                    <ul className="flex flex-col gap-2.5">
                      {bt.includes.map((line) => (
                        <li key={line} className="flex items-start gap-2.5 text-[13px] leading-snug text-[var(--text-mid)]">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)]">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" aria-hidden>
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          </span>
                          {line}
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
              <div className="rounded-[var(--radius-xl)] border border-[#EEF2EF] bg-white px-8 py-12 shadow-[0_10px_30px_rgba(0,0,0,0.04)] max-[600px]:px-5">
                <div className="text-center">
                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--green-bg)]">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <path d="M22 4L12 14.01l-3-3" />
                    </svg>
                  </div>
                  <h2 className="font-[family-name:var(--font-dm-serif)] text-2xl text-[var(--text)]">{bt.step3Title}</h2>
                  <p className="mx-auto mt-2 max-w-[480px] text-[13.5px] leading-relaxed text-[#8a8a8a]">
                    {bt.step3Subtitle}
                  </p>
                  <p className="mt-2 text-xs font-medium text-[var(--green)]">{bt.step3Highlight}</p>
                </div>
                {calendlyPageUrl ? (
                  <div className="mt-8 overflow-hidden rounded-[var(--radius-lg)] border border-[#E8ECE9] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                    <CalendlyInlineEmbed
                      url={calendlyPageUrl}
                      title={bt.calendlyTitle.replace("{name}", displayName)}
                      className="min-h-[720px] w-full min-w-[280px] rounded-none border-0 bg-white"
                    />
                  </div>
                ) : null}
                <div className="mt-8 text-center">
                  <Link
                    href="/student/advisor-sessions"
                    className="mx-auto inline-flex max-w-[320px] cursor-pointer items-center justify-center gap-2 rounded-[50px] bg-[var(--green)] px-8 py-3.5 text-sm font-semibold !text-white no-underline transition hover:bg-[var(--green-dark)] hover:!text-white"
                  >
                    {bt.backToAdvisors}
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          <aside className="w-full shrink-0 lg:w-[288px] lg:min-w-[288px] lg:sticky lg:top-6">
            <div className="rounded-2xl border border-[#EEF2EF] bg-[linear-gradient(180deg,var(--white)_0%,#FAFBFA_100%)] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
              <div className="text-sm font-bold text-[var(--text)]">{bt.summaryTitle}</div>
              <div className="mt-4 flex flex-col gap-3 text-[12.5px] text-[var(--text-mid)]">
                <div className="flex items-center gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" aria-hidden>
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>{bt.withAdvisor.replace("{name}", displayName)}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <span>{bt.duration}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" aria-hidden>
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <path d="M22 4L12 14.01l-3-3" />
                  </svg>
                  <span>{bt.personalizedGuidance}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" aria-hidden>
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                  <span>{bt.qaFollowUp}</span>
                </div>
              </div>
              {advisor.title ? (
                <p className="bidi-ltr mt-4 text-xs text-[var(--text-light)]" dir="ltr">
                  {advisor.title}
                </p>
              ) : null}

              <div className="mt-5 border-t border-[#E8ECE9] pt-5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-normal leading-none text-[#8a8a8a]">{bt.sessionCost}</span>
                  <span className="font-[family-name:var(--font-dm-serif)] text-[22px] font-bold leading-none tracking-tight text-[var(--green)]">
                    {bt.oneCredit}
                  </span>
                </div>
                <div className="mt-4 flex gap-3 rounded-xl border border-[#c5dfc9] bg-[#ecf6ef] px-3.5 py-3.5">
                  <div
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[var(--green)] bg-white/80"
                    aria-hidden
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <div className="text-[13px] leading-snug text-[#3d5247]">
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
