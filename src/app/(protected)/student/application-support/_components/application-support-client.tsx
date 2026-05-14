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
  useRef,
  useState,
  type ReactNode,
} from "react";

import { CalendlyInlineEmbed } from "@/components/calendly-inline-embed";
import { buildCalendlySchedulingPageUrl } from "@/lib/calendly-scheduling";
import "../application-support.css";
import {
  COUNTRY_OPTIONS,
  NATIONALITY_OPTIONS,
  POPULAR_UNIVERSITIES,
  VF_APPLY_TIMING_CHIPS,
  VF_DESTINATION_CHIPS,
  VF_FIELD_OF_STUDY_SUGGESTIONS,
  VF_GRADE_YEAR_OPTIONS,
  VF_INCLUDED_COMPACT,
  VF_JOURNEY_STEPS,
  type PopularUni,
} from "../_data/application-support-options";

type PlanRow = Database["public"]["Tables"]["applications_plans"]["Row"];

/** Display only — server uses same constant in application-support action */
const ONBOARDING_DEPOSIT_AED = 200;

type Step =
  | "landing"
  | "basic"
  | "direction"
  | "strategy"
  | "universities"
  | "documents"
  | "summary"
  | "booking"
  | "schedule";

type DocSlot = "transcript" | "ps" | "cv" | "english";
type UniIntent = "shortlist" | "ideas" | "help";
type PlanClarity = "clear" | "some" | "help";

type FileMeta = { file: File; label: string };

const STEP_PROGRESS: Record<
  Exclude<Step, "landing" | "schedule">,
  { pct: number; label: string; stepOf: string }
> = {
  basic: { pct: 12, label: "Basic information", stepOf: "Step 1 of 7" },
  direction: { pct: 25, label: "Your direction", stepOf: "Step 2 of 7" },
  strategy: { pct: 38, label: "Application strategy", stepOf: "Step 3 of 7" },
  universities: { pct: 50, label: "Your universities", stepOf: "Step 4 of 7" },
  documents: { pct: 62, label: "Documents", stepOf: "Step 5 of 7" },
  summary: { pct: 78, label: "Your plan", stepOf: "Step 6 of 7" },
  booking: { pct: 100, label: "Book your session", stepOf: "Step 7 of 7" },
};

