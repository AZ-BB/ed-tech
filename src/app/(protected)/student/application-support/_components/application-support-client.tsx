"use client";

import {
  submitApplicationSupport,
  type ApplicationSupportPayload,
} from "@/actions/application-support";
import type { Database } from "@/database.types";
import clsx from "clsx";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { CalendlyInlineEmbed } from "@/components/calendly-inline-embed";
import { buildCalendlySchedulingPageUrl } from "@/lib/calendly-scheduling";
import { useLocale } from "@/lib/i18n/locale-context";
import "../application-support.css";
import {
  COUNTRY_OPTIONS,
  NATIONALITY_OPTIONS,
  VF_APPLY_TIMING_CHIPS,
  VF_DESTINATION_CHIPS,
  VF_GRADE_YEAR_OPTIONS,
} from "../_data/application-support-options";

type PlanRow = Database["public"]["Tables"]["applications_plans"]["Row"];

type Step =
  | "landing"
  | "basic"
  | "direction"
  | "strategy"
  | "summary"
  | "pay"
  | "done";

type PlanClarity = "clear" | "some" | "help";

function optLabel(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}

function formatTemplate(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [key, val] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(String(val));
  }
  return out;
}

const VALUE_CARD_ICONS = [
  {
    tint: "bg-[#e8f1ec]",
    stroke: "#2D6A4F",
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
      </>
    ),
  },
  {
    tint: "bg-[#ecebf5]",
    stroke: "#7c6ea8",
    icon: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </>
    ),
  },
  {
    tint: "bg-[#e8eff5]",
    stroke: "#5a7ea8",
    icon: (
      <>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M9 15l2 2 4-4" />
      </>
    ),
  },
  {
    tint: "bg-[#f0ebe3]",
    stroke: "#a8855a",
    icon: (
      <>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
  },
  {
    tint: "bg-[#f7f1d9]",
    stroke: "#b8a04a",
    icon: (
      <>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </>
    ),
  },
  {
    tint: "bg-[#e6f1ec]",
    stroke: "#2D6A4F",
    icon: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 4 4 5-5" />
      </>
    ),
  },
  {
    tint: "bg-[#f4e8e3]",
    stroke: "#c26a4a",
    icon: (
      <>
        <path d="M2 17l1.5-3L12 3l8.5 11L22 17" />
        <path d="M2 17h20l-2 4H4z" />
      </>
    ),
  },
  {
    tint: "bg-[#e5ecf3]",
    stroke: "#5a7ea8",
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </>
    ),
  },
  {
    tint: "bg-[#efe9f4]",
    stroke: "#8b6ea8",
    icon: (
      <>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <path d="M22 6l-10 7L2 6" />
      </>
    ),
  },
] as const;

