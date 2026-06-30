"use client";

import { createAmbassadorSessionRequest } from "@/actions/ambassador-sessions";
import { useLocale } from "@/lib/i18n/locale-context";
import Link from "next/link";
import { useCallback, useState } from "react";
import { ArrowBackIcon, ArrowForwardIcon } from "../../../../_components/directional-icons";

const inputClass =
  "w-full rounded-[10px] border-[1.5px] border-[var(--border)] bg-white px-4 py-3 font-[family-name:var(--font-dm-sans)] text-sm text-[var(--text)] transition placeholder:text-[#c0bdb8] focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.08)] focus:outline-none";

function slotToIso(date: string, time: string): string | null {
  const d = date.trim();
  if (!d) return null;
  const t = (time.trim() || "12:00").slice(0, 5);
  const normalized = t.length === 5 ? `${t}:00` : t;
  const parsed = new Date(`${d}T${normalized}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function formatSlotLabel(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

type AmbassadorBrief = {
  id: string;
  firstName: string;
  lastName: string;
  displayUniversity: string;
  destinationLabel: string;
  major: string | null;
  isCurrentStudent: boolean;
};

type Props = {
  ambassador: AmbassadorBrief;
};

export function BookAmbassadorSessionClient({ ambassador }: Props) {
  const { dict } = useLocale();
  const bt = dict.student.ambassadors.book;
  const am = dict.student.ambassadors;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [date1, setDate1] = useState("");
  const [time1, setTime1] = useState("");
  const [date2, setDate2] = useState("");
  const [time2, setTime2] = useState("");
  const [date3, setDate3] = useState("");
  const [time3, setTime3] = useState("");

  const [discussion, setDiscussion] = useState("");

  const [prefIso1, setPrefIso1] = useState("");
  const [prefIso2, setPrefIso2] = useState<string | null>(null);
  const [prefIso3, setPrefIso3] = useState<string | null>(null);

  const displayName = `${ambassador.firstName} ${ambassador.lastName}`;

  const goConfirm = useCallback(() => {
    setError(null);
    if (!fullName.trim()) {
      setError(bt.errors.fullName);
      return;
    }
    if (!email.trim()) {
      setError(bt.errors.email);
      return;
    }
    if (!phone.trim()) {
      setError(bt.errors.phone);
      return;
    }
    if (!date1.trim() || !time1.trim()) {
      setError(bt.errors.time1);
      return;
    }
    const p1 = slotToIso(date1, time1);
    if (!p1) {
      setError(bt.errors.invalidTime1);
      return;
    }
    let p2: string | null = null;
    if (date2.trim()) {
      p2 = slotToIso(date2, time2 || "12:00");
      if (!p2) {
        setError(bt.errors.invalidTime2);
        return;
      }
    }
    let p3: string | null = null;
    if (date3.trim()) {
      p3 = slotToIso(date3, time3 || "12:00");
      if (!p3) {
        setError(bt.errors.invalidTime3);
        return;
      }
    }
    if (!discussion.trim()) {
      setError(bt.errors.discussion);
      return;
    }
    setPrefIso1(p1);
    setPrefIso2(p2);
    setPrefIso3(p3);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [bt.errors, date1, date2, date3, discussion, email, fullName, phone, time1, time2, time3]);

  const submitBooking = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await createAmbassadorSessionRequest({
        ambassadorId: ambassador.id,
        studentName: fullName.trim(),
        studentEmail: email.trim(),
        studentPhone: phone.trim(),
        prefTime1Iso: prefIso1,
        prefTime2Iso: prefIso2,
        prefTime3Iso: prefIso3,
        discussionTopics: discussion.trim(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  }, [ambassador.id, discussion, email, fullName, phone, prefIso1, prefIso2, prefIso3]);

  const timeRow = (opts: {
    label: string;
    required: boolean;
    dateId: string;
    timeId: string;
    date: string;
    time: string;
    setDate: (v: string) => void;
    setTime: (v: string) => void;
  }) => (
    <div className="mb-4">
      <div className="mb-2 block text-xs font-semibold text-[var(--text)]">
        {opts.label}{" "}
        {opts.required ? (
          <span className="text-[#C0392B]">*</span>
        ) : (
          <span className="font-normal text-[var(--text-hint)]">{bt.optional}</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-[var(--text-hint)]" htmlFor={opts.dateId}>
            {bt.date}
          </label>
          <input id={opts.dateId} type="date" className={inputClass} value={opts.date} onChange={(e) => opts.setDate(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-[var(--text-hint)]" htmlFor={opts.timeId}>
            {bt.time}
          </label>
          <input id={opts.timeId} type="time" className={inputClass} value={opts.time} onChange={(e) => opts.setTime(e.target.value)} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F7FBF8_0%,var(--sand)_280px)]">
      <div className="relative mx-auto max-w-[880px] px-5 py-8 pb-16">
        <Link
          href="/student/ambassadors"
          className="mb-7 inline-flex cursor-pointer items-center gap-1.5 rounded-[50px] border-[1.5px] border-[var(--border)] bg-white px-[18px] py-2 text-[13px] font-medium text-[var(--text-mid)] no-underline transition hover:border-[var(--text-hint)] hover:-translate-x-0.5"
        >
          <ArrowBackIcon size={16} />
          {bt.backToAmbassadors}
        </Link>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            {step === 1 ? (
              <>
                <h1 className="font-[family-name:var(--font-dm-serif)] text-[26px] tracking-tight text-[var(--text)]">
                  {bt.step1Title}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[#8a8a8a]">
                  {bt.step1Subtitle
                    .replace("{firstName}", ambassador.firstName)
                    .replace("{university}", ambassador.displayUniversity)}
                </p>
                <div className="mt-6 rounded-[var(--radius-xl)] border border-[#EEF2EF] bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)] max-[600px]:px-5 max-[600px]:py-6">
                  <p className="mb-5 border-b border-[var(--border-light)] pb-4 text-[13px] font-semibold text-[var(--text)]">
                    {bt.personalInfo}
                  </p>
                  <div className="mb-4">
                    <label className="mb-2 block text-xs font-semibold text-[var(--text)]" htmlFor="ab-name">
                      {bt.fullName} <span className="text-[#C0392B]">*</span>
                    </label>
                    <input id="ab-name" className={inputClass} placeholder={bt.fullNamePlaceholder} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="mb-4">
                    <label className="mb-2 block text-xs font-semibold text-[var(--text)]" htmlFor="ab-email">
                      {bt.email} <span className="text-[#C0392B]">*</span>
                    </label>
                    <input
                      id="ab-email"
                      type="email"
                      className={inputClass}
                      placeholder={bt.emailPlaceholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="mb-6">
                    <label className="mb-2 block text-xs font-semibold text-[var(--text)]" htmlFor="ab-phone">
                      {bt.phone} <span className="text-[#C0392B]">*</span>
                    </label>
                    <input id="ab-phone" className={inputClass} placeholder={bt.phonePlaceholder} value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>

                  <p className="mb-5 border-b border-[var(--border-light)] pb-4 text-[13px] font-semibold text-[var(--text)]">
                    {bt.preferredTimes}
                  </p>
                  {timeRow({
                    label: bt.preferredTime1,
                    required: true,
                    dateId: "ab-d1",
                    timeId: "ab-t1",
                    date: date1,
                    time: time1,
                    setDate: setDate1,
                    setTime: setTime1,
                  })}
                  {timeRow({
                    label: bt.preferredTime2,
                    required: false,
                    dateId: "ab-d2",
                    timeId: "ab-t2",
                    date: date2,
                    time: time2,
                    setDate: setDate2,
                    setTime: setTime2,
                  })}
                  {timeRow({
                    label: bt.preferredTime3,
                    required: false,
                    dateId: "ab-d3",
                    timeId: "ab-t3",
                    date: date3,
                    time: time3,
                    setDate: setDate3,
                    setTime: setTime3,
                  })}

                  <div className="mb-4">
                    <label className="mb-2 block text-xs font-semibold text-[var(--text)]" htmlFor="ab-disc">
                      {bt.discussion} <span className="text-[#C0392B]">*</span>
                    </label>
                    <textarea
                      id="ab-disc"
                      className={`${inputClass} min-h-[100px] resize-y`}
                      placeholder={bt.discussionPlaceholder}
                      value={discussion}
                      onChange={(e) => setDiscussion(e.target.value)}
                    />
                  </div>
                  {error ? (
                    <div className="mb-4 rounded-lg border border-[#f0c4c4] bg-[#FCEBEB] px-4 py-3 text-[13px] text-[#991b1b]" role="alert">
                      {error}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[50px] bg-[var(--green)] px-4 py-3.5 text-sm font-semibold !text-white shadow-[0_4px_14px_rgba(45,106,79,0.25)] transition hover:-translate-y-px hover:bg-[var(--green-dark)] hover:!text-white hover:shadow-[0_6px_20px_rgba(45,106,79,0.3)]"
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
                    <div className="mb-3 text-sm font-semibold text-[var(--text)]">{bt.yourDetails}</div>
                    <ul className="mb-3 flex flex-col gap-1.5 text-[13px] text-[var(--text-mid)]">
                      <li>
                        <span className="font-medium text-[var(--text)]">{bt.nameLabel}</span> {fullName.trim()}
                      </li>
                      <li>
                        <span className="font-medium text-[var(--text)]">{bt.emailLabel}</span> {email.trim()}
                      </li>
                      <li>
                        <span className="font-medium text-[var(--text)]">{bt.phoneLabel}</span> {phone.trim()}
                      </li>
                    </ul>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-hint)]">
                      {bt.preferredTimes}
                    </div>
                    <ul className="flex flex-col gap-2 text-[13px] text-[var(--text-mid)]">
                      <li>
                        <span className="font-medium text-[var(--text)]">{bt.time1}</span> {formatSlotLabel(prefIso1)}
                      </li>
                      {prefIso2 ? (
                        <li>
                          <span className="font-medium text-[var(--text)]">{bt.time2}</span> {formatSlotLabel(prefIso2)}
                        </li>
                      ) : null}
                      {prefIso3 ? (
                        <li>
                          <span className="font-medium text-[var(--text)]">{bt.time3}</span> {formatSlotLabel(prefIso3)}
                        </li>
                      ) : null}
                    </ul>
                    <p className="mt-3 border-t border-[var(--border-light)] pt-3 text-[13px] leading-relaxed text-[var(--text-mid)]">
                      <span className="font-medium text-[var(--text)]">{bt.discussionLabel} </span>
                      <span className="bidi-ltr" dir="ltr">
                        {discussion.trim()}
                      </span>
                    </p>
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
              <div className="rounded-[var(--radius-xl)] border border-[#EEF2EF] bg-white px-8 py-12 text-center shadow-[0_10px_30px_rgba(0,0,0,0.04)] max-[600px]:px-5">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--green-bg)]">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <path d="M22 4L12 14.01l-3-3" />
                  </svg>
                </div>
                <h2 className="font-[family-name:var(--font-dm-serif)] text-2xl text-[var(--text)]">{bt.step3Title}</h2>
                <p className="mx-auto mt-2 max-w-[400px] text-[13.5px] leading-relaxed text-[#8a8a8a]">
                  {bt.step3Subtitle.replace("{name}", displayName)}
                </p>
                <Link
                  href="/student/ambassadors"
                  className="mx-auto mt-6 inline-flex max-w-[320px] cursor-pointer items-center justify-center gap-2 rounded-[50px] bg-[var(--green)] px-8 py-3.5 text-sm font-semibold !text-white no-underline transition hover:bg-[var(--green-dark)] hover:!text-white"
                >
                  {bt.backToAmbassadors}
                </Link>
              </div>
            ) : null}
          </div>

          <aside className="w-full shrink-0 lg:w-[288px] lg:min-w-[288px] lg:sticky lg:top-6">
            <div className="rounded-2xl border border-[#EEF2EF] bg-[linear-gradient(180deg,var(--white)_0%,#FAFBFA_100%)] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
              <div className="text-sm font-bold text-[var(--text)]">{bt.ambassador}</div>
              <div className="bidi-ltr mt-3 text-[15px] font-semibold text-[var(--text)]" dir="ltr">
                {displayName}
              </div>
              <div className="bidi-ltr mt-1 text-[12.5px] text-[var(--text-mid)]" dir="ltr">
                {ambassador.destinationLabel} · {ambassador.displayUniversity}
              </div>
              {ambassador.major ? (
                <div className="bidi-ltr mt-1 text-[12.5px] text-[var(--text-mid)]" dir="ltr">
                  {ambassador.major}
                </div>
              ) : null}
              <div className="mt-2">
                <span
                  className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-semibold ${
                    ambassador.isCurrentStudent
                      ? "bg-[var(--green-bg)] text-[var(--green)]"
                      : "border border-[var(--border-light)] bg-[var(--sand)] text-[var(--text-mid)]"
                  }`}
                >
                  {ambassador.isCurrentStudent ? am.currentStudent : am.graduate}
                </span>
              </div>
              <p className="mt-3 text-[11px] leading-snug text-[var(--text-hint)]">{bt.availabilityNote}</p>

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