const VALUE_CARDS: { title: string; desc: string; tint: string }[] = [
  {
    title: "University Strategy",
    desc: "Personalized shortlist tailored to your profile, goals, and budget.",
    tint: "bg-[#e8f1ec]",
  },
  {
    title: "Essay Guidance",
    desc: "Brainstorming, drafting, and refining every essay across multiple rounds.",
    tint: "bg-[#ecebf5]",
  },
  {
    title: "Application Review",
    desc: "Thorough review of every form and document before you submit.",
    tint: "bg-[#e8eff5]",
  },
  {
    title: "CV & Profile",
    desc: "Compelling CV and activity list that strengthens your candidacy.",
    tint: "bg-[#f0ebe3]",
  },
  {
    title: "Document Prep",
    desc: "Help gathering, organizing, and verifying all required documents on time.",
    tint: "bg-[#f7f1d9]",
  },
  {
    title: "Progress Tracking",
    desc: "Real-time visibility into where each application stands.",
    tint: "bg-[#e6f1ec]",
  },
  {
    title: "Visa Guidance",
    desc: "What visa you need, when to start, and which documents to prepare.",
    tint: "bg-[#f4e8e3]",
  },
  {
    title: "Peer Network",
    desc: "Connect with students from your region at the same university.",
    tint: "bg-[#e5ecf3]",
  },
  {
    title: "Ongoing Check-ins",
    desc: "Regular meetings and follow-ups until you're settled at university.",
    tint: "bg-[#efe9f4]",
  },
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
  step: Exclude<Step, "landing" | "schedule">;
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
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [applyTiming, setApplyTiming] = useState<string | null>(null);
  const [planClarity, setPlanClarity] = useState<PlanClarity | null>(null);

  const [selectedPack, setSelectedPack] = useState<5 | 10 | 15 | null>(null);

  const [uniIntent, setUniIntent] = useState<UniIntent | null>(null);
  const [uniSlots, setUniSlots] = useState<string[]>([]);
  const [uniNotes, setUniNotes] = useState("");

  const [docFiles, setDocFiles] = useState<Partial<Record<DocSlot, FileMeta>>>(
    {},
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingDocRef = useRef<DocSlot | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!selectedPack) {
      setUniSlots([]);
      return;
    }
    setUniSlots((prev) => {
      const next = [...prev];
      if (next.length < selectedPack) {
        while (next.length < selectedPack) next.push("");
      } else if (next.length > selectedPack) {
        next.length = selectedPack;
      }
      return next;
    });
  }, [selectedPack]);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  const filledUnis = useMemo(
    () =>
      uniSlots
        .map((name, index) => ({ name: name.trim(), index }))
        .filter((x) => x.name),
    [uniSlots],
  );

  const isDuplicateUni = useCallback(
    (name: string, excludeIndex: number) => {
      const l = name.trim().toLowerCase();
      if (!l) return false;
      return filledUnis.some(
        (u) => u.name.toLowerCase() === l && u.index !== excludeIndex,
      );
    },
    [filledUnis],
  );

  const uniNameAlreadyListed = useCallback(
    (name: string) => {
      const l = name.trim().toLowerCase();
      if (!l) return false;
      return filledUnis.some((u) => u.name.toLowerCase() === l);
    },
    [filledUnis],
  );

  const setUniAt = (i: number, value: string) => {
    if (value.trim() && isDuplicateUni(value, i)) {
      showToast("This university is already in your list");
      setUniSlots((prev) => {
        const next = [...prev];
        next[i] = "";
        return next;
      });
      return;
    }
    setUniSlots((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  };

  const toggleDestination = (label: string) => {
    setDestinations((prev) =>
      prev.includes(label) ? prev.filter((d) => d !== label) : [...prev, label],
    );
  };

  const pickTiming = (label: string) => {
    setApplyTiming(label);
  };

  function buildPayload(): ApplicationSupportPayload {
    if (!selectedPack) {
      throw new Error("Package required");
    }
    const universities =
      uniIntent === "help" ? [] : filledUnis.map((u) => u.name);
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
      fieldOfStudy: fieldOfStudy.trim(),
      applyTiming,
      planClarity,
      universities,
      uniNotes: uniNotes.trim(),
      uniIntent,
    };
  }

  function appendDocs(fd: FormData) {
    const map: Record<DocSlot, string> = {
      transcript: "doc_transcript",
      ps: "doc_ps",
      cv: "doc_cv",
      english: "doc_english",
    };
    for (const slot of Object.keys(map) as DocSlot[]) {
      const meta = docFiles[slot];
      if (meta?.file) fd.append(map[slot], meta.file);
    }
  }

  async function persistApplication(): Promise<boolean> {
    if (applicationId != null) return true;
    if (!selectedPack) return false;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const fd = new FormData();
      fd.set("payload", JSON.stringify(buildPayload()));
      appendDocs(fd);
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

  async function goFromSummaryToBooking() {
    const ok = await persistApplication();
    if (ok) setStep("booking");
  }

  const openDocPicker = (slot: DocSlot) => {
    pendingDocRef.current = slot;
    fileInputRef.current?.click();
  };

  const onDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const slot = pendingDocRef.current;
    const f = e.target.files?.[0];
    pendingDocRef.current = null;
    e.target.value = "";
    if (!slot || !f) return;
    setDocFiles((prev) => ({
      ...prev,
      [slot]: { file: f, label: f.name },
    }));
  };

  const removeDoc = (slot: DocSlot) => {
    setDocFiles((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  };

  function addPopularUni(u: PopularUni) {
    if (uniNameAlreadyListed(u.name)) {
      showToast("This university is already in your list");
      return;
    }
    const max = selectedPack ?? 10;
    const emptyIdx = uniSlots.findIndex((s) => !s.trim());
    if (emptyIdx === -1) {
      showToast(`All ${max} slots are filled. Remove one to add another.`);
      return;
    }
    setUniAt(emptyIdx, u.name);
  }

  const basicValid =
    Boolean(
      fullName.trim() &&
        email.trim() &&
        phone.trim() &&
        nationality &&
        country &&
        schoolName.trim() &&
        gradeYear,
    );

  const strategyValid = selectedPack != null;

  const summaryHeadline = useMemo(() => {
    const first = fullName.trim().split(/\s+/)[0];
    return first
      ? `Your plan is ready, ${first}`
      : "Your personalized application plan is ready";
  }, [fullName]);

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
    const v = fieldOfStudy.trim();
    if (v && v.toLowerCase() !== "not sure yet") {
      return { text: v, empty: false };
    }
    return {
      text: "We'll help you explore the right direction",
      empty: true,
    };
  }, [fieldOfStudy]);

  const snapUnis = useMemo(() => {
    if (uniIntent === "help") {
      return { text: "We'll build this with your advisor", empty: true };
    }
    if (!filledUnis.length) {
      return {
        text: "We'll help you build this with your advisor",
        empty: true,
      };
    }
    if (filledUnis.length === 1) {
      return { text: filledUnis[0].name, empty: false };
    }
    return {
      text: `${filledUnis[0].name} + ${filledUnis.length - 1} more`,
      empty: false,
    };
  }, [uniIntent, filledUnis]);

  const snapDocs = useMemo(() => {
    const n = Object.keys(docFiles).length;
    if (n === 0) {
      return {
        text: "No problem — we'll guide you on what to prepare",
        empty: true,
      };
    }
    return { text: `${n} of 4 uploaded`, empty: false };
  }, [docFiles]);

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
    if (fieldOfStudy.trim()) ctx.push(`Field: ${fieldOfStudy.trim()}`);
    if (selectedPack) ctx.push(`Strategy: ${selectedPack} universities`);
    if (applyTiming) ctx.push(`Timing: ${applyTiming}`);
    if (planClarity) ctx.push(`Clarity: ${planClarity}`);
    if (uniIntent) ctx.push(`Uni intent: ${uniIntent}`);
    if (applicationId != null) ctx.push(`Application ref: #${applicationId}`);
    return buildCalendlySchedulingPageUrl({
      name: fullName.trim(),
      email: email.trim(),
      ctxParts: ctx,
    });
  }, [
    destinations,
    fieldOfStudy,
    selectedPack,
    applyTiming,
    planClarity,
    uniIntent,
    applicationId,
    fullName,
    email,
  ]);

  const showUniInputs = uniIntent !== "help";

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

  const docRow = (
    slot: DocSlot,
    title: ReactNode,
    helper: string,
    optional?: boolean,
  ) => {
    const meta = docFiles[slot];
    const uploaded = Boolean(meta);
    return (
      <div
        className={`mb-2.5 flex items-center gap-4 rounded-xl border border-[var(--border-light)] px-5 py-4 transition-colors ${
          uploaded ? "as-doc-card as-uploaded bg-[var(--green-pale)]" : "bg-white hover:border-[var(--green-light)]"
        }`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--sand)]">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2D6A4F"
            strokeWidth="1.8"
            aria-hidden
          >
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--text)]">
            {title}
            {optional ? (
              <span className="rounded-[var(--radius-pill)] bg-[var(--sand)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--text-hint)]">
                Optional
              </span>
            ) : null}
          </div>
          <div
            className={`mt-1 text-xs ${uploaded ? "font-medium text-[var(--green)]" : "text-[var(--text-hint)]"}`}
          >
            {uploaded ? (
              <>
                Uploaded — {meta!.label}
              </>
            ) : (
              helper
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {uploaded ? (
            <>
              <button
                type="button"
                onClick={() => openDocPicker(slot)}
                className="cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white px-5 py-2 text-xs font-semibold text-[var(--text-mid)] hover:border-[var(--green)] hover:text-[var(--green)]"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => removeDoc(slot)}
                className="cursor-pointer text-xs text-[var(--text-hint)] underline-offset-2 hover:text-red-600 hover:underline"
              >
                Remove
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => openDocPicker(slot)}
              className="cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white px-5 py-2 text-xs font-semibold text-[var(--text-mid)] hover:border-[var(--green)] hover:text-[var(--green)]"
            >
              Upload
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div id="application-support-scope" className="pb-16 font-[family-name:var(--font-dm-sans)]">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt"
        onChange={onDocFileChange}
      />

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
          <section className="as-hero relative overflow-hidden bg-[var(--green-pale)] px-10 py-[70px] text-center max-[768px]:px-5 max-[768px]:py-12">
            <div className="relative z-[1] mb-6 inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[rgba(45,106,79,0.12)] bg-white px-[18px] py-1.5 text-xs font-semibold text-[var(--green)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" aria-hidden>
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
              Premium Service
            </div>
            <h1 className="relative z-[1] mx-auto font-bold mb-4 max-w-[600px] font-[family-name:var(--font-dm-serif)] text-[48px] leading-[1.1] text-[var(--text)] max-[768px]:text-[34px]">
              End-to-end support for your{" "}
              <em className="italic text-[var(--green)]">university applications</em>
            </h1>
            <p className="relative z-[1] mx-auto max-w-[540px] text-[17px] leading-relaxed text-[var(--text-light)]">
              From choosing the right universities to preparing strong applications, we guide you through every step so nothing is missed. You stay in control. We support you throughout the journey.
            </p>
            <div className="relative z-[1] mt-7">
              <button
                type="button"
                onClick={() => setStep("basic")}
                className="inline-flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-pill)] border-0 bg-[var(--green)] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(45,106,79,0.15)] transition-all hover:-translate-y-px hover:bg-[var(--green-dark)]"
              >
                Start your application journey
                <ChevronRight />
              </button>
            </div>
            <p className="relative z-[1] mt-3 text-xs text-[var(--text-hint)]">Takes around 5 minutes</p>
          </section>

          <div className="as-intro-section">
            <div className="as-intro-eyebrow">What This Service Is</div>
            <h2 className="as-intro-title font-[family-name:var(--font-dm-serif)]">
              A complete support program — not a one-time consultation
            </h2>
            <p className="as-intro-copy">
              We work with you throughout your application journey, from university strategy and essay development to document preparation, final checks, visa guidance, and post-acceptance support.
            </p>
          </div>

          <div className="mx-auto max-w-[1100px] px-10 pb-10 pt-4 max-[768px]:px-5">
            <div className="mb-3 text-left text-xs font-bold uppercase tracking-[1.5px] text-[var(--green)]">
              What&apos;s Included
            </div>
            <h3 className="mb-2.5 text-left font-[family-name:var(--font-dm-serif)] text-4xl leading-tight text-[var(--text)] max-[768px]:text-center max-[768px]:text-[26px]">
              Everything you need. Nothing left to chance.
            </h3>
            <p className="mb-10 text-left text-[15px] text-[var(--text-light)] max-[768px]:text-center">
              Every element of the application process is covered.
            </p>
            <div className="mb-10 grid grid-cols-3 gap-4 max-[768px]:grid-cols-1">
              {VALUE_CARDS.map((c) => (
                <div
                  key={c.title}
                  className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white p-7 text-left transition-all hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
                >
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${c.tint}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.8">
                      <circle cx="11" cy="11" r="7" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                  </div>
                  <h4 className="mb-2 text-base font-bold text-[var(--text)]">{c.title}</h4>
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <p className="as-clarity-text">
              <strong>You submit your applications yourself.</strong> We guide and support you through every step — the final submit stays in your hands.
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

          <div className="mx-auto max-w-[822px] rounded-2xl bg-white p-8 shadow-sm">
            <div className="py-10 pb-16 text-center">
              <p className="mb-2.5 font-[family-name:var(--font-dm-serif)] text-[28px] text-[var(--text)]">
                Ready to start your application journey?
              </p>
              <p className="mx-auto mb-6 max-w-[480px] text-sm leading-relaxed text-[var(--text-light)]">
                Tell us where you stand today and we&apos;ll help you build a clear path forward.
              </p>
              <button
                type="button"
                onClick={() => setStep("basic")}
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
            {formNav(() => setStep("landing"), () => setStep("direction"), !basicValid)}
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
            <input
              value={fieldOfStudy}
              onChange={(e) => setFieldOfStudy(e.target.value)}
              list="vf-field-options"
              placeholder="Start typing — e.g. Engineering, Business, Medicine"
              className="mb-2 w-full rounded-[var(--radius)] border-[1.5px] border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.06)]"
            />
            <datalist id="vf-field-options">
              {VF_FIELD_OF_STUDY_SUGGESTIONS.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
            <p className="as-field-sub">
              Not sure yet? That&apos;s completely fine — we&apos;ll help you narrow it down.
            </p>

            {sectionLabel("When are you planning to apply?")}
            <div className="as-chip-grid mb-2">
              {VF_APPLY_TIMING_CHIPS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => pickTiming(t)}
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

            {formNav(() => setStep("basic"), () => setStep("strategy"))}
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

            <div className="as-strategy-hint">
              You&apos;ll only pay <strong>AED {ONBOARDING_DEPOSIT_AED}</strong> today for the onboarding session. If you continue with a package, this amount is deducted from your total package fee. Package pricing is confirmed after your onboarding session.
            </div>

            <div className="as-included-compact">
              <div className="as-included-compact-title">Every package includes</div>
              <div className="as-included-compact-grid">
                {VF_INCLUDED_COMPACT.map((line) => (
                  <div key={line} className="as-included-compact-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {line}
                  </div>
                ))}
              </div>
            </div>

            {formNav(() => setStep("direction"), () => setStep("universities"), !strategyValid)}
          </div>
        </div>
      ) : null}

      {step === "universities" ? (
        <div className="mx-auto max-w-[760px] px-5 py-6">
          <ProgressTracker step="universities" />
          <div className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white px-8 py-9 max-[768px]:px-5">
            <h2 className="mb-1.5 font-[family-name:var(--font-dm-serif)] text-2xl">Which universities are you considering?</h2>
            <p className="mb-5 text-sm text-[var(--text-light)]">
              Add universities if you have ideas, or let us help you build the list.
            </p>

            <div className="as-intent-row">
              {(
                [
                  {
                    k: "shortlist" as const,
                    title: "I already have a shortlist",
                    desc: "I know the universities I want to apply to",
                  },
                  {
                    k: "ideas" as const,
                    title: "I have some ideas",
                    desc: "A few in mind, would like help refining",
                  },
                  {
                    k: "help" as const,
                    title: "I need help deciding",
                    desc: "Start fresh and build a list together",
                  },
                ] as const
              ).map(({ k, title, desc }) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setUniIntent(k)}
                  className={`as-intent-card ${uniIntent === k ? "as-selected" : ""}`}
                >
                  <div className="as-intent-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.8">
                      <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                    </svg>
                  </div>
                  <div className="as-intent-title">{title}</div>
                  <div className="as-intent-desc">{desc}</div>
                </button>
              ))}
            </div>

            {showUniInputs ? (
              <>
                <p className="mb-4 text-[13.5px] text-[var(--text-light)]">
                  Add universities you&apos;re considering. You can add up to{" "}
                  <span className="font-semibold text-[var(--text)]">{selectedPack ?? 10}</span>.
                </p>
                <div className="mb-5 flex flex-col gap-2">
                  {uniSlots.map((val, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] text-[11px] font-bold text-[var(--green)]">
                        {i + 1}
                      </div>
                      <div className={`relative flex min-w-0 flex-1 items-center ${val.trim() ? "has-value" : ""}`}>
                        <input
                          value={val}
                          onChange={(e) => setUniAt(i, e.target.value)}
                          placeholder="Enter university name"
                          className={`as-uni-input w-full rounded-[var(--radius)] border-[1.5px] border-[var(--border)] px-4 py-2.5 text-[13px] outline-none transition focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.07)] ${val.trim() ? "as-filled bg-[var(--green-pale)] font-medium text-[var(--green-dark)]" : ""}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="popular-section border-t border-[var(--border-light)] pt-[18px]">
                  <div className="popular-label mb-2.5 text-xs font-semibold text-[var(--text-mid)]">
                    Popular picks for students like you
                  </div>
                  <div className="popular-list flex max-h-[220px] flex-col gap-1.5 overflow-y-auto pr-1.5">
                    {POPULAR_UNIVERSITIES.map((u) => (
                      <div
                        key={u.name}
                        className="popular-item flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border-light)] bg-white px-3 py-2.5 transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)]"
                      >
                        <div className="popular-flag flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--sand)] text-[10px] font-bold text-[var(--text-mid)]">
                          {u.code}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="popular-name text-[13px] font-semibold text-[var(--text)]">{u.name}</div>
                          <div className="popular-loc text-[11px] text-[var(--text-hint)]">{u.loc}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addPopularUni(u)}
                          className="popular-add shrink-0 cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border)] bg-white px-3.5 py-1.5 text-[11px] font-semibold text-[var(--text-mid)] hover:border-[var(--green)] hover:bg-[var(--green-pale)] hover:text-[var(--green)]"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="as-clarity-banner mt-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2">
                    <path d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                <p className="as-clarity-text">
                  No problem — we&apos;ll help you build a balanced university list during your onboarding.
                </p>
              </div>
            )}

            <label className="mb-2 mt-6 block border-t border-[var(--border-light)] pt-5">
              <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text-mid)]">Anything we should know?</span>
              <textarea
                value={uniNotes}
                onChange={(e) => setUniNotes(e.target.value)}
                placeholder="Any preferences, priorities, or special context to share..."
                rows={4}
                className="w-full resize-y rounded-[var(--radius)] border-[1.5px] border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.06)]"
              />
            </label>

            {formNav(() => setStep("strategy"), () => setStep("documents"))}
          </div>
        </div>
      ) : null}

      {step === "documents" ? (
        <div className="mx-auto max-w-[760px] px-5 py-6">
          <ProgressTracker step="documents" />
          <div className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white px-8 py-9 max-[768px]:px-5">
            <h2 className="mb-1.5 font-[family-name:var(--font-dm-serif)] text-2xl">Upload anything you already have</h2>
            <p className="mb-6 text-sm text-[var(--text-light)]">
              Don&apos;t worry if something is missing — we&apos;ll help you prepare it.
            </p>

            {docRow(
              "transcript",
              <>
                Transcript / grades{" "}
                <span className="text-[11px] font-normal text-[var(--text-hint)]">Upload your latest grades if you have them</span>
              </>,
              "Not uploaded yet",
              false,
            )}
            {docRow(
              "ps",
              <>Personal statement / essay draft</>,
              "If you've started a draft, upload it. If not, we'll help you brainstorm.",
              true,
            )}
            {docRow("cv", <>CV / resume</>, "We can help you improve or create one.", true)}
            {docRow(
              "english",
              <>English test results</>,
              "Upload IELTS, TOEFL, or SAT results if available.",
              true,
            )}

            <div className="final-info-box mt-5 flex items-center gap-3 rounded-xl bg-[var(--green-pale)] px-[18px] py-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2">
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <p className="text-[13px] font-medium leading-snug text-[var(--green-dark)]">
                Missing documents will not stop you from booking your onboarding session.
              </p>
            </div>

            {formNav(() => setStep("universities"), () => setStep("summary"))}
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
              <h2 className="as-summary-headline font-[family-name:var(--font-dm-serif)]">{summaryHeadline}</h2>
              <p className="as-summary-narrative">{summaryNarrative}</p>
            </div>

            <div className="as-snapshot-eyebrow">Your plan so far</div>

            <div className="as-summary-grid">
              <div
                className={`as-summary-block as-full-row hero-block ${selectedPack ? "as-filled" : "as-empty"}`}
              >
                <div className="mb-2.5 flex items-center gap-2.5">
                  <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[var(--sand)]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.8">
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
                <p className="mt-1 flex items-center gap-1 text-[11.5px] text-[var(--text-light)]">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  Final package confirmed after onboarding
                </p>
              </div>

              <div className={`as-summary-block ${snapDest.empty ? "as-empty" : "as-filled"}`}>
                <div className="mb-2.5 flex items-center gap-2.5">
                  <span className="as-summary-block-label">Where you want to study</span>
                </div>
                <div className="as-summary-block-value">{snapDest.text}</div>
              </div>

              <div className={`as-summary-block ${snapField.empty ? "as-empty" : "as-filled"}`}>
                <div className="mb-2.5 flex items-center gap-2.5">
                  <span className="as-summary-block-label">What you want to study</span>
                </div>
                <div className="as-summary-block-value">{snapField.text}</div>
              </div>

              <div className={`as-summary-block ${snapUnis.empty ? "as-empty" : "as-filled"}`}>
                <div className="mb-2.5 flex items-center gap-2.5">
                  <span className="as-summary-block-label">Your shortlist</span>
                </div>
                <div className="as-summary-block-value">{snapUnis.text}</div>
              </div>

              <div className={`as-summary-block ${snapDocs.empty ? "as-empty" : "as-filled"}`}>
                <div className="mb-2.5 flex items-center gap-2.5">
                  <span className="as-summary-block-label">Your current materials</span>
                </div>
                <div className="as-summary-block-value">{snapDocs.text}</div>
              </div>

              <div className={`as-summary-block as-full-row ${snapTiming.empty ? "as-empty" : "as-filled"}`}>
                <div className="mb-2.5 flex items-center gap-2.5">
                  <span className="as-summary-block-label">Your timeline</span>
                </div>
                <div className="as-summary-block-value">{snapTiming.text}</div>
              </div>
            </div>

            <div className="as-happens-section">
              <div className="mb-2 flex items-start gap-3">
                <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-[var(--green-bg)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="as-happens-title font-[family-name:var(--font-dm-serif)]">
                    What happens in your onboarding session
                  </h3>
                </div>
              </div>
              <p className="as-happens-sub">A focused, one-on-one working session with your advisor.</p>
              <div className="as-happens-list">
                {[
                  "We refine your university list based on your profile",
                  "We build a clear strategy — reach, target, and safe schools",
                  "We review your current documents and identify gaps",
                  "We guide you on essays, CV, and positioning",
                  "We map deadlines and next steps for each university",
                  "We answer every question and remove uncertainty",
                ].map((line) => (
                  <div key={line} className="as-happens-item">
                    <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 rounded-r-[10px] border-l-[3px] border-[var(--green)] bg-[var(--green-pale)] py-3.5 pl-[18px] pr-[18px] text-[13px] font-medium leading-snug text-[var(--green-dark)]">
                <strong>This is not a one-time call.</strong> It&apos;s the starting point of ongoing support throughout your application journey.
              </div>
            </div>

            <div className="as-comfort-section">
              {[
                "Plan not complete? That's exactly what we help with.",
                "You don't need everything ready before starting.",
                "We'll guide you step by step — every step.",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2">
                      <path d="M9 12l2 2 4-4" />
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  </div>
                  <p className="text-[12.5px] font-medium leading-snug text-[var(--text-mid)]">{t}</p>
                </div>
              ))}
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
              <div className="relative z-[1] min-w-0 flex-1">
                <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-[var(--green)]">
                  Your advisor is ready
                </div>
                <p className="text-[14.5px] font-semibold leading-snug text-[var(--green-dark)]">
                  A real person who has helped students just like you get into top universities.
                </p>
              </div>
            </div>

            <div className="chapter-divider my-8 flex items-center justify-center gap-2.5 px-5">
              <span className="h-px flex-1 max-w-[100px] bg-[var(--border-light)]" />
              <span className="h-1 w-1 rounded-full bg-[var(--green-light)]" />
              <span className="h-px flex-1 max-w-[100px] bg-[var(--border-light)]" />
            </div>

            <div className="as-cta-block pb-2 text-center">
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
                onClick={() => void goFromSummaryToBooking()}
                className="as-btn-cta-hero mx-auto disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving…" : "Choose your session time"}
                <ChevronRight />
              </button>
              <p className="cta-subtext mx-auto mt-3.5 max-w-[440px] text-[12.5px] leading-snug text-[var(--text-light)]">
                You&apos;ll pick your time and confirm an AED {ONBOARDING_DEPOSIT_AED} deposit in one step — fully deducted from your package if you continue.
              </p>
            </div>

            <div className="mt-6 flex justify-start border-t border-[var(--border-light)] pt-5">
              <button
                type="button"
                onClick={() => setStep("documents")}
                className="cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white px-6 py-2.5 text-[13px] font-medium text-[var(--text-mid)] hover:border-[var(--text-mid)]"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === "booking" ? (
        <div className="mx-auto max-w-[1000px] px-5 py-6">
          <ProgressTracker step="booking" />
          <div className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white p-10 max-[768px]:p-6">
            <div className="as-pay-layout">
              <div className="min-w-0">
                <h2 className="mb-1.5 font-[family-name:var(--font-dm-serif)] text-2xl">Ready to book your onboarding session</h2>
                <p className="mb-6 text-sm text-[var(--text-light)]">
                  Choose a time that works for you. Your AED {ONBOARDING_DEPOSIT_AED} deposit secures the session and is fully deducted from your package if you continue.
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
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>
                <div className="final-info-box mt-6 flex items-center gap-3 rounded-xl bg-[var(--green-pale)] px-[18px] py-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                    </svg>
                  </div>
                  <p className="text-[13px] font-medium leading-snug text-[var(--green-dark)]">
                    You&apos;re not paying the full package today. You&apos;ll confirm your final package after your onboarding session.
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                <div className="as-pay-summary">
                  <div className="mb-[18px] text-[15px] font-bold text-[var(--text)]">Session details</div>
                  <div className="flex items-center justify-between border-b border-transparent py-2 text-[13px]">
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
                    <span className="text-[var(--text-light)]">Deposit</span>
                    <span className="font-semibold text-[var(--text)]">AED {ONBOARDING_DEPOSIT_AED}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 text-[13px]">
                    <span className="text-[var(--text-light)]">Package fee</span>
                    <span className="rounded-[var(--radius-pill)] bg-[var(--sand)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-light)]">
                      Discussed at onboarding
                    </span>
                  </div>
                  <div className="my-3 h-px bg-[var(--border-light)]" />
                  <div className="mb-[18px] flex items-center justify-between">
                    <span className="text-[15px] font-bold text-[var(--text)]">Due at booking</span>
                    <span className="text-base font-bold text-[var(--green)]">AED {ONBOARDING_DEPOSIT_AED}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep("schedule")}
                    className="mb-3.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-pill)] border-0 bg-[var(--green)] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--green-dark)]"
                  >
                    Choose your time slot
                    <ChevronRight />
                  </button>
                  <div className="flex items-start gap-2 rounded-[10px] bg-[var(--green-pale)] px-3.5 py-3 text-[11.5px] leading-snug text-[var(--green-dark)]">
                    <svg width="14" height="14" className="mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>You&apos;ll pick your time and confirm your deposit on the next step — handled securely.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-start">
              <button
                type="button"
                onClick={() => setStep("summary")}
                className="cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white px-6 py-2.5 text-[13px] font-medium text-[var(--text-mid)]"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === "schedule" ? (
        <>
          <div className="mx-auto max-w-[1000px] px-5 py-6">
            <div className="rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white px-9 py-10 text-center max-[768px]:px-6">
              <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[var(--green-bg)]">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <h2 className="mb-2.5 font-[family-name:var(--font-dm-serif)] text-[28px] text-[var(--text)]">
                Pick your onboarding time
              </h2>
              <p className="mx-auto max-w-[420px] text-sm leading-relaxed text-[var(--text-light)]">
                Choose a slot that works for you below. Your AED {ONBOARDING_DEPOSIT_AED} deposit is confirmed as part of booking — fully deducted from your package if you continue.
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
                  onClick={() => setStep("booking")}
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
