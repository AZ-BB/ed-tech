"use client";

import {
  submitApplicationSupport,
  type ApplicationSupportPayload,
} from "@/actions/application-support";
import type { Database } from "@/database.types";
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
import "../application-support.css";
import {
  COUNTRY_OPTIONS,
  NATIONALITY_OPTIONS,
  VF_APPLY_TIMING_CHIPS,
  VF_DESTINATION_CHIPS,
  VF_GRADE_YEAR_OPTIONS,
  VF_INCLUDED_COMPACT,
  VF_JOURNEY_STEPS,
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

const STEP_PROGRESS: Record<
  Exclude<Step, "landing" | "done">,
  { pct: number; label: string; stepOf: string }
> = {
  basic: { pct: 20, label: "Basic information", stepOf: "Step 1 of 5" },
  direction: { pct: 40, label: "Your direction", stepOf: "Step 2 of 5" },
  strategy: { pct: 60, label: "Application strategy", stepOf: "Step 3 of 5" },
  summary: { pct: 80, label: "Your plan", stepOf: "Step 4 of 5" },
  pay: { pct: 100, label: "Book your session", stepOf: "Step 5 of 5" },
};

const VALUE_CARDS = [
  {
    title: "University Strategy",
    desc: "Personalized shortlist tailored to your profile, goals, and budget.",
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
    title: "Essay Guidance",
    desc: "Brainstorming, drafting, and refining every essay across multiple rounds.",
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
    title: "Application Review",
    desc: "Thorough review of every form and document before you submit.",
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
    title: "CV & Profile",
    desc: "Compelling CV and activity list that strengthens your candidacy.",
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
    title: "Document Prep",
    desc: "Help gathering, organizing, and verifying all required documents on time.",
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
    title: "Progress Tracking",
    desc: "Real-time visibility into where each application stands.",
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
    title: "Visa Guidance",
    desc: "What visa you need, when to start, and which documents to prepare.",
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
    title: "Peer Network",
    desc: "Connect with students from your region at the same university.",
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
    title: "Ongoing Check-ins",
    desc: "Regular meetings and follow-ups until you're settled at university.",
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

const HERO_TRACKER_ROWS = [
  { label: "University Strategy", pct: 100, stage: "Complete", kind: "done" as const },
  { label: "Essay Guidance", pct: 70, stage: "In progress", kind: "prog" as const },
  { label: "Document Prep", pct: 25, stage: "Upcoming", kind: "up" as const },
  { label: "Visa & Arrival", pct: 0, stage: "Upcoming", kind: "up" as const },
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
      className={className}
      aria-hidden
    >
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function ProgressTracker({
  step,
}: {
  step: Exclude<Step, "landing" | "done">;
}) {
  const p = STEP_PROGRESS[step];
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
      showToast("This major is already in your list");
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
      setSubmitError("Something went wrong. Please try again.");
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
    if (planClarity === "help") {
      return "We've captured where you are today. In your onboarding session, your advisor will help you figure out the rest — what to study, where to go, and how to get there.";
    }
    if (planClarity === "clear") {
      return "We've captured your direction. In your onboarding session, we'll sharpen your list, pressure-test your strategy, and map every deadline.";
    }
    return "We've taken your inputs and built a clear starting point. In your onboarding session, we'll refine everything and map out your full application strategy.";
  }, [planClarity]);

  const snapDest = useMemo(() => {
    if (!destinations.length) {
      return {
        text: "We'll help you figure this out with your advisor",
        empty: true,
      };
    }
    const cleaned = destinations.filter((d) => d !== "Not sure yet");
    if (cleaned.length > 0) {
      return { text: cleaned.join(", "), empty: false };
    }
    return {
      text: "We'll help you figure this out with your advisor",
      empty: true,
    };
  }, [destinations]);

  const snapField = useMemo(() => {
    const cleaned = majors.filter((m) => m.toLowerCase() !== "not sure yet");
    if (cleaned.length > 0) {
      return { text: cleaned.join(", "), empty: false };
    }
    return {
      text: "We'll help you explore the right direction",
      empty: true,
    };
  }, [majors]);

  const snapTiming = useMemo(() => {
    const empty = !applyTiming || applyTiming === "Not sure yet";
    return {
      text: empty ? "We'll figure this out together" : applyTiming!,
      empty,
    };
  }, [applyTiming]);

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
        Back
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
        Continue
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
          <section className="as-hero relative overflow-hidden bg-[var(--green-pale)] px-10 py-20 max-[768px]:px-5 max-[768px]:py-[60px]">
            <div className="as-hero-inner">
              <div className="max-[768px]:text-center">
                <div className="mb-6 inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[rgba(45,106,79,0.12)] bg-white px-[18px] py-1.5 text-xs font-semibold text-[var(--green)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" aria-hidden>
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <path d="M22 4L12 14.01l-3-3" />
                  </svg>
                  Premium Service
                </div>
                <h1 className="mb-[18px] font-[family-name:var(--font-dm-serif)] text-[48px] leading-[1.1] text-[var(--text)] max-[768px]:text-[34px]">
                  End-to-end support for your{" "}
                  <em className="italic text-[var(--green)]">university applications</em>
                </h1>
                <p className="max-w-[480px] text-[17px] leading-[1.7] text-[var(--text-light)] max-[768px]:mx-auto">
                  From choosing the right universities to preparing strong applications, we guide you through every step so nothing is missed. You stay in control. We support you throughout the journey.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-[18px] max-[768px]:justify-center">
                  <button
                    type="button"
                    onClick={() => goToStep("basic")}
                    className="inline-flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-pill)] border-0 bg-[var(--green)] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(45,106,79,0.15)] transition-all hover:-translate-y-px hover:bg-[var(--green-dark)]"
                  >
                    Start your application journey
                    <ChevronRight />
                  </button>
                  <span className="text-xs text-[var(--text-hint)]">Takes around 5 minutes</span>
                </div>
              </div>

              <div className="as-hero-visual max-[768px]:hidden">
                <div className="as-hero-card">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="text-sm font-bold text-[var(--text)]">Your application journey</div>
                    <div className="rounded-[var(--radius-pill)] bg-[var(--green-bg)] px-2.5 py-1 text-[10.5px] font-bold tracking-wide text-[var(--green)]">
                      On track
                    </div>
                  </div>
                  <div className="mb-[18px] text-xs text-[var(--text-light)]">
                    A clear view of where you stand, every step of the way.
                  </div>
                  {HERO_TRACKER_ROWS.map((row) => (
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
              What&apos;s Included
            </div>
            <h2 className="mb-2.5 mt-3 font-[family-name:var(--font-dm-serif)] text-4xl leading-[1.15] text-[var(--text)] max-[768px]:text-center max-[768px]:text-[26px]">
              Everything you need. Nothing left to chance.
            </h2>
            <p className="mb-10 text-[15px] text-[var(--text-light)] max-[768px]:text-center">
              Every element of the application process is covered.
            </p>
            <div className="mb-10 grid grid-cols-3 gap-4 max-[768px]:grid-cols-1">
              {VALUE_CARDS.map((c) => (
                <div
                  key={c.title}
                  className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white p-7 text-left transition-all hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
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
              {["Dedicated team", "Proven approach", "Honest guidance"].map((t) => (
                <div key={t} className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-light)]">
                  <span className="h-[7px] w-[7px] rounded-full bg-[var(--green-bright)]" />
                  {t}
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
              <strong className="font-bold">You submit your applications yourself.</strong> We guide and support you through every step — the final submit stays in your hands.
            </p>
          </div>

          <div className="as-journey-section">
            <h3 className="as-journey-title font-[family-name:var(--font-dm-serif)]">How it works</h3>
            <p className="as-journey-sub">A clear path from your first conversation to your first day on campus.</p>
            <div className="as-journey-steps">
              {VF_JOURNEY_STEPS.map((text, i) => (
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
                Ready to start your application journey?
              </h3>
              <p className="mx-auto mb-7 max-w-[480px] text-[14.5px] leading-[1.65] text-[var(--text-light)]">
                Tell us where you stand today and we&apos;ll help you build a clear path forward.
              </p>
              <button
                type="button"
                onClick={() => goToStep("basic")}
                className="inline-flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-pill)] border-0 bg-[var(--green)] px-12 py-[18px] text-base font-semibold text-white shadow-[0_2px_12px_rgba(45,106,79,0.15)] transition-all hover:-translate-y-px hover:bg-[var(--green-dark)]"
              >
                Start your application journey
                <ChevronRight className="scale-110" />
              </button>
            </div>
          </div>
        </>
      ) : null}

      {step === "basic" ? (
        <div className="mx-auto max-w-[760px] px-5 py-6">
          <ProgressTracker step="basic" />
          <div className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white px-8 py-9 max-[768px]:px-5">
            <h2 className="mb-1.5 font-[family-name:var(--font-dm-serif)] text-2xl text-[var(--text)]">Tell us about yourself</h2>
            <p className="mb-7 text-sm leading-snug text-[var(--text-light)]">
              We&apos;ll use this to understand your background and personalize your support.
            </p>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text-mid)]">Full name</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="First Last"
                className="w-full rounded-[var(--radius)] border-[1.5px] border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.06)]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3.5 max-[768px]:grid-cols-1">
              <label className="mb-4 block">
                <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text-mid)]">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-[var(--radius)] border-[1.5px] border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.06)]"
                />
              </label>
              <label className="mb-4 block">
                <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text-mid)]">Phone number</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+971 XX XXX XXXX"
                  className="w-full rounded-[var(--radius)] border-[1.5px] border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.06)]"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3.5 max-[768px]:grid-cols-1">
              <label className="mb-4 block">
                <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text-mid)]">Nationality</span>
                <select
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="as-select w-full cursor-pointer rounded-[var(--radius)] border-[1.5px] border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.06)]"
                >
                  <option value="">Select</option>
                  {NATIONALITY_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mb-4 block">
                <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text-mid)]">Country of residence</span>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="as-select w-full cursor-pointer rounded-[var(--radius)] border-[1.5px] border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.06)]"
                >
                  <option value="">Select</option>
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
                <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text-mid)]">School name</span>
                <input
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Enter your school name"
                  className="w-full rounded-[var(--radius)] border-[1.5px] border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.06)]"
                />
              </label>
              <label className="mb-4 block">
                <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text-mid)]">Current grade / year</span>
                <select
                  value={gradeYear}
                  onChange={(e) => setGradeYear(e.target.value)}
                  className="as-select w-full cursor-pointer rounded-[var(--radius)] border-[1.5px] border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.06)]"
                >
                  <option value="">Select</option>
                  {VF_GRADE_YEAR_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
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
          <ProgressTracker step="direction" />
          <div className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white px-8 py-9 max-[768px]:px-5">
            <h2 className="mb-1.5 font-[family-name:var(--font-dm-serif)] text-2xl">Your application direction</h2>
            <p className="mb-7 text-sm text-[var(--text-light)]">
              This helps us shape a plan around where and what you want to study.
            </p>

            <div className="mb-3.5 text-[11px] font-bold uppercase tracking-wide text-[var(--green)]">
              Where do you want to study?
            </div>
            <p className="as-field-sub">Select as many as apply. You can refine this later.</p>
            <div className="as-chip-grid mb-6">
              {VF_DESTINATION_CHIPS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDestination(d)}
                  className={`as-chip ${destinations.includes(d) ? "as-selected" : ""}`}
                >
                  {d}
                </button>
              ))}
            </div>

            {sectionLabel("What do you want to study?")}
            <p className="as-field-sub">Type a major and press Enter. Add as many as you like.</p>
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
                    aria-label={`Remove ${m}`}
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
                placeholder="e.g. Computer Science"
                className="as-tag-input"
                autoComplete="off"
              />
            </div>
            <p className="as-field-sub" style={{ marginTop: 8 }}>
              Not sure yet? That&apos;s completely fine — we&apos;ll help you narrow it down.
            </p>

            {sectionLabel("When are you planning to apply?")}
            <div className="as-chip-grid mb-2">
              {VF_APPLY_TIMING_CHIPS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setApplyTiming(t)}
                  className={`as-chip ${applyTiming === t ? "as-selected" : ""}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {sectionLabel("How clear are you on your plan?")}
            <div className="as-opt-stack mb-2">
              {(
                [
                  {
                    k: "clear" as const,
                    title: "I know exactly what I want",
                    desc: "I have specific universities and a clear direction.",
                  },
                  {
                    k: "some" as const,
                    title: "I have some ideas",
                    desc: "I have a general direction but want help refining it.",
                  },
                  {
                    k: "help" as const,
                    title: "I need help figuring it out",
                    desc: "I'm starting from scratch and need guidance.",
                  },
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
          <ProgressTracker step="strategy" />
          <div className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white px-8 py-9 max-[768px]:px-5">
            <h2 className="mb-1.5 font-[family-name:var(--font-dm-serif)] text-2xl">Choose your application strategy</h2>
            <p className="mb-6 text-sm text-[var(--text-light)]">
              How many universities would you like support with? You can confirm your final plan after your onboarding session.
            </p>

            <div className="mb-4 grid grid-cols-3 gap-4 max-[768px]:grid-cols-1">
              {(
                [
                  { n: 5 as const, desc: "Best for focused applications with a clear shortlist.", badge: false },
                  { n: 10 as const, desc: "Balanced approach for the strongest chances of acceptance.", badge: true },
                  { n: 15 as const, desc: "Maximize your chances across more programs and countries.", badge: false },
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
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-pill)] bg-[var(--green)] px-4 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                        Most popular
                      </span>
                    ) : null}
                    <div className="font-[family-name:var(--font-dm-serif)] text-[44px] leading-none text-[var(--green)]">{n}</div>
                    <div className="mt-1 text-sm font-bold text-[var(--text)]">Universities</div>
                    <p className="mx-auto mb-4 mt-2 min-h-[58px] max-w-[200px] text-[13px] leading-snug text-[var(--text-light)]">{desc}</p>
                    <span
                      className={`inline-block rounded-[var(--radius-pill)] border-[1.5px] px-6 py-2 text-xs font-semibold ${
                        sel
                          ? "border-[var(--green)] bg-[var(--green)] text-white"
                          : "border-[var(--border)] bg-white text-[var(--text-mid)]"
                      }`}
                    >
                      Select
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="as-included-compact">
              <div className="as-included-compact-title">Every package includes</div>
              <div className="as-included-compact-grid">
                {VF_INCLUDED_COMPACT.map((line) => (
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
          <ProgressTracker step="summary" />
          <div className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white px-8 py-9 max-[768px]:px-5">
            <div className="as-summary-hero">
              <div className="as-progress-pill">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
                You&apos;re minutes away from getting started
              </div>
              <h2 className="as-summary-headline font-[family-name:var(--font-dm-serif)]">Your plan is ready</h2>
              <p className="as-summary-narrative">{summaryNarrative}</p>
            </div>

            <div className="as-snapshot-eyebrow">Your plan so far</div>

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
                  <span className="as-summary-block-label">Application plan</span>
                </div>
                <div className="as-summary-block-value">
                  {selectedPack ? `${selectedPack} universities` : "Not selected yet"}
                </div>
                <p className="as-summary-block-sub">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  Final package confirmed after onboarding
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
                  <span className="as-summary-block-label">Where you want to study</span>
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
                  <span className="as-summary-block-label">What you want to study</span>
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
                  <span className="as-summary-block-label">Your timeline</span>
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
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-[2.5px] border-white font-[family-name:var(--font-dm-serif)] text-[15px] text-white shadow-sm ${bg} ${i === 0 ? "ml-0" : "-ml-3"}`}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
              <div className="relative z-[1] min-w-0 flex-1 max-[768px]:text-center">
                <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-[var(--green)]">
                  Your advisor is ready
                </div>
                <p className="text-[14.5px] font-semibold leading-snug text-[var(--green-dark)]">
                  A real person who has helped students just like you get into top universities. In your onboarding session, we&apos;ll refine your list, build your strategy, and map every deadline.
                </p>
              </div>
            </div>

            <div className="pb-2 pt-3 text-center">
              <span className="mb-3.5 inline-block text-[11px] font-bold uppercase tracking-[1.6px] text-[var(--green)]">
                Ready when you are
              </span>
              <h3 className="mb-4 font-[family-name:var(--font-dm-serif)] text-[26px] leading-tight text-[var(--text)]">
                Let&apos;s book your onboarding
              </h3>
              {submitError ? (
                <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-800">
                  {submitError}
                </p>
              ) : null}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void goFromSummaryToPay()}
                className="as-btn-cta-hero mx-auto disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving…" : "Choose your session time"}
                <ChevronRight />
              </button>
              <p className="mx-auto mt-3.5 max-w-[440px] text-[12.5px] leading-snug text-[var(--text-light)]">
                Pick a time that works for you and meet your dedicated advisor — we&apos;ll map out your full plan together.
              </p>
            </div>

            <div className="mt-6 flex justify-start border-t border-[var(--border-light)] pt-5">
              <button
                type="button"
                onClick={() => goToStep("strategy")}
                className="cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white px-6 py-2.5 text-[13px] font-medium text-[var(--text-mid)] hover:border-[var(--text-mid)]"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === "pay" ? (
        <div className="mx-auto max-w-[1000px] px-5 py-6">
          <ProgressTracker step="pay" />
          <div className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white p-10 max-[768px]:p-6">
            <div className="as-pay-layout">
              <div className="min-w-0">
                <h2 className="mb-1.5 font-[family-name:var(--font-dm-serif)] text-2xl">Ready to book your onboarding session</h2>
                <p className="mb-6 text-sm text-[var(--text-light)]">
                  Choose a time that works for you and meet your dedicated advisor to map out your full application plan.
                </p>
                <div className="mb-3 text-[15px] font-bold text-[var(--text)]">What your onboarding includes</div>
                <ul className="flex flex-col gap-3">
                  {[
                    "A 45-minute one-on-one session with your dedicated advisor",
                    "A full review of your profile, goals, and current materials",
                    "A personalized action plan for your applications",
                    "Honest answers to every question about the journey ahead",
                  ].map((line) => (
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
                    There&apos;s no commitment today. You&apos;ll discuss your plan and next steps with your advisor during the session.
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                <div className="as-pay-summary">
                  <div className="mb-[18px] text-[15px] font-bold text-[var(--text)]">Session details</div>
                  <div className="flex items-center justify-between py-2 text-[13px]">
                    <span className="text-[var(--text-light)]">Onboarding session</span>
                    <span className="font-semibold text-[var(--text)]">45 minutes</span>
                  </div>
                  <div className="flex items-center justify-between py-2 text-[13px]">
                    <span className="text-[var(--text-light)]">Selected strategy</span>
                    <span className="rounded-[var(--radius-pill)] bg-[var(--sand)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-light)]">
                      {selectedPack ? `${selectedPack} universities` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 text-[13px]">
                    <span className="text-[var(--text-light)]">Format</span>
                    <span className="font-semibold text-[var(--text)]">One-on-one with your advisor</span>
                  </div>
                  <div className="my-3 h-px bg-[var(--border-light)]" />
                  <button
                    type="button"
                    onClick={() => goToStep("done")}
                    className="mb-3.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-pill)] border-0 bg-[var(--green)] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--green-dark)]"
                  >
                    Book your session
                    <ChevronRight />
                  </button>
                  <div className="flex items-start gap-2 rounded-[10px] bg-[var(--green-pale)] px-3.5 py-3 text-[11.5px] leading-snug text-[var(--green-dark)]">
                    <svg width="14" height="14" className="mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" aria-hidden>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>Pick your time on the next step — you&apos;ll get a calendar invite and confirmation by email.</span>
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
                Back
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
                Pick your onboarding time
              </h2>
              <p className="mx-auto max-w-[420px] text-sm leading-relaxed text-[var(--text-light)]">
                Choose a slot that works for you below. You&apos;ll get a calendar invite and confirmation email within minutes.
              </p>
            </div>
          </div>

          <div className="as-calendly-wrap">
            <div className="as-calendly-embed-box shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              <CalendlyInlineEmbed url={calendlyUrl} title="Book your onboarding session — Calendly" />
            </div>
            <p className="mt-4 text-center text-xs text-[var(--text-hint)]">
              <a href={calendlyUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--green)] underline-offset-2 hover:underline">
                Open calendar in a new tab
              </a>
            </p>
          </div>

          <div className="mx-auto max-w-[1000px] px-5 pb-16">
            <div className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white px-9 py-9 max-[768px]:px-6">
              <div className="rounded-[14px] bg-[var(--sand)] px-6 py-6">
                <div className="mb-3.5 text-[13px] font-bold uppercase tracking-wide text-[var(--text)]">
                  What happens next
                </div>
                <div className="flex flex-col gap-3.5">
                  {[
                    "Pick a time above — you'll receive a calendar invite and confirmation email within minutes",
                    "Your advisor will review everything you shared before the session",
                    "During the session, we'll turn your inputs into a clear, personalized action plan",
                    "After the session, you'll decide on your final package and we'll continue the journey together",
                  ].map((text, i) => (
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
                  Go to dashboard
                  <ChevronRight />
                </Link>
                <button
                  type="button"
                  onClick={() => goToStep("pay")}
                  className="cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white px-6 py-3 text-sm font-medium text-[var(--text-mid)] hover:border-[var(--text-mid)]"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