const HERO_TRACKER_META = [
  { pct: 100, kind: "done" as const },
  { pct: 70, kind: "prog" as const },
  { pct: 25, kind: "up" as const },
  { pct: 0, kind: "up" as const },
];

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={clsx("icon-directional", className)}
      aria-hidden
    >
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function ProgressTracker({
  step,
  steps,
}: {
  step: Exclude<Step, "landing" | "done">;
  steps: Record<
    Exclude<Step, "landing" | "done">,
    { label: string; stepOf: string }
  >;
}) {
  const pctMap: Record<Exclude<Step, "landing" | "done">, number> = {
    basic: 20,
    direction: 40,
    strategy: 60,
    summary: 80,
    pay: 100,
  };
  const p = { pct: pctMap[step], ...steps[step] };
  return (
    <div className="mb-[18px] rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-[22px] py-4">
      <div className="mb-2.5 h-1.5 overflow-hidden rounded bg-[var(--border-light)]">
        <div
          className="h-full rounded bg-[var(--green)] transition-[width] duration-300 ease-out"
          style={{ width: `${p.pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[var(--text-mid)]">
          {p.label}
        </span>
        <span className="text-xs font-medium text-[var(--text-hint)]">
          {p.stepOf}
        </span>
      </div>
    </div>
  );
}

export function ApplicationSupportClient({ plans }: { plans: PlanRow[] }) {
  const { dict } = useLocale();
  const as = dict.student.applicationSupport;
  const heroTrackerRows = useMemo(
    () =>
      HERO_TRACKER_META.map((meta, i) => ({
        ...meta,
        label: as.heroTracker[i] ?? "",
        stage:
          meta.kind === "done"
            ? as.landing.trackerStages.complete
            : meta.kind === "prog"
              ? as.landing.trackerStages.inProgress
              : as.landing.trackerStages.upcoming,
      })),
    [as],
  );
  const valueCards = useMemo(
    () =>
      VALUE_CARD_ICONS.map((card, i) => ({
        ...card,
        title: as.valueCards[i]?.title ?? "",
        desc: as.valueCards[i]?.desc ?? "",
      })),
    [as],
  );
  const destinationLabels = as.options.destinations as Record<string, string>;
  const applyTimingLabels = as.options.applyTiming as Record<string, string>;
  const gradeYearLabels = as.options.gradeYears as Record<string, string>;
  const notSureYet = as.options.notSureYet;
  const [step, setStep] = useState<Step>("landing");

  const goToStep = useCallback((next: Step) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const [toast, setToast] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationId, setApplicationId] = useState<number | null>(null);

  const planByCount = useMemo(() => {
    const m = new Map<number, PlanRow>();
    for (const p of plans) {
      m.set(p.universities_count, p);
    }
    return m;
  }, [plans]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationality, setNationality] = useState("");
  const [country, setCountry] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [gradeYear, setGradeYear] = useState("");

  const [destinations, setDestinations] = useState<string[]>([]);
  const [majors, setMajors] = useState<string[]>([]);
  const [majorInput, setMajorInput] = useState("");
  const [applyTiming, setApplyTiming] = useState<string | null>(null);
  const [planClarity, setPlanClarity] = useState<PlanClarity | null>(null);

  const [selectedPack, setSelectedPack] = useState<5 | 10 | 15 | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  const toggleDestination = (label: string) => {
    setDestinations((prev) =>
      prev.includes(label) ? prev.filter((d) => d !== label) : [...prev, label],
    );
  };

  const addMajor = (raw: string) => {
    const val = raw.trim().replace(/,$/, "").trim();
    if (!val) return;
    if (majors.some((m) => m.toLowerCase() === val.toLowerCase())) {
      showToast(as.toasts.majorExists);
      return;
    }
    setMajors((prev) => [...prev, val]);
    setMajorInput("");
  };

  const removeMajor = (index: number) => {
    setMajors((prev) => prev.filter((_, i) => i !== index));
  };

  const onMajorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addMajor(majorInput);
    } else if (e.key === "Backspace" && !majorInput && majors.length) {
      setMajors((prev) => prev.slice(0, -1));
    }
  };

  function buildPayload(): ApplicationSupportPayload {
    if (!selectedPack) {
      throw new Error("Package required");
    }
    return {
      planUniversitiesCount: selectedPack,
      studentName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      nationality,
      countryOfResidence: country,
      schoolName: schoolName.trim(),
      currentGradeYear: gradeYear,
      destinations: [...destinations],
      fieldOfStudy: majors.join(", "),
      applyTiming,
      planClarity,
      universities: [],
      uniNotes: "",
      uniIntent: null,
    };
  }

  async function persistApplication(): Promise<boolean> {
    if (applicationId != null) return true;
    if (!selectedPack) return false;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const fd = new FormData();
      fd.set("payload", JSON.stringify(buildPayload()));
      const res = await submitApplicationSupport(fd);
      if (!res.ok) {
        setSubmitError(res.error);
        return false;
      }
      setApplicationId(res.applicationId);
      return true;
    } catch (e) {
      console.error(e);
      setSubmitError(as.toasts.somethingWrong);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function goFromSummaryToPay() {
    const ok = await persistApplication();
    if (ok) goToStep("pay");
  }

  const basicValid = Boolean(
    fullName.trim() &&
      email.trim() &&
      phone.trim() &&
      nationality &&
      country &&
      schoolName.trim() &&
      gradeYear,
  );

  const strategyValid = selectedPack != null;

  const summaryNarrative = useMemo(() => {
    if (planClarity === "help") return as.summary.narrativeHelp;
    if (planClarity === "clear") return as.summary.narrativeClear;
    return as.summary.narrativeDefault;
  }, [planClarity, as.summary]);

  const snapDest = useMemo(() => {
    if (!destinations.length) {
      return { text: as.summary.destEmpty, empty: true };
    }
    const cleaned = destinations.filter((d) => d !== notSureYet);
    if (cleaned.length > 0) {
      return {
        text: cleaned.map((d) => optLabel(destinationLabels, d)).join(", "),
        empty: false,
      };
    }
    return { text: as.summary.destEmpty, empty: true };
  }, [destinations, as.summary.destEmpty, destinationLabels, notSureYet]);

  const snapField = useMemo(() => {
    const cleaned = majors.filter((m) => m.toLowerCase() !== notSureYet.toLowerCase());
    if (cleaned.length > 0) {
      return { text: cleaned.join(", "), empty: false };
    }
    return { text: as.summary.fieldEmpty, empty: true };
  }, [majors, as.summary.fieldEmpty, notSureYet]);

  const snapTiming = useMemo(() => {
    const empty = !applyTiming || applyTiming === notSureYet;
    return {
      text: empty
        ? as.summary.timingEmpty
        : optLabel(applyTimingLabels, applyTiming!),
      empty,
    };
  }, [applyTiming, as.summary.timingEmpty, applyTimingLabels, notSureYet]);

  const calendlyUrl = useMemo(() => {
    const ctx: string[] = [];
    if (destinations.length)
      ctx.push(`Destinations: ${destinations.join(", ")}`);
    if (majors.length) ctx.push(`Field: ${majors.join(", ")}`);
    if (selectedPack) ctx.push(`Strategy: ${selectedPack} universities`);
    if (applyTiming) ctx.push(`Timing: ${applyTiming}`);
    if (planClarity) ctx.push(`Clarity: ${planClarity}`);
    if (applicationId != null) ctx.push(`Application ref: #${applicationId}`);
    return buildCalendlySchedulingPageUrl({
      name: fullName.trim(),
      email: email.trim(),
      ctxParts: ctx,
    });
  }, [
    destinations,
    majors,
    selectedPack,
    applyTiming,
    planClarity,
    applicationId,
    fullName,
    email,
  ]);

  const sectionLabel = (children: ReactNode) => (
    <div className="mb-3.5 mt-7 border-t border-[var(--border-light)] pt-5 text-[11px] font-bold uppercase tracking-wide text-[var(--green)] first:mt-0 first:border-t-0 first:pt-0">
      {children}
    </div>
  );

  const formNav = (back: () => void, next: () => void, nextDisabled?: boolean) => (
    <div className="mt-8 flex items-center justify-between border-t border-[var(--border-light)] pt-5">
      <button
        type="button"
        onClick={back}
        className="cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white px-6 py-2.5 text-[13px] font-medium text-[var(--text-mid)] transition-colors hover:border-[var(--text-mid)] hover:text-[var(--text)]"
      >
        {as.back}
      </button>
      <button
        type="button"
        disabled={nextDisabled}
        onClick={next}
        className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] px-7 py-2.5 text-[13px] font-semibold transition-colors ${
          nextDisabled
            ? "cursor-not-allowed bg-[var(--border)] text-[var(--text-hint)]"
            : "cursor-pointer bg-[var(--green)] text-white hover:bg-[var(--green-dark)]"
        }`}
      >
        {as.continue}
        <ChevronRight />
      </button>
    </div>
  );

  return (
    <div id="application-support-scope" className="pb-16 font-[family-name:var(--font-dm-sans)]">
      {toast ? (
        <div
          role="status"
          className="fixed bottom-8 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-[var(--green-dark)] px-6 py-2.5 text-[12.5px] font-medium text-white shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
        >
          {toast}
        </div>
      ) : null}

      {step === "landing" ? (
        <>
          <section className="as-hero relative overflow-x-hidden bg-[var(--green-pale)] px-10 pb-20 pt-20 max-[768px]:px-5 max-[768px]:pb-[60px]">
            <div className="as-hero-inner">
              <div className="max-[768px]:text-center">
                <div className="mb-6 inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[rgba(45,106,79,0.12)] bg-white px-[18px] py-1.5 text-xs font-semibold text-[var(--green)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" aria-hidden>
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <path d="M22 4L12 14.01l-3-3" />
                  </svg>
                  {as.landing.badge}
                </div>
                <h1 className="mb-[18px] font-[family-name:var(--font-dm-serif)] text-[48px] leading-[1.1] text-[var(--text)] max-[768px]:text-[34px]">
                  {as.landing.title}{" "}
                  <em className="italic text-[var(--green)]">{as.landing.titleEmphasis}</em>
                </h1>
                <p className="max-w-[480px] text-[17px] leading-[1.7] text-[var(--text-light)] max-[768px]:mx-auto">
                  {as.landing.subtitle}
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-[18px] max-[768px]:justify-center">
                  <button
                    type="button"
                    onClick={() => goToStep("basic")}
                    className="inline-flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-pill)] border-0 bg-[var(--green)] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(45,106,79,0.15)] transition-all hover:-translate-y-px hover:bg-[var(--green-dark)]"
                  >
                    {as.landing.cta}
                    <ChevronRight />
                  </button>
                  <span className="text-xs text-[var(--text-hint)]">{as.landing.ctaTime}</span>
                </div>
              </div>

              <div className="as-hero-visual max-[768px]:hidden">
                <div className="as-hero-card">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="text-sm font-bold text-[var(--text)]">{as.landing.journeyTitle}</div>
                    <div className="rounded-[var(--radius-pill)] bg-[var(--green-bg)] px-2.5 py-1 text-[10.5px] font-bold tracking-wide text-[var(--green)]">
                      {as.landing.onTrack}
                    </div>
                  </div>
                  <div className="mb-[18px] text-xs text-[var(--text-light)]">
                    {as.landing.journeySub}
                  </div>
                  {heroTrackerRows.map((row) => (
                    <div key={row.label} className="as-hr-row">
                      <div className={`as-hr-check as-${row.kind}`}>
                        {row.kind === "done" ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.4" aria-hidden>
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        ) : row.kind === "prog" ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c08a2d" strokeWidth="2.2" aria-hidden>
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v5l3 2" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a0a0a0" strokeWidth="2" aria-hidden>
                            <circle cx="12" cy="12" r="9" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 text-[13px] font-semibold text-[var(--text)]">{row.label}</div>
                        <div className="as-hr-bar">
                          <span style={{ width: `${row.pct}%` }} />
                        </div>
                      </div>
                      <div
                        className={`shrink-0 whitespace-nowrap text-[10.5px] font-bold tracking-wide ${
                          row.kind === "done"
                            ? "text-[var(--green)]"
                            : row.kind === "prog"
                              ? "text-[#c08a2d]"
                              : "text-[var(--text-hint)]"
                        }`}
                      >
                        {row.stage}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="as-value-section">
            <div className="text-xs font-bold uppercase tracking-[1.5px] text-[var(--green)]">
              {as.landing.includedLabel}
            </div>
            <h2 className="mb-2.5 mt-3 font-[family-name:var(--font-dm-serif)] text-4xl leading-[1.15] text-[var(--text)] max-[768px]:text-center max-[768px]:text-[26px]">
              {as.landing.includedTitle}
            </h2>
            <p className="mb-10 text-[15px] text-[var(--text-light)] max-[768px]:text-center">
              {as.landing.includedSub}
            </p>
            <div className="mb-10 grid grid-cols-3 gap-4 max-[768px]:grid-cols-1">
              {valueCards.map((c) => (
                <div
                  key={c.title}
                  className="flex flex-col items-start rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white p-7 text-start transition-all hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
                >
                  <div className={`mb-[18px] flex h-11 w-11 items-center justify-center rounded-xl ${c.tint}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c.stroke} strokeWidth="1.8" aria-hidden>
                      {c.icon}
                    </svg>
                  </div>
                  <h3 className="mb-2 text-base font-bold text-[var(--text)]">{c.title}</h3>
                  <p className="text-[13.5px] leading-snug text-[var(--text-light)]">{c.desc}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-8 py-5">
              {as.landing.trustItems.map((item) => (
                <div key={item} className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-light)]">
                  <span className="h-[7px] w-[7px] rounded-full bg-[var(--green-bright)]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="as-clarity-banner">
            <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-white shadow-[0_2px_8px_rgba(45,106,79,0.1)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" aria-hidden>
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <p className="as-clarity-text">
              <strong className="font-bold">{as.landing.clarityBannerBold}</strong>{" "}
              {as.landing.clarityBanner}
            </p>
          </div>

          <div className="as-journey-section">
            <h3 className="as-journey-title font-[family-name:var(--font-dm-serif)]">{as.landing.howItWorks}</h3>
            <p className="as-journey-sub">{as.landing.howItWorksSub}</p>
            <div className="as-journey-steps">
              {as.journeySteps.map((text, i) => (
                <div key={text} className="as-journey-step">
                  <div className="as-journey-num">{i + 1}</div>
                  <div className="as-journey-text">{text}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="as-cta-section">
            <div className="as-cta-box">
              <h3 className="mb-3 font-[family-name:var(--font-dm-serif)] text-[30px] leading-[1.2] text-[var(--text)] max-[768px]:text-2xl">
                {as.landing.ctaTitle}
              </h3>
              <p className="mx-auto mb-7 max-w-[480px] text-[14.5px] leading-[1.65] text-[var(--text-light)]">
                {as.landing.ctaSub}
              </p>
              <button
                type="button"
                onClick={() => goToStep("basic")}
                className="inline-flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-pill)] border-0 bg-[var(--green)] px-12 py-[18px] text-base font-semibold text-white shadow-[0_2px_12px_rgba(45,106,79,0.15)] transition-all hover:-translate-y-px hover:bg-[var(--green-dark)]"
              >
                {as.landing.cta}
                <ChevronRight className="scale-110" />
              </button>
            </div>
          </div>
        </>
      ) : null}

      {step === "basic" ? (
        <div className="mx-auto max-w-[760px] px-5 py-6">
          <ProgressTracker step="basic" steps={as.steps} />
          <div className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white px-8 py-9 max-[768px]:px-5">
            <h2 className="mb-1.5 font-[family-name:var(--font-dm-serif)] text-2xl text-[var(--text)]">{as.basic.title}</h2>
            <p className="mb-7 text-sm leading-snug text-[var(--text-light)]">
              {as.basic.subtitle}
            </p>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text-mid)]">{as.basic.fullName}</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={as.basic.fullNamePlaceholder}
                className="w-full rounded-[var(--radius)] border-[1.5px] border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.06)]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3.5 max-[768px]:grid-cols-1">
              <label className="mb-4 block">
                <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text-mid)]">{as.basic.email}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={as.basic.emailPlaceholder}
                  className="w-full rounded-[var(--radius)] border-[1.5px] border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.06)]"
                />
              </label>
              <label className="mb-4 block">
                <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text-mid)]">{as.basic.phone}</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={as.basic.phonePlaceholder}
                  className="w-full rounded-[var(--radius)] border-[1.5px] border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.06)]"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3.5 max-[768px]:grid-cols-1">
              <label className="mb-4 block">
                <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text-mid)]">{as.basic.nationality}</span>
                <select
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="as-select bidi-ltr w-full cursor-pointer rounded-[var(--radius)] border-[1.5px] border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.06)]"
                >
                  <option value="">{as.basic.select}</option>
                  {NATIONALITY_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mb-4 block">
                <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text-mid)]">{as.basic.country}</span>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="as-select bidi-ltr w-full cursor-pointer rounded-[var(--radius)] border-[1.5px] border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.06)]"
                >
                  <option value="">{as.basic.select}</option>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3.5 max-[768px]:grid-cols-1">
              <label className="mb-4 block">
                <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text-mid)]">{as.basic.schoolName}</span>
                <input
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder={as.basic.schoolPlaceholder}
                  className="w-full rounded-[var(--radius)] border-[1.5px] border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.06)]"
                />
              </label>
              <label className="mb-4 block">
                <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text-mid)]">{as.basic.gradeYear}</span>
                <select
                  value={gradeYear}
                  onChange={(e) => setGradeYear(e.target.value)}
                  className="as-select w-full cursor-pointer rounded-[var(--radius)] border-[1.5px] border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.06)]"
                >
                  <option value="">{as.basic.select}</option>
                  {VF_GRADE_YEAR_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {optLabel(gradeYearLabels, g)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {formNav(() => goToStep("landing"), () => goToStep("direction"), !basicValid)}
          </div>
        </div>
      ) : null}

      {step === "direction" ? (
        <div className="mx-auto max-w-[760px] px-5 py-6">
          <ProgressTracker step="direction" steps={as.steps} />
          <div className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white px-8 py-9 max-[768px]:px-5">
            <h2 className="mb-1.5 font-[family-name:var(--font-dm-serif)] text-2xl">{as.direction.title}</h2>
            <p className="mb-7 text-sm text-[var(--text-light)]">
              {as.direction.subtitle}
            </p>

            <div className="mb-3.5 text-[11px] font-bold uppercase tracking-wide text-[var(--green)]">
              {as.direction.whereStudy}
            </div>
            <p className="as-field-sub">{as.direction.whereStudySub}</p>
            <div className="as-chip-grid mb-6">
              {VF_DESTINATION_CHIPS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDestination(d)}
                  className={`as-chip ${destinations.includes(d) ? "as-selected" : ""}`}
                >
                  {optLabel(destinationLabels, d)}
                </button>
              ))}
            </div>

            {sectionLabel(as.direction.whatStudy)}
            <p className="as-field-sub">{as.direction.whatStudySub}</p>
            <div
              className="as-tag-input-wrap mb-2"
              onClick={() => document.getElementById("as-major-input")?.focus()}
              onKeyDown={() => {}}
              role="presentation"
            >
              {majors.map((m, i) => (
                <span key={m} className="as-tag-chip">
                  {m}
                  <button
                    type="button"
                    aria-label={formatTemplate(as.direction.removeMajor, { major: m })}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMajor(i);
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                id="as-major-input"
                value={majorInput}
                onChange={(e) => setMajorInput(e.target.value)}
                onKeyDown={onMajorKeyDown}
                placeholder={as.direction.majorPlaceholder}
                className="as-tag-input"
                autoComplete="off"
              />
            </div>
            <p className="as-field-sub" style={{ marginTop: 8 }}>
              {as.direction.notSureMajor}
            </p>

            {sectionLabel(as.direction.whenApply)}
            <div className="as-chip-grid mb-2">
              {VF_APPLY_TIMING_CHIPS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setApplyTiming(t)}
                  className={`as-chip ${applyTiming === t ? "as-selected" : ""}`}
                >
                  {optLabel(applyTimingLabels, t)}
                </button>
              ))}
            </div>

            {sectionLabel(as.direction.howClear)}
            <div className="as-opt-stack mb-2">
              {(
                [
                  { k: "clear" as const, ...as.direction.clarityOptions.clear },
                  { k: "some" as const, ...as.direction.clarityOptions.some },
                  { k: "help" as const, ...as.direction.clarityOptions.help },
                ] as const
              ).map(({ k, title, desc }) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPlanClarity(k)}
                  className={`as-opt-card ${planClarity === k ? "as-selected" : ""}`}
                >
                  <span className="as-opt-radio" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="as-opt-title block">{title}</span>
                    <span className="as-opt-desc block">{desc}</span>
                  </span>
                </button>
              ))}
            </div>

            {formNav(() => goToStep("basic"), () => goToStep("strategy"))}
          </div>
        </div>
      ) : null}

      {step === "strategy" ? (
        <div className="mx-auto max-w-[760px] px-5 py-6">
          <ProgressTracker step="strategy" steps={as.steps} />
          <div className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white px-8 py-9 max-[768px]:px-5">
            <h2 className="mb-1.5 font-[family-name:var(--font-dm-serif)] text-2xl">{as.strategy.title}</h2>
            <p className="mb-6 text-sm text-[var(--text-light)]">
              {as.strategy.subtitle}
            </p>

            <div className="mb-4 grid grid-cols-3 gap-4 max-[768px]:grid-cols-1">
              {(
                [
                  { n: 5 as const, desc: as.strategy.pack5, badge: false },
                  { n: 10 as const, desc: as.strategy.pack10, badge: true },
                  { n: 15 as const, desc: as.strategy.pack15, badge: false },
                ] as const
              ).map(({ n, desc, badge }) => {
                const available = planByCount.has(n);
                const sel = selectedPack === n;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={!available}
                    onClick={() => available && setSelectedPack(n)}
                    className={`as-pack-card relative rounded-[var(--radius-xl)] border-2 px-[22px] pb-6 pt-8 text-center transition-all ${
                      !available
                        ? "cursor-not-allowed opacity-45"
                        : "cursor-pointer hover:border-[var(--green-light)]"
                    } ${sel ? "as-selected border-[var(--green)] bg-[var(--green-pale)] shadow-[0_4px_20px_rgba(45,106,79,0.12)]" : "border-[var(--border-light)] bg-white"}`}
                  >
                    {badge ? (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-pill)] bg-[var(--green)] px-4 py-1 text-[10.5px] font-bold uppercase tracking-wide text-white">
                        {as.strategy.mostPopular}
                      </span>
                    ) : null}
                    <div className="font-[family-name:var(--font-dm-serif)] text-[44px] leading-none text-[var(--green)]">{n}</div>
                    <div className="mt-1 text-sm font-bold text-[var(--text)]">{as.strategy.universities}</div>
                    <p className="mx-auto mb-4 mt-2 min-h-[58px] max-w-[200px] text-[13px] leading-snug text-[var(--text-light)]">{desc}</p>
                    <span
                      className={`inline-block rounded-[var(--radius-pill)] border-[1.5px] px-6 py-2 text-xs font-semibold ${
                        sel
                          ? "border-[var(--green)] bg-[var(--green)] text-white"
                          : "border-[var(--border)] bg-white text-[var(--text-mid)]"
                      }`}
                    >
                      {as.strategy.select}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="as-included-compact">
              <div className="as-included-compact-title">{as.strategy.everyPackageIncludes}</div>
              <div className="as-included-compact-grid">
                {as.includedCompact.map((line) => (
                  <div key={line} className="as-included-compact-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {line}
                  </div>
                ))}
              </div>
            </div>

            {formNav(() => goToStep("direction"), () => goToStep("summary"), !strategyValid)}
          </div>
        </div>
      ) : null}

      {step === "summary" ? (
        <div className="mx-auto max-w-[760px] px-5 py-6">
          <ProgressTracker step="summary" steps={as.steps} />
          <div className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white px-8 py-9 max-[768px]:px-5">
            <div className="as-summary-hero">
              <div className="as-progress-pill">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
                {as.summary.pill}
              </div>
              <h2 className="as-summary-headline font-[family-name:var(--font-dm-serif)]">{as.summary.title}</h2>
              <p className="as-summary-narrative">{summaryNarrative}</p>
            </div>

            <div className="as-snapshot-eyebrow">{as.summary.snapshotEyebrow}</div>

            <div className="as-summary-grid">
              <div className={`as-summary-block as-full-row hero-block ${selectedPack ? "as-filled" : "as-empty"}`}>
                <div className="mb-2.5 flex items-center gap-2.5">
                  <div className="as-summary-block-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.8" aria-hidden>
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </div>
                  <span className="as-summary-block-label">{as.summary.applicationPlan}</span>
                </div>
                <div className="as-summary-block-value">
                  {selectedPack
                    ? formatTemplate(as.summary.universitiesCount, { count: selectedPack })
                    : as.summary.notSelected}
                </div>
                <p className="as-summary-block-sub">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  {as.summary.confirmedAfter}
                </p>
              </div>

              <div className={`as-summary-block ${snapDest.empty ? "as-empty" : "as-filled"}`}>
                <div className="mb-2.5 flex items-center gap-2.5">
                  <div className="as-summary-block-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.8" aria-hidden>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <span className="as-summary-block-label">{as.summary.whereStudy}</span>
                </div>
                <div className="as-summary-block-value">{snapDest.text}</div>
              </div>

              <div className={`as-summary-block ${snapField.empty ? "as-empty" : "as-filled"}`}>
                <div className="mb-2.5 flex items-center gap-2.5">
                  <div className="as-summary-block-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.8" aria-hidden>
                      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                    </svg>
                  </div>
                  <span className="as-summary-block-label">{as.summary.whatStudy}</span>
                </div>
                <div className="as-summary-block-value">{snapField.text}</div>
              </div>

              <div className={`as-summary-block as-full-row ${snapTiming.empty ? "as-empty" : "as-filled"}`}>
                <div className="mb-2.5 flex items-center gap-2.5">
                  <div className="as-summary-block-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.8" aria-hidden>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </div>
                  <span className="as-summary-block-label">{as.summary.timeline}</span>
                </div>
                <div className="as-summary-block-value">{snapTiming.text}</div>
              </div>
            </div>

            <div className="as-advisor-await">
              <div className="relative z-[1] flex shrink-0 items-center">
                {(["G", "S", "L"] as const).map((letter, i) => {
                  const bg =
                    i === 0
                      ? "bg-[var(--green-light)]"
                      : i === 2
                        ? "bg-[var(--green-dark)]"
                        : "bg-[var(--green)]";
                  return (
                    <div
                      key={letter}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-[2.5px] border-white font-[family-name:var(--font-dm-serif)] text-[15px] text-white shadow-sm ${bg} ${i === 0 ? "ms-0" : "-ms-3"}`}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
              <div className="relative z-[1] min-w-0 flex-1 max-[768px]:text-center">
                <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-[var(--green)]">
                  {as.summary.advisorReady}
                </div>
                <p className="text-[14.5px] font-semibold leading-snug text-[var(--green-dark)]">
                  {as.summary.advisorDesc}
                </p>
              </div>
            </div>

            <div className="pb-2 pt-3 text-center">
              <span className="mb-3.5 inline-block text-[11px] font-bold uppercase tracking-[1.6px] text-[var(--green)]">
                {as.summary.readyWhen}
              </span>
              <h3 className="mb-4 font-[family-name:var(--font-dm-serif)] text-[26px] leading-tight text-[var(--text)]">
                {as.summary.bookOnboarding}
              </h3>
              {submitError ? (
                <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-start text-sm text-red-800">
                  {submitError}
                </p>
              ) : null}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void goFromSummaryToPay()}
                className="as-btn-cta-hero mx-auto disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? as.summary.saving : as.summary.chooseTime}
                <ChevronRight />
              </button>
              <p className="mx-auto mt-3.5 max-w-[440px] text-[12.5px] leading-snug text-[var(--text-light)]">
                {as.summary.bookSub}
              </p>
            </div>

            <div className="mt-6 flex justify-start border-t border-[var(--border-light)] pt-5">
              <button
                type="button"
                onClick={() => goToStep("strategy")}
                className="cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white px-6 py-2.5 text-[13px] font-medium text-[var(--text-mid)] hover:border-[var(--text-mid)]"
              >
                {as.back}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === "pay" ? (
        <div className="mx-auto max-w-[1000px] px-5 py-6">
          <ProgressTracker step="pay" steps={as.steps} />
          <div className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white p-10 max-[768px]:p-6">
            <div className="as-pay-layout">
              <div className="min-w-0">
                <h2 className="mb-1.5 font-[family-name:var(--font-dm-serif)] text-2xl">{as.pay.title}</h2>
                <p className="mb-6 text-sm text-[var(--text-light)]">
                  {as.pay.subtitle}
                </p>
                <div className="mb-3 text-[15px] font-bold text-[var(--text)]">{as.pay.includesTitle}</div>
                <ul className="flex flex-col gap-3">
                  {as.pay.includes.map((line) => (
                    <li key={line} className="flex items-start gap-3 text-[13.5px] leading-snug text-[var(--text-mid)]">
                      <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="3" aria-hidden>
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>
                <div className="final-info-box mt-6 flex items-center gap-3 rounded-xl bg-[var(--green-pale)] px-[18px] py-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" aria-hidden>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                    </svg>
                  </div>
                  <p className="text-[13px] font-medium leading-snug text-[var(--green-dark)]">
                    {as.pay.noCommitment}
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                <div className="as-pay-summary">
                  <div className="mb-[18px] text-[15px] font-bold text-[var(--text)]">{as.pay.sessionDetails}</div>
                  <div className="flex items-center justify-between py-2 text-[13px]">
                    <span className="text-[var(--text-light)]">{as.pay.onboardingSession}</span>
                    <span className="font-semibold text-[var(--text)]">{as.pay.minutes45}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 text-[13px]">
                    <span className="text-[var(--text-light)]">{as.pay.selectedStrategy}</span>
                    <span className="rounded-[var(--radius-pill)] bg-[var(--sand)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-light)]">
                      {selectedPack
                        ? formatTemplate(as.summary.universitiesCount, { count: selectedPack })
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 text-[13px]">
                    <span className="text-[var(--text-light)]">{as.pay.format}</span>
                    <span className="font-semibold text-[var(--text)]">{as.pay.oneOnOne}</span>
                  </div>
                  <div className="my-3 h-px bg-[var(--border-light)]" />
                  <button
                    type="button"
                    onClick={() => goToStep("done")}
                    className="mb-3.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-pill)] border-0 bg-[var(--green)] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--green-dark)]"
                  >
                    {as.pay.bookSession}
                    <ChevronRight />
                  </button>
                  <div className="flex items-start gap-2 rounded-[10px] bg-[var(--green-pale)] px-3.5 py-3 text-[11.5px] leading-snug text-[var(--green-dark)]">
                    <svg width="14" height="14" className="mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" aria-hidden>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>{as.pay.calendlyNote}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-start">
              <button
                type="button"
                onClick={() => goToStep("summary")}
                className="cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white px-6 py-2.5 text-[13px] font-medium text-[var(--text-mid)]"
              >
                {as.back}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === "done" ? (
        <>
          <div className="mx-auto max-w-[1000px] px-5 py-6">
            <div className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white px-9 py-10 text-center max-[768px]:px-6">
              <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[var(--green-bg)]">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" aria-hidden>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <h2 className="mb-2.5 font-[family-name:var(--font-dm-serif)] text-[28px] text-[var(--text)]">
                {as.done.title}
              </h2>
              <p className="mx-auto max-w-[420px] text-sm leading-relaxed text-[var(--text-light)]">
                {as.done.subtitle}
              </p>
            </div>
          </div>

          <div className="as-calendly-wrap">
            <div className="as-calendly-embed-box shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              <CalendlyInlineEmbed url={calendlyUrl} title={as.done.calendlyTitle} />
            </div>
            <p className="mt-4 text-center text-xs text-[var(--text-hint)]">
              <a href={calendlyUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--green)] underline-offset-2 hover:underline">
                {as.done.openCalendar}
              </a>
            </p>
          </div>

          <div className="mx-auto max-w-[1000px] px-5 pb-16">
            <div className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white px-9 py-9 max-[768px]:px-6">
              <div className="rounded-[14px] bg-[var(--sand)] px-6 py-6">
                <div className="mb-3.5 text-[13px] font-bold uppercase tracking-wide text-[var(--text)]">
                  {as.done.whatNext}
                </div>
                <div className="flex flex-col gap-3.5">
                  {as.done.nextSteps.map((text, i) => (
                    <div key={text} className="flex items-start gap-3.5">
                      <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] text-[11px] font-bold text-[var(--green)]">
                        {i + 1}
                      </div>
                      <p className="text-sm leading-snug text-[var(--text-mid)]">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/student"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--green)] px-9 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--green-dark)]"
                >
                  {as.done.goToDashboard}
                  <ChevronRight />
                </Link>
                <button
                  type="button"
                  onClick={() => goToStep("pay")}
                  className="cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white px-6 py-3 text-sm font-medium text-[var(--text-mid)] hover:border-[var(--text-mid)]"
                >
                  {as.back}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
