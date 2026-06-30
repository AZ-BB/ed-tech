"use client";

import clsx from "clsx";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  ExternalLink,
  Loader2,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useLocale } from "@/lib/i18n/locale-context";

import type { AiMatchingProfileDefaults } from "../_lib/load-ai-matching-profile-defaults";

const TOTAL_PROGRESS = 7;

function formatTemplate(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [key, val] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(String(val));
  }
  return out;
}

function optLabel(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}

const ACADEMIC_SYSTEM_VALUES = [
  "ib",
  "al",
  "us",
  "igcse",
  "french",
  "indian",
  "national",
  "other",
] as const;

/** English labels sent to the matching API (form stores system value codes). */
const ACADEMIC_SYSTEM_LABELS_EN: Record<string, string> = {
  ib: "IB (International Baccalaureate)",
  al: "A Levels",
  us: "American System (GPA)",
  igcse: "IGCSE",
  french: "French Baccalaureate",
  indian: "Indian Curriculum (CBSE/ISC)",
  national: "National Curriculum",
  other: "Other",
};

const MAJOR_GROUPS: Record<string, string[]> = {
  "Business & Management": [
    "Business Administration",
    "Finance",
    "Accounting",
    "Marketing",
    "International Business",
    "Entrepreneurship",
    "Management",
  ],
  Engineering: [
    "Mechanical Engineering",
    "Civil Engineering",
    "Electrical Engineering",
    "Chemical Engineering",
    "Aerospace Engineering",
    "Industrial Engineering",
  ],
  Technology: [
    "Computer Science",
    "Software Engineering",
    "Data Science",
    "Artificial Intelligence",
    "Cybersecurity",
    "Information Systems",
  ],
  Health: [
    "Medicine",
    "Dentistry",
    "Pharmacy",
    "Nursing",
    "Biomedical Science",
    "Veterinary Science",
    "Public Health",
  ],
  "Social Sciences": [
    "Economics",
    "Psychology",
    "Political Science",
    "Sociology",
    "International Relations",
    "Anthropology",
  ],
  Creative: [
    "Architecture",
    "Graphic Design",
    "Fashion Design",
    "Film / Media",
    "Fine Arts",
    "Photography",
    "Interior Design",
  ],
  Other: [
    "Law",
    "Education",
    "Hospitality Management",
    "Sports Science",
    "Journalism",
    "Linguistics",
  ],
};

const COUNTRIES: { flag: string; name: string }[] = [
  { flag: "🇦🇪", name: "United Arab Emirates" },
  { flag: "🇸🇦", name: "Saudi Arabia" },
  { flag: "🇪🇬", name: "Egypt" },
  { flag: "🇯🇴", name: "Jordan" },
  { flag: "🇱🇧", name: "Lebanon" },
  { flag: "🇰🇼", name: "Kuwait" },
  { flag: "🇶🇦", name: "Qatar" },
  { flag: "🇧🇭", name: "Bahrain" },
  { flag: "🇴🇲", name: "Oman" },
  { flag: "🇮🇶", name: "Iraq" },
  { flag: "🇸🇾", name: "Syria" },
  { flag: "🇵🇸", name: "Palestine" },
  { flag: "🇾🇪", name: "Yemen" },
  { flag: "🇲🇦", name: "Morocco" },
  { flag: "🇩🇿", name: "Algeria" },
  { flag: "🇹🇳", name: "Tunisia" },
  { flag: "🇱🇾", name: "Libya" },
  { flag: "🇸🇩", name: "Sudan" },
  { flag: "🇬🇧", name: "United Kingdom" },
  { flag: "🇺🇸", name: "United States" },
  { flag: "🇨🇦", name: "Canada" },
  { flag: "🇦🇺", name: "Australia" },
  { flag: "🇳🇿", name: "New Zealand" },
  { flag: "🇩🇪", name: "Germany" },
  { flag: "🇳🇱", name: "Netherlands" },
  { flag: "🇫🇷", name: "France" },
  { flag: "🇮🇹", name: "Italy" },
  { flag: "🇪🇸", name: "Spain" },
  { flag: "🇮🇪", name: "Ireland" },
  { flag: "🇨🇭", name: "Switzerland" },
  { flag: "🇸🇪", name: "Sweden" },
  { flag: "🇳🇴", name: "Norway" },
  { flag: "🇩🇰", name: "Denmark" },
  { flag: "🇫🇮", name: "Finland" },
  { flag: "🇧🇪", name: "Belgium" },
  { flag: "🇦🇹", name: "Austria" },
  { flag: "🇵🇹", name: "Portugal" },
  { flag: "🇵🇱", name: "Poland" },
  { flag: "🇨🇿", name: "Czech Republic" },
  { flag: "🇸🇬", name: "Singapore" },
  { flag: "🇲🇾", name: "Malaysia" },
  { flag: "🇯🇵", name: "Japan" },
  { flag: "🇰🇷", name: "South Korea" },
  { flag: "🇨🇳", name: "China" },
  { flag: "🇭🇰", name: "Hong Kong" },
  { flag: "🇮🇳", name: "India" },
  { flag: "🇵🇰", name: "Pakistan" },
  { flag: "🇧🇩", name: "Bangladesh" },
  { flag: "🇹🇷", name: "Turkey" },
  { flag: "🇿🇦", name: "South Africa" },
  { flag: "🇳🇬", name: "Nigeria" },
  { flag: "🇰🇪", name: "Kenya" },
  { flag: "🇬🇭", name: "Ghana" },
  { flag: "🇧🇷", name: "Brazil" },
  { flag: "🇲🇽", name: "Mexico" },
  { flag: "🇷🇺", name: "Russia" },
  { flag: "🇺🇦", name: "Ukraine" },
  { flag: "🇬🇷", name: "Greece" },
  { flag: "🇭🇺", name: "Hungary" },
  { flag: "🇷🇴", name: "Romania" },
  { flag: "🇮🇩", name: "Indonesia" },
  { flag: "🇹🇭", name: "Thailand" },
  { flag: "🇻🇳", name: "Vietnam" },
  { flag: "🇵🇭", name: "Philippines" },
].sort((a, b) => a.name.localeCompare(b.name));

const EXCITES_OPTIONS = [
  "Building things",
  "Solving problems",
  "Working with people",
  "Being creative",
  "Analyzing data",
  "Leading teams",
  "Helping others",
  "Researching ideas",
];

const SUBJECT_GROUPS: { label: string; subjects: string[] }[] = [
  {
    label: "STEM",
    subjects: [
      "Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "Computer Science",
    ],
  },
  {
    label: "Business",
    subjects: ["Economics", "Business Studies", "Accounting"],
  },
  {
    label: "Humanities",
    subjects: ["History", "Geography", "Politics"],
  },
  {
    label: "Languages",
    subjects: ["English", "Arabic", "French", "Other languages"],
  },
  {
    label: "Creative",
    subjects: ["Art", "Design", "Music", "Drama"],
  },
];

const ENV_OPTIONS = [
  "Big city, fast-paced",
  "Balanced (city + campus)",
  "Quiet, campus-focused",
];

const MATTERS_OPTIONS = [
  "Strong career opportunities",
  "Social / student life",
  "Academic reputation",
  "International exposure",
  "Internship opportunities",
];

const ACTIVITY_OPTIONS = [
  "Sports",
  "Entrepreneurship / side projects",
  "Tech / coding",
  "Creative arts",
  "Volunteering",
  "Part-time work",
  "Fitness / gym",
  "Research / competitions",
];

const AMBITION_OPTIONS = [
  "I want top-ranked universities",
  "I want a strong but balanced option",
  "I care more about fit and experience",
];

const GOAL_OPTIONS = ["Get a job", "Start a business", "Continue studying"];

const WORKLOC_OPTIONS = ["Home country", "International"];

const BUDGET_OPTIONS = ["Need full support", "Moderate", "Flexible"];

const TEST_OPTIONS = ["SAT", "IELTS", "ACT", "TOEFL", "Duolingo", "None"];

const TESTS_WITH_SCORE_INPUTS = ["SAT", "IELTS", "ACT", "TOEFL", "Duolingo"] as const;

/** Current SAT composite scale (EBRW + Math). */
const SAT_TOTAL_MIN = 400;
const SAT_TOTAL_MAX = 1600;

/** ACT composite score (single number). */
const ACT_COMPOSITE_MIN = 1;
const ACT_COMPOSITE_MAX = 36;

function testScoreFieldFromOptions(
  test: string,
  testScores: Record<
    string,
    { label: string; placeholder: string; scoreHint?: string }
  >,
): { label: string; placeholder: string; scoreHint?: string } {
  const row = testScores[test];
  if (row) return row;
  return { label: `${test} score`, placeholder: "" };
}

/** Strips non-digits and caps at SAT composite maximum (1600 scale). */
function sanitizeSatScoreInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n)) return "";
  return String(Math.min(SAT_TOTAL_MAX, n));
}

/**
 * null = valid. "required" = empty (handled by missing-score validation).
 * Any other string = user-facing error.
 */
function satScoreValidationMessage(
  raw: string,
  msgs?: { wholeNumber: string; satAboveMax: string; satBelowMin: string },
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "required";
  if (!/^\d+$/.test(trimmed)) {
    return msgs?.wholeNumber ?? "invalid";
  }
  const n = Number.parseInt(trimmed, 10);
  if (n > SAT_TOTAL_MAX) {
    return msgs
      ? formatTemplate(msgs.satAboveMax, { max: SAT_TOTAL_MAX })
      : "invalid";
  }
  if (n < SAT_TOTAL_MIN) {
    return msgs
      ? formatTemplate(msgs.satBelowMin, { min: SAT_TOTAL_MIN, max: SAT_TOTAL_MAX })
      : "invalid";
  }
  return null;
}

/** Strips non-digits and caps at ACT composite maximum. */
function sanitizeActScoreInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n)) return "";
  return String(Math.min(ACT_COMPOSITE_MAX, n));
}

function actScoreValidationMessage(
  raw: string,
  msgs?: { wholeNumber: string; actAboveMax: string; actBelowMin: string },
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "required";
  if (!/^\d+$/.test(trimmed)) {
    return msgs?.wholeNumber ?? "invalid";
  }
  const n = Number.parseInt(trimmed, 10);
  if (n > ACT_COMPOSITE_MAX) {
    return msgs
      ? formatTemplate(msgs.actAboveMax, { max: ACT_COMPOSITE_MAX })
      : "invalid";
  }
  if (n < ACT_COMPOSITE_MIN) {
    return msgs
      ? formatTemplate(msgs.actBelowMin, { min: ACT_COMPOSITE_MIN, max: ACT_COMPOSITE_MAX })
      : "invalid";
  }
  return null;
}

const DEGREE_LEVELS = [
  "Bachelor's",
  "Master's",
  "Foundation",
  "Diploma",
  "PhD",
];

type FormState = {
  fullName: string;
  schoolName: string;
  schoolCountry: string;
  nationality: string;
  academicSystem: string;
  /** Predicted grade / GPA — label & placeholder follow academic system (see gradeFieldMeta). */
  predictedScore: string;
  testsTaken: string[];
  /** Per-test scores; keys only for selected standardized tests */
  testScores: Record<string, string>;
  primaryStudyDestination: string;
  degreeLevel: string;
  intendedMajor: string;
  excites: string[];
  strongestSubjects: string[];
  campusEnvironment: string;
  mattersMost: string[];
  outsideActivities: string[];
  academicAmbition: string;
  goalAfterUniversity: string;
  workLocationPreference: string;
  budgetBand: string;
  extraNotes: string;
};

function satScoreFieldInvalid(form: FormState): boolean {
  if (form.testsTaken.includes("None") || !form.testsTaken.includes("SAT")) return false;
  const m = satScoreValidationMessage(form.testScores["SAT"] ?? "");
  return m !== null && m !== "required";
}

function satScoreInValidRange(form: FormState): boolean {
  if (form.testsTaken.includes("None") || !form.testsTaken.includes("SAT")) return false;
  return satScoreValidationMessage(form.testScores["SAT"] ?? "") === null;
}

function actScoreFieldInvalid(form: FormState): boolean {
  if (form.testsTaken.includes("None") || !form.testsTaken.includes("ACT")) return false;
  const m = actScoreValidationMessage(form.testScores["ACT"] ?? "");
  return m !== null && m !== "required";
}

function actScoreInValidRange(form: FormState): boolean {
  if (form.testsTaken.includes("None") || !form.testsTaken.includes("ACT")) return false;
  return actScoreValidationMessage(form.testScores["ACT"] ?? "") === null;
}

const initialForm: FormState = {
  fullName: "",
  schoolName: "",
  schoolCountry: "",
  nationality: "",
  academicSystem: "",
  predictedScore: "",
  testsTaken: [],
  testScores: {},
  primaryStudyDestination: "",
  degreeLevel: "Bachelor's",
  intendedMajor: "",
  excites: [],
  strongestSubjects: [],
  campusEnvironment: "",
  mattersMost: [],
  outsideActivities: [],
  academicAmbition: "",
  goalAfterUniversity: "",
  workLocationPreference: "",
  budgetBand: "",
  extraNotes: "",
};

function formStateFromProfileDefaults(
  defaults: AiMatchingProfileDefaults | null | undefined,
): FormState {
  const o: FormState = { ...initialForm };
  if (!defaults) return o;
  if (defaults.fullName.trim()) o.fullName = defaults.fullName.trim();
  if (defaults.schoolName.trim()) o.schoolName = defaults.schoolName.trim();
  if (defaults.schoolCountry.trim()) o.schoolCountry = defaults.schoolCountry.trim();
  if (defaults.nationality.trim()) o.nationality = defaults.nationality.trim();
  if (defaults.academicSystem.trim()) o.academicSystem = defaults.academicSystem.trim();
  if (defaults.predictedScore.trim()) o.predictedScore = defaults.predictedScore.trim();
  if (defaults.testsTaken.length > 0) {
    o.testsTaken = [...defaults.testsTaken];
    o.testScores = { ...defaults.testScores };
  }
  if (defaults.primaryStudyDestination.trim()) {
    o.primaryStudyDestination = defaults.primaryStudyDestination.trim();
  }
  if (defaults.intendedMajor.trim()) o.intendedMajor = defaults.intendedMajor.trim();
  if (defaults.budgetBand.trim()) o.budgetBand = defaults.budgetBand.trim();
  return o;
}

type UniversityMatch = {
  universityName: string;
  programName: string;
  city: string;
  country: string;
  tuitionEstimate: string;
  admissionFit: "Reach" | "Target" | "Likely";
  whyItMatches: string[];
  considerations: string;
  nextSteps: string[];
  sourceUrl: string;
};

type MatchResponse = {
  profileSummary: string;
  recommendedStrategy: string[];
  matches: UniversityMatch[];
};

/** Mirrors POST body expected by `/api/ai/university-matching`. */
type MatchingPayload = {
  fullName: string;
  schoolName: string;
  schoolCountry: string;
  nationality: string;
  academicSystem: string;
  predictedScore: string;
  testsTaken: string[];
  testScoreNotes: string;
  primaryStudyDestination: string;
  degreeLevel: string;
  intendedMajor: string;
  excites: string[];
  strongestSubjects: string[];
  campusEnvironment: string;
  mattersMost: string[];
  outsideActivities: string[];
  academicAmbition: string;
  goalAfterUniversity: string;
  workLocationPreference: string;
  budgetBand: string;
  extraNotes?: string;
  locale?: "en" | "ar";
};

function ValidationHint({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#E53935]">
      <CircleAlert className="size-3 shrink-0" aria-hidden />
      {children}
    </div>
  );
}

function CountryPicker({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (name: string) => void;
  invalid?: boolean;
}) {
  const { dict } = useLocale();
  const labels = dict.student.aiMatching;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = COUNTRIES.find((c) => c.name === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.flag.includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex min-h-11 w-full cursor-pointer items-center justify-between rounded-[10px] border-[1.5px] bg-white px-4 text-left text-sm transition",
          invalid
            ? "border-[#E53935] shadow-[0_0_0_3px_rgba(229,57,53,0.08)]"
            : open
              ? "border-[var(--green-light)] shadow-[0_0_0_3px_rgba(45,106,79,0.08)]"
              : "border-[var(--border)] hover:border-[var(--text-hint)]",
          open && "rounded-b-none border-b-0",
        )}
      >
        <span
          className={clsx(
            "flex items-center gap-2",
            selected ? "font-medium text-[var(--text)]" : "text-[var(--text-hint)]",
          )}
        >
          {selected ? (
            <>
              <span className="text-base leading-none">{selected.flag}</span>
              <span className="bidi-ltr" dir="ltr">
                {selected.name}
              </span>
            </>
          ) : (
            labels.countryPlaceholder
          )}
        </span>
        <ChevronDown
          className={clsx(
            "size-3 shrink-0 text-[var(--text-hint)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 z-50 flex max-h-[260px] flex-col overflow-hidden rounded-b-[10px] border border-t-0 border-[var(--green-light)] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
          <div className="shrink-0 border-b border-[var(--border-light)] px-2.5 py-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.searchCountry}
              className="w-full rounded-lg border-[1.5px] border-[var(--border-light)] bg-[var(--sand)] px-3 py-2 text-[13px] text-[var(--text)] outline-none focus:border-[var(--green-light)] focus:bg-white"
            />
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto py-1">
            {filtered.map((c) => (
              <li key={c.name}>
                <button
                  type="button"
                  className={clsx(
                    "flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] transition",
                    c.name === value
                      ? "bg-[var(--green-bg)] font-semibold text-[var(--green)]"
                      : "text-[var(--text)] hover:bg-[var(--green-pale)]",
                  )}
                  onClick={() => {
                    onChange(c.name);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="w-[22px] text-center text-[15px]">{c.flag}</span>
                  <span className="bidi-ltr flex-1" dir="ltr">
                    {c.name}
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="px-4 py-4 text-center text-[12px] text-[var(--text-hint)]">
                {labels.noCountriesFound}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function MajorPicker({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (major: string) => void;
  invalid?: boolean;
}) {
  const { dict } = useLocale();
  const labels = dict.student.aiMatching;
  const majorGroupLabels = dict.student.aiMatching.options.majorGroups as Record<string, string>;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: { group: string; majors: string[] }[] = [];
    for (const [group, majors] of Object.entries(MAJOR_GROUPS)) {
      const m = q ? majors.filter((x) => x.toLowerCase().includes(q)) : majors;
      if (m.length) out.push({ group, majors: m });
    }
    return out;
  }, [query]);

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex min-h-11 w-full cursor-pointer items-center justify-between rounded-[10px] border-[1.5px] bg-white px-4 text-left text-sm transition",
          invalid
            ? "border-[#E53935] shadow-[0_0_0_3px_rgba(229,57,53,0.08)]"
            : open
              ? "border-[var(--green-light)] shadow-[0_0_0_3px_rgba(45,106,79,0.08)]"
              : "border-[var(--border)] hover:border-[var(--text-hint)]",
          open && "rounded-b-none border-b-0",
        )}
      >
        <span
          className={clsx(
            value ? "font-medium text-[var(--text)]" : "text-[var(--text-hint)]",
          )}
        >
          {value ? (
            <span className="bidi-ltr" dir="ltr">
              {value}
            </span>
          ) : (
            labels.selectField
          )}
        </span>
        <ChevronDown
          className={clsx(
            "size-3 shrink-0 text-[var(--text-hint)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 z-50 flex max-h-[320px] flex-col overflow-hidden rounded-b-[10px] border border-t-0 border-[var(--green-light)] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
          <div className="relative shrink-0 border-b border-[var(--border-light)] px-3 py-2.5">
            <Search
              className="pointer-events-none absolute left-[22px] top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-hint)]"
              aria-hidden
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.searchMajors}
              className="w-full rounded-lg border-[1.5px] border-[var(--border-light)] bg-[var(--sand)] py-2 pl-9 pr-3 text-[13px] outline-none focus:border-[var(--green-light)] focus:bg-white"
              autoFocus
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1.5">
            {groups.map(({ group, majors }) => (
              <div key={group}>
                <div className="px-4 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.8px] text-[var(--text-hint)]">
                  {optLabel(majorGroupLabels, group)}
                </div>
                {majors.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={clsx(
                      "w-full cursor-pointer px-4 py-2.5 text-left text-[13px] transition",
                      m === value
                        ? "bg-[var(--green-bg)] font-semibold text-[var(--green)]"
                        : "text-[var(--text-mid)] hover:bg-[var(--green-pale)] hover:text-[var(--green)]",
                    )}
                    onClick={() => {
                      onChange(m);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="bidi-ltr" dir="ltr">
                      {m}
                    </span>
                  </button>
                ))}
              </div>
            ))}
            {groups.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-[var(--text-hint)]">
                {labels.noMajorsFound}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OptTile({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "cursor-pointer rounded-[var(--radius)] border-[1.5px] px-4 py-3.5 text-center text-[13px] font-medium transition",
        selected
          ? "border-[var(--green)] bg-[var(--green-bg)] font-semibold text-[var(--green)]"
          : "border-[var(--border)] bg-white text-[var(--text-mid)] hover:border-[var(--text-hint)] hover:bg-[var(--sand)]",
      )}
    >
      {children}
    </button>
  );
}

function PillToggle({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] px-[18px] py-2 text-[12px] font-medium transition",
        selected
          ? "border-[var(--green)] bg-[var(--green-bg)] font-semibold text-[var(--green)]"
          : "border-[var(--border)] bg-white text-[var(--text-mid)] hover:border-[var(--text-hint)]",
      )}
    >
      {children}
    </button>
  );
}

function SubjectChip({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] px-3.5 py-2 text-[12.5px] font-medium transition",
        selected
          ? "border-[var(--green)] bg-[var(--green)] font-semibold text-white"
          : "border-[var(--border)] bg-white text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)]",
      )}
    >
      {children}
    </button>
  );
}

function MatchCard({ match }: { match: UniversityMatch }) {
  const { dict } = useLocale();
  const t = dict.student.aiMatching;
  const fitLabels = t.admissionFitLabels as Record<string, string>;
  const admissionFitLabel = fitLabels[match.admissionFit] ?? match.admissionFit;
  return (
    <article className="rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white p-7 transition hover:border-[#d5dbd8] hover:shadow-[0_6px_22px_rgba(0,0,0,0.05)] max-[600px]:px-5 max-[600px]:py-[22px]">
      <p className="mb-[18px] text-[13px] text-[var(--text-light)]">
        {t.programAligned}
      </p>
      <div className="mb-3.5">
        <h3 className="serif text-[22px] leading-tight tracking-[-0.2px] text-[var(--text)] max-[600px]:text-[19px]">
          <span className="bidi-ltr" dir="ltr">
            {match.universityName}
          </span>
        </h3>
        <p className="mt-1 text-[13px] text-[var(--text-light)]">
          <span className="bidi-ltr" dir="ltr">
            {match.programName}
          </span>
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[var(--text-light)]">
          <MapPin className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
          <span className="bidi-ltr" dir="ltr">
            {match.city}, {match.country}
          </span>
        </p>
      </div>

      <div className="mb-[18px] flex flex-wrap gap-2">
        <span className="rounded-[var(--radius-pill)] bg-[var(--green-pale)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--green)]">
          {admissionFitLabel}
        </span>
        <span className="rounded-[var(--radius-pill)] bg-[var(--sand)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--text-mid)]">
          {match.tuitionEstimate}
        </span>
      </div>

      <div className="mb-3.5 rounded-[var(--radius)] border border-[#d5e8db] bg-[var(--green-pale)] px-5 py-4">
        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.7px] text-[var(--green)]">
          {t.whyMatches}
        </div>
        <ul className="flex flex-col gap-[7px]">
          {match.whyItMatches.map((reason) => (
            <li key={reason} className="flex items-start gap-2.5 text-[12.5px] leading-[1.55] text-[var(--text)]">
              <span className="mt-[7px] size-[5px] shrink-0 rounded-full bg-[var(--green)]" />
              {reason}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-md bg-[var(--sand)] px-3 py-2 text-[11.5px] italic text-[var(--text-hint)]">
        <CircleAlert className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden />
        <span>{match.considerations}</span>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--border-light)] pt-4 min-[640px]:flex-row min-[640px]:items-start min-[640px]:justify-between min-[640px]:gap-4">
        <div className="flex min-w-0 flex-1 flex-row flex-wrap items-start gap-x-5 gap-y-2">
          {match.nextSteps.slice(0, 2).map((step) => (
            <span
              key={step}
              className="inline-flex max-w-full items-start gap-1.5 text-left text-[11.5px] font-medium text-[var(--text-mid)]"
            >
              <Check className="mt-0.5 size-3 shrink-0 text-[var(--green)]" aria-hidden />
              <span className="min-w-0 leading-snug">{step}</span>
            </span>
          ))}
        </div>
        <a
          href={match.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-[var(--radius-pill)] bg-[var(--green)] px-[22px] py-2.5 text-[12.5px] font-semibold text-white! no-underline transition hover:bg-[var(--green-dark)] hover:text-white! min-[640px]:self-center"
        >
          {t.visitOfficialPage}
          <ExternalLink className="size-3.5 shrink-0 text-white!" strokeWidth={2} aria-hidden />
        </a>
      </div>
    </article>
  );
}

function buildTestScoreNotes(form: FormState): string {
  const parts: string[] = [];
  for (const test of TESTS_WITH_SCORE_INPUTS) {
    if (!form.testsTaken.includes(test)) continue;
    const v = (form.testScores[test] ?? "").trim();
    if (v) parts.push(`${test}: ${v}`);
  }
  return parts.join("; ");
}

/** Tests the student selected that still need a non-empty score (skipped when "None" is selected). */
function missingScoreTests(form: FormState): string[] {
  if (form.testsTaken.includes("None")) return [];
  return TESTS_WITH_SCORE_INPUTS.filter(
    (test) => form.testsTaken.includes(test) && !(form.testScores[test] ?? "").trim(),
  );
}

function scoreFieldInvalidKey(test: string): string {
  return `score:${test}`;
}

function validateStep(
  step: number,
  form: FormState,
  v: {
    enterFullName: string;
    enterSchoolName: string;
    selectSchoolCountry: string;
    selectCountry: string;
    selectAcademicSystem: string;
    enterScore: string;
    selectTest: string;
    enterTestScores: string;
    checkSat: string;
    checkAct: string;
    selectDestination: string;
    selectDegree: string;
    selectMajor: string;
    selectInterest: string;
    selectSubject: string;
    selectEnvironment: string;
    selectMatters: string;
    maxMatters: string;
    selectActivity: string;
    selectAmbition: string;
    selectGoal: string;
    selectWorkLoc: string;
    selectBudget: string;
  },
): string | null {
  switch (step) {
    case 1:
      if (!form.fullName.trim()) return v.enterFullName;
      if (!form.schoolName.trim()) return v.enterSchoolName;
      if (!form.schoolCountry) return v.selectSchoolCountry;
      if (!form.nationality) return v.selectCountry;
      return null;
    case 2:
      if (!form.academicSystem) return v.selectAcademicSystem;
      if (!form.predictedScore.trim()) return v.enterScore;
      if (form.testsTaken.length === 0) return v.selectTest;
      if (missingScoreTests(form).length > 0) {
        return v.enterTestScores;
      }
      if (satScoreFieldInvalid(form)) {
        const m = satScoreValidationMessage(form.testScores["SAT"] ?? "");
        return m && m !== "required" ? m : v.checkSat;
      }
      if (actScoreFieldInvalid(form)) {
        const m = actScoreValidationMessage(form.testScores["ACT"] ?? "");
        return m && m !== "required" ? m : v.checkAct;
      }
      return null;
    case 3:
      if (!form.primaryStudyDestination) return v.selectDestination;
      if (!form.degreeLevel) return v.selectDegree;
      if (!form.intendedMajor) return v.selectMajor;
      if (form.excites.length === 0) return v.selectInterest;
      if (form.strongestSubjects.length === 0) return v.selectSubject;
      return null;
    case 4:
      if (!form.campusEnvironment) return v.selectEnvironment;
      if (form.mattersMost.length === 0) return v.selectMatters;
      if (form.mattersMost.length > 2) return v.maxMatters;
      if (form.outsideActivities.length === 0) return v.selectActivity;
      if (!form.academicAmbition) return v.selectAmbition;
      return null;
    case 5:
      if (!form.goalAfterUniversity) return v.selectGoal;
      if (!form.workLocationPreference) return v.selectWorkLoc;
      return null;
    case 6:
      if (!form.budgetBand) return v.selectBudget;
      return null;
    default:
      return null;
  }
}

function formToPayload(form: FormState, locale: "en" | "ar"): MatchingPayload {
  const academicSystemLabel =
    ACADEMIC_SYSTEM_LABELS_EN[form.academicSystem] ?? form.academicSystem;
  return {
    fullName: form.fullName.trim(),
    schoolName: form.schoolName.trim(),
    schoolCountry: form.schoolCountry,
    nationality: form.nationality,
    academicSystem: academicSystemLabel,
    predictedScore: form.predictedScore.trim(),
    testsTaken: form.testsTaken,
    testScoreNotes: buildTestScoreNotes(form),
    primaryStudyDestination: form.primaryStudyDestination,
    degreeLevel: form.degreeLevel,
    intendedMajor: form.intendedMajor,
    excites: form.excites,
    strongestSubjects: form.strongestSubjects,
    campusEnvironment: form.campusEnvironment,
    mattersMost: form.mattersMost,
    outsideActivities: form.outsideActivities,
    academicAmbition: form.academicAmbition,
    goalAfterUniversity: form.goalAfterUniversity,
    workLocationPreference: form.workLocationPreference,
    budgetBand: form.budgetBand,
    extraNotes: form.extraNotes.trim() || undefined,
    locale,
  };
}

export function AiUniversityMatching({
  profileDefaults,
}: {
  profileDefaults?: AiMatchingProfileDefaults | null;
}) {
  const { dict, locale } = useLocale();
  const t = dict.student.aiMatching;
  const o = t.options;
  const scoreMsgs = useMemo(
    () => ({
      wholeNumber: t.enterWholeNumber,
      satAboveMax: t.scoreValidation.satAboveMax,
      satBelowMin: t.scoreValidation.satBelowMin,
      actAboveMax: t.scoreValidation.actAboveMax,
      actBelowMin: t.scoreValidation.actBelowMin,
    }),
    [t],
  );
  const [form, setForm] = useState(() =>
    formStateFromProfileDefaults(profileDefaults ?? null),
  );
  const [showPrefillTip] = useState(() => {
    const d = profileDefaults;
    if (!d) return false;
    return Boolean(
      d.fullName.trim() ||
        d.schoolName.trim() ||
        d.schoolCountry.trim() ||
        d.nationality.trim() ||
        d.academicSystem.trim() ||
        d.predictedScore.trim() ||
        d.primaryStudyDestination.trim() ||
        d.intendedMajor.trim() ||
        d.budgetBand.trim() ||
        d.testsTaken.length > 0,
    );
  });
  const [screen, setScreen] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  const invalidFields = useMemo(() => {
    if (!stepError) return new Set<string>();
    const s = new Set<string>();
    if (screen === 1) {
      if (!form.fullName.trim()) s.add("fullName");
      if (!form.schoolName.trim()) s.add("schoolName");
      if (!form.schoolCountry) s.add("schoolCountry");
      if (!form.nationality) s.add("nationality");
    }
    if (screen === 2) {
      if (!form.academicSystem) s.add("academicSystem");
      if (form.academicSystem && !form.predictedScore.trim()) s.add("predictedScore");
      if (form.testsTaken.length === 0) s.add("testsTaken");
      for (const test of missingScoreTests(form)) {
        s.add(scoreFieldInvalidKey(test));
      }
      if (satScoreFieldInvalid(form)) {
        s.add(scoreFieldInvalidKey("SAT"));
      }
      if (actScoreFieldInvalid(form)) {
        s.add(scoreFieldInvalidKey("ACT"));
      }
    }
    if (screen === 3) {
      if (!form.primaryStudyDestination) s.add("destination");
      if (!form.degreeLevel) s.add("degreeLevel");
      if (!form.intendedMajor) s.add("major");
      if (form.excites.length === 0) s.add("excites");
      if (form.strongestSubjects.length === 0) s.add("subjects");
    }
    if (screen === 4) {
      if (!form.campusEnvironment) s.add("env");
      if (form.mattersMost.length === 0 || form.mattersMost.length > 2) s.add("matters");
      if (form.outsideActivities.length === 0) s.add("activities");
      if (!form.academicAmbition) s.add("ambition");
    }
    if (screen === 5) {
      if (!form.goalAfterUniversity) s.add("goal");
      if (!form.workLocationPreference) s.add("workloc");
    }
    if (screen === 6) {
      if (!form.budgetBand) s.add("budget");
    }
    return s;
  }, [stepError, screen, form]);

  const predictedGradeField = useMemo(() => {
    if (!form.academicSystem) return null;
    const fields = o.gradeFields as Record<string, { label: string; placeholder: string }>;
    return fields[form.academicSystem] ?? fields.other;
  }, [form.academicSystem, o.gradeFields]);

  const goNext = () => {
    if (screen === 0) {
      setScreen(1);
      setStepError(null);
      return;
    }
    const err = validateStep(screen, form, t.validation);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    setScreen((s) => Math.min(6, s + 1));
  };

  const goBack = () => {
    setStepError(null);
    setSubmitError(null);
    if (screen <= 1) setScreen(0);
    else setScreen((s) => s - 1);
  };

  const toggleTest = (t: string) => {
    setForm((f) => {
      let next = [...f.testsTaken];
      let scores = { ...f.testScores };
      if (t === "None") {
        if (next.includes("None")) {
          next = [];
        } else {
          next = ["None"];
          scores = {};
        }
      } else {
        next = next.filter((x) => x !== "None");
        if (next.includes(t)) {
          next = next.filter((x) => x !== t);
          const { [t]: _removed, ...rest } = scores;
          scores = rest;
        } else {
          next.push(t);
        }
      }
      return { ...f, testsTaken: next, testScores: scores };
    });
  };

  const toggleExcite = (label: string) => {
    setForm((f) => ({
      ...f,
      excites: f.excites.includes(label)
        ? f.excites.filter((x) => x !== label)
        : [...f.excites, label],
    }));
  };

  const toggleSubject = (sub: string) => {
    setForm((f) => ({
      ...f,
      strongestSubjects: f.strongestSubjects.includes(sub)
        ? f.strongestSubjects.filter((x) => x !== sub)
        : [...f.strongestSubjects, sub],
    }));
  };

  const toggleActivity = (label: string) => {
    setForm((f) => ({
      ...f,
      outsideActivities: f.outsideActivities.includes(label)
        ? f.outsideActivities.filter((x) => x !== label)
        : [...f.outsideActivities, label],
    }));
  };

  const toggleMatters = (label: string) => {
    setForm((f) => {
      const has = f.mattersMost.includes(label);
      if (has) {
        return { ...f, mattersMost: f.mattersMost.filter((x) => x !== label) };
      }
      if (f.mattersMost.length >= 2) {
        showToast(t.maxTwoOptions);
        return f;
      }
      return { ...f, mattersMost: [...f.mattersMost, label] };
    });
  };

  const submit = async () => {
    const err = validateStep(6, form, t.validation);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    setSubmitError(null);
    setLoading(true);
    try {
      const payload = formToPayload(form, locale);
      const response = await fetch("/api/ai/university-matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as MatchResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? t.unableToGenerate);
      }
      setResult(data);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t.unableToGenerate);
    } finally {
      setLoading(false);
    }
  };

  const retake = () => {
    setResult(null);
    setForm(initialForm);
    setScreen(0);
    setStepError(null);
    setSubmitError(null);
  };

  const progressPct = screen > 0 ? Math.round((screen / TOTAL_PROGRESS) * 100) : 0;

  if (result) {
    return (
      <div className="mx-auto w-full px-5 pb-[60px] pt-1">
        <div className="mb-4">
          <Link
            href="/student/universities"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-mid)] no-underline transition hover:text-[var(--green)]"
          >
            <ArrowLeft className="icon-directional size-4 shrink-0" strokeWidth={2} aria-hidden />
            {t.backToSearch}
          </Link>
        </div>
        <header className="results-header mb-6 text-center">
          <h1 className="serif mb-1.5 text-[28px] text-[var(--text)]">{t.bestMatches}</h1>
          <p className="mx-auto text-[14px] text-[var(--text-light)]">
            {t.resultsSubtitle}
          </p>
        </header>

        <div className="mb-3.5 flex gap-4 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-[26px] py-[22px] max-[600px]:flex-col">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[#d5e8db] bg-white">
            <Sparkles className="size-5 text-[var(--green)]" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="profile-label mb-1 text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--green)]">
              {t.yourProfile}
            </div>
            <p className="profile-text text-[14px] leading-relaxed text-[var(--text-mid)]">
              {result.profileSummary}
            </p>
          </div>
        </div>

        <section className="rec-card mb-5 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-[26px] py-[22px]">
          <h2 className="rec-title mb-2.5 text-[14px] font-semibold text-[var(--text)]">
            {t.recommendedStrategy}
          </h2>
          <div className="rec-pills flex flex-wrap gap-2">
            {result.recommendedStrategy.map((item) => (
              <span
                key={item}
                className="rec-pill rounded-[var(--radius-pill)] bg-[var(--green-bg)] px-4 py-1.5 text-[12px] font-medium text-[var(--green)]"
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        <div className="cat-label mb-3.5 mt-7 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[1px] text-[var(--text-hint)]">
          <span>{t.topMatches}</span>
          <span className="h-px flex-1 bg-[var(--border-light)]" />
        </div>

        <div className="match-grid flex flex-col gap-4">
          {result.matches.map((m) => (
            <MatchCard key={`${m.universityName}-${m.programName}`} match={m} />
          ))}
        </div>

        <div className="global-cta relative mt-12 overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--green)] to-[var(--green-dark)] px-8 py-14 max-[600px]:mt-9 max-[600px]:px-6 max-[600px]:py-10">
          <div className="pointer-events-none absolute -right-20 -top-20 size-[260px] rounded-full bg-white/[0.05]" />
          <div className="pointer-events-none absolute -bottom-[100px] -left-[60px] size-[220px] rounded-full bg-white/[0.04]" />
          <div className="global-cta-inner relative mx-auto max-w-[540px] text-center">
            <div className="global-cta-badge mb-4 inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.2px] text-white">
              <Check className="size-3.5" strokeWidth={2} aria-hidden />
              {t.ctaBadge}
            </div>
            <div className="global-cta-title serif mb-3 text-[30px] leading-tight tracking-[-0.3px] text-white max-[600px]:text-2xl">
              {t.ctaTitle}
            </div>
            <p className="global-cta-sub mx-auto mb-6 text-[14px] leading-relaxed text-white/[0.82] max-[600px]:text-[13px]">
              {t.ctaSubtitle}
            </p>
            <Link
              href="/student"
              className="global-cta-btn inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-white px-8 py-3.5 text-[13.5px] font-bold text-[var(--green-dark)] shadow-[0_4px_14px_rgba(0,0,0,0.12)] transition hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(0,0,0,0.18)]"
            >
              {t.startApplication}
              <ArrowRight className="icon-directional size-3.5" strokeWidth={2.5} aria-hidden />
            </Link>
            <p className="global-cta-line mt-5 text-[11.5px] font-medium tracking-[0.3px] text-white/[0.62]">
              {t.ctaFootnote}
            </p>
          </div>
        </div>

        <div className="results-footer mt-6 text-center">
          <button
            type="button"
            onClick={retake}
            className="btn-retake cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white px-7 py-3 text-[13px] font-semibold text-[var(--green)] transition hover:border-[var(--green)] hover:bg-[var(--green-bg)]"
          >
            {t.retakeQuiz}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full  px-5 pb-[60px] pt-1">
      <div className="mb-4">
        <Link
          href="/student/universities"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-mid)] no-underline transition hover:text-[var(--green)]"
        >
          <ArrowLeft className="icon-directional size-4 shrink-0" strokeWidth={2} aria-hidden />
          {t.backToSearch}
        </Link>
      </div>
      {toast ? (
        <div className="fixed bottom-8 left-1/2 z-[1000] -translate-x-1/2 rounded-[50px] bg-[var(--green-dark)] px-[22px] py-2.5 text-[12.5px] font-medium text-white shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
          {toast}
        </div>
      ) : null}

      <section
        className={clsx(
          "mb-5 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-6 py-4",
          screen === 0 && "hidden",
        )}
      >
        <div className="progress-top mb-2.5 flex items-center justify-between">
          <span className="progress-label text-[12px] font-medium text-[var(--text-light)]">
            {t.progressLabels[screen] ?? ""}
          </span>
          <span className="progress-step text-[12px] font-semibold text-[var(--green)]">
            {screen} / {TOTAL_PROGRESS}
          </span>
        </div>
        <div className="progress-bar h-1.5 overflow-hidden rounded-sm bg-[var(--border-light)]">
          <div
            className="progress-fill h-full rounded-sm bg-[var(--green)] transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </section>

      <div className="quiz-card flex min-h-[360px] flex-col rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] min-[720px]:px-11 min-[720px]:py-10 max-[600px]:px-[22px] max-[600px]:py-7">
        {loading ? (
          <div className="loading-state flex flex-col items-center gap-4 py-14">
            <Loader2 className="size-10 animate-spin text-[var(--green)]" aria-hidden />
            <div className="loading-title serif text-xl text-[var(--text)]">{t.findingMatches}</div>
            <div className="loading-sub text-[13px] text-[var(--text-light)]">
              {t.analyzing}
            </div>
          </div>
        ) : (
          <>
            {screen === 0 ? (
              <div className="intro flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <div className="intro-badge inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--green-bg)] px-4 py-1.5 text-[12px] font-medium text-[var(--green)]">
                  <Search className="size-3.5" strokeWidth={2} aria-hidden />
                  {t.aiPowered}
                </div>
                <h2 className="serif text-[30px] leading-tight text-[var(--text)]">
                  {t.introTitle}
                </h2>
                <p className="text-[15px] text-[var(--text-light)]">
                  {t.introSubtitle}
                </p>
                <p className="-mt-1 text-[12px] text-[var(--text-hint)]">{t.takesMinutes}</p>
                <button
                  type="button"
                  onClick={goNext}
                  className="btn-start mt-2 inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--green)] px-9 py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_16px_rgba(45,106,79,0.25)] transition hover:-translate-y-0.5 hover:bg-[var(--green-dark)]"
                >
                  {t.start}
                  <ArrowRight className="icon-directional size-4" strokeWidth={2.5} aria-hidden />
                </button>
              </div>
            ) : null}

            {screen === 1 ? (
              <div className="flex flex-1 flex-col">
                <div className="q-title serif mb-1.5 text-[22px] text-[var(--text)]">
                  {t.aboutYouTitle}
                </div>
                <div className="q-sub mb-6 text-[13px] text-[var(--text-light)]">
                  {t.aboutYouSubtitle}
                </div>
                {showPrefillTip ? (
                  <p className="-mt-4 mb-6 rounded-lg border border-[var(--green-light)] bg-[rgba(45,106,79,0.06)] px-3 py-2 text-[12px] leading-snug text-[var(--text-mid)]">
                    {t.prefillTip}
                  </p>
                ) : null}
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold text-[var(--text)]">
                    {t.fullName}
                  </label>
                  <input
                    className={clsx(
                      "field-input w-full rounded-[10px] border-[1.5px] px-4 py-2.5 text-sm transition outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.08)]",
                      invalidFields.has("fullName")
                        ? "border-[#E53935] shadow-[0_0_0_3px_rgba(229,57,53,0.08)]"
                        : "border-[var(--border)]",
                    )}
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder={t.fullNamePlaceholder}
                  />
                  <ValidationHint show={invalidFields.has("fullName")}>
                    {t.enterFullName}
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold text-[var(--text)]">
                    {t.schoolName}
                  </label>
                  <input
                    className={clsx(
                      "field-input w-full rounded-[10px] border-[1.5px] px-4 py-2.5 text-sm outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.08)]",
                      invalidFields.has("schoolName")
                        ? "border-[#E53935]"
                        : "border-[var(--border)]",
                    )}
                    value={form.schoolName}
                    onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
                    placeholder={t.schoolNamePlaceholder}
                  />
                  <ValidationHint show={invalidFields.has("schoolName")}>
                    {t.enterSchoolName}
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold text-[var(--text)]">
                    {t.schoolCountry}
                  </label>
                  <CountryPicker
                    value={form.schoolCountry}
                    onChange={(name) => setForm((f) => ({ ...f, schoolCountry: name }))}
                    invalid={invalidFields.has("schoolCountry")}
                  />
                  <ValidationHint show={invalidFields.has("schoolCountry")}>
                    {t.selectSchoolCountry}
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold text-[var(--text)]">
                    {t.nationality}
                  </label>
                  <CountryPicker
                    value={form.nationality}
                    onChange={(name) => setForm((f) => ({ ...f, nationality: name }))}
                    invalid={invalidFields.has("nationality")}
                  />
                  <ValidationHint show={invalidFields.has("nationality")}>
                    {t.selectCountry}
                  </ValidationHint>
                </div>
                <div className="quiz-nav mt-auto flex items-center justify-between pt-7">
                  <div />
                  <button
                    type="button"
                    onClick={goNext}
                    className="btn-next inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] border-0 bg-[var(--green)] px-7 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(45,106,79,0.2)] transition hover:-translate-y-px hover:bg-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                  >
                    {t.next}
                    <ArrowRight className="icon-directional size-3.5" strokeWidth={2.5} aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}

            {screen === 2 ? (
              <div className="flex flex-1 flex-col">
                <div className="q-title serif mb-1.5 text-[22px]">{t.academicsTitle}</div>
                <div className="q-sub mb-6 text-[13px] text-[var(--text-light)]">
                  {t.academicsSubtitle}
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    {t.academicSystem}
                  </label>
                  <select
                    className={clsx(
                      "field-select w-full cursor-pointer appearance-none rounded-[10px] border-[1.5px] bg-white py-2.5 pl-4 pr-10 text-sm outline-none focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.08)]",
                      invalidFields.has("academicSystem")
                        ? "border-[#E53935]"
                        : "border-[var(--border)]",
                    )}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237a7a7a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 14px center",
                    }}
                    value={form.academicSystem}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, academicSystem: e.target.value }))
                    }
                  >
                    <option value="">{t.selectSystem}</option>
                    {ACADEMIC_SYSTEM_VALUES.map((sys) => (
                      <option key={sys} value={sys}>
                        {optLabel(o.academicSystems as Record<string, string>, sys)}
                      </option>
                    ))}
                  </select>
                  <ValidationHint show={invalidFields.has("academicSystem")}>
                    {t.selectAcademicSystem}
                  </ValidationHint>
                </div>
                {predictedGradeField ? (
                  <div className="mb-[18px]">
                    <label
                      className="field-label mb-[7px] block text-[13px] font-semibold text-[var(--text)]"
                      htmlFor="predicted-grade-input"
                    >
                      {predictedGradeField.label}
                      <span className="text-[var(--green)]" aria-hidden>
                        {" "}
                        *
                      </span>
                    </label>
                    <input
                      id="predicted-grade-input"
                      type="text"
                      required
                      value={form.predictedScore}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, predictedScore: e.target.value }))
                      }
                      placeholder={predictedGradeField.placeholder}
                      className={clsx(
                        "w-full rounded-[10px] border-[1.5px] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.08)]",
                        invalidFields.has("predictedScore")
                          ? "border-[#E53935] shadow-[0_0_0_3px_rgba(229,57,53,0.08)]"
                          : "border-[var(--border)]",
                      )}
                      aria-invalid={invalidFields.has("predictedScore")}
                    />
                    <ValidationHint show={invalidFields.has("predictedScore")}>
                      {t.enterScore}
                    </ValidationHint>
                  </div>
                ) : null}
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    {t.testsTaken}
                  </label>
                  <div
                    className={clsx(
                      "check-grid flex flex-wrap gap-2",
                      invalidFields.has("testsTaken") &&
                        "rounded-lg outline outline-[1.5px] outline-[#E53935] outline-offset-[4px]",
                    )}
                  >
                    {TEST_OPTIONS.map((testOpt) => (
                      <PillToggle
                        key={testOpt}
                        selected={form.testsTaken.includes(testOpt)}
                        onClick={() => toggleTest(testOpt)}
                      >
                        {optLabel(o.tests as Record<string, string>, testOpt)}
                      </PillToggle>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("testsTaken")}>
                    {t.selectAtLeastOne}
                  </ValidationHint>
                  {TESTS_WITH_SCORE_INPUTS.some((test) => form.testsTaken.includes(test)) ? (
                    <div className="score-inputs mt-3 grid grid-cols-1 gap-3 min-[560px]:grid-cols-2">
                      {TESTS_WITH_SCORE_INPUTS.filter((test) =>
                        form.testsTaken.includes(test),
                      ).map((test) => {
                        const meta = testScoreFieldFromOptions(
                          test,
                          o.testScores as Record<
                            string,
                            { label: string; placeholder: string; scoreHint?: string }
                          >,
                        );
                        const scoreKey = scoreFieldInvalidKey(test);
                        const scoreInvalid = invalidFields.has(scoreKey);
                        const scoreRangeErrMsg =
                          test === "SAT"
                            ? satScoreValidationMessage(form.testScores[test] ?? "", scoreMsgs)
                            : test === "ACT"
                              ? actScoreValidationMessage(form.testScores[test] ?? "", scoreMsgs)
                              : null;
                        const showScoreRangeValidationError =
                          scoreInvalid &&
                          (test === "SAT" || test === "ACT") &&
                          scoreRangeErrMsg &&
                          scoreRangeErrMsg !== "required";
                        const scoreLooksValidInRange =
                          (test === "SAT" && satScoreInValidRange(form)) ||
                          (test === "ACT" && actScoreInValidRange(form));
                        return (
                          <div key={test} className="score-field">
                            <label
                              className="mb-1 block text-[11px] font-medium text-[var(--text-light)]"
                              htmlFor={`test-score-${test}`}
                            >
                              {meta.label}
                              <span className="text-[var(--green)]" aria-hidden>
                                {" "}
                                *
                              </span>
                              {test === "SAT" ? (
                                <span className="ml-1.5 font-normal text-[var(--text-hint)]">
                                  {formatTemplate(t.scoreValidation.outOfMax, {
                                    max: SAT_TOTAL_MAX,
                                  })}
                                </span>
                              ) : test === "ACT" ? (
                                <span className="ml-1.5 font-normal text-[var(--text-hint)]">
                                  {formatTemplate(t.scoreValidation.outOfMax, {
                                    max: ACT_COMPOSITE_MAX,
                                  })}
                                </span>
                              ) : null}
                            </label>
                            <input
                              id={`test-score-${test}`}
                              type="text"
                              required
                              inputMode={test === "SAT" || test === "ACT" ? "numeric" : undefined}
                              pattern={test === "SAT" || test === "ACT" ? "[0-9]*" : undefined}
                              value={form.testScores[test] ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const nextVal =
                                  test === "SAT"
                                    ? sanitizeSatScoreInput(raw)
                                    : test === "ACT"
                                      ? sanitizeActScoreInput(raw)
                                      : raw;
                                setForm((f) => ({
                                  ...f,
                                  testScores: {
                                    ...f.testScores,
                                    [test]: nextVal,
                                  },
                                }));
                              }}
                              placeholder={meta.placeholder}
                              className={clsx(
                                "w-full rounded-lg border-[1.5px] px-3 py-2 text-[13px] outline-none transition focus:border-[var(--green-light)]",
                                scoreInvalid
                                  ? "border-[#E53935] shadow-[0_0_0_3px_rgba(229,57,53,0.08)]"
                                  : scoreLooksValidInRange
                                    ? "border-[var(--green-light)] bg-[rgba(45,106,79,0.07)]"
                                    : "border-[var(--border)]",
                              )}
                              aria-invalid={scoreInvalid}
                              aria-describedby={
                                (test === "SAT" || test === "ACT") && meta.scoreHint
                                  ? `test-score-${test}-hint`
                                  : undefined
                              }
                            />
                            {(test === "SAT" || test === "ACT") && meta.scoreHint ? (
                              <p
                                id={`test-score-${test}-hint`}
                                className="mt-1 text-[11px] leading-snug text-[var(--text-hint)]"
                              >
                                {meta.scoreHint}
                              </p>
                            ) : null}
                            <ValidationHint show={scoreInvalid}>
                              {showScoreRangeValidationError
                                ? scoreRangeErrMsg
                                : formatTemplate(t.scoreValidation.enterTestScore, {
                                    label: meta.label.toLowerCase(),
                                  })}
                            </ValidationHint>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
                <div className="quiz-nav mt-auto flex items-center justify-between pt-7">
                  <button
                    type="button"
                    onClick={goBack}
                    className="btn-back cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-transparent px-6 py-2.5 text-[13px] font-medium text-[var(--text-mid)] transition hover:border-[var(--text-hint)] hover:bg-[var(--sand)]"
                  >
                    {t.back}
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--green)] px-7 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(45,106,79,0.2)] transition hover:-translate-y-px hover:bg-[var(--green-dark)]"
                  >
                    {t.next}
                    <ArrowRight className="icon-directional size-3.5" strokeWidth={2.5} aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}

            {screen === 3 ? (
              <div className="flex flex-1 flex-col">
                <div className="q-title serif mb-1.5 text-[22px]">{t.studyTitle}</div>
                <div className="q-sub mb-6 text-[13px] text-[var(--text-light)]">
                  {t.studySubtitle}
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    {t.studyDestination}
                  </label>
                  <CountryPicker
                    value={form.primaryStudyDestination}
                    onChange={(name) =>
                      setForm((f) => ({ ...f, primaryStudyDestination: name }))
                    }
                    invalid={invalidFields.has("destination")}
                  />
                  <ValidationHint show={invalidFields.has("destination")}>
                    {t.selectDestination}
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    {t.degreeLevel}
                  </label>
                  <select
                    className={clsx(
                      "w-full cursor-pointer appearance-none rounded-[10px] border-[1.5px] bg-white py-2.5 pl-4 pr-10 text-sm outline-none focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.08)]",
                      invalidFields.has("degreeLevel")
                        ? "border-[#E53935]"
                        : "border-[var(--border)]",
                    )}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237a7a7a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 14px center",
                    }}
                    value={form.degreeLevel}
                    onChange={(e) => setForm((f) => ({ ...f, degreeLevel: e.target.value }))}
                  >
                    {DEGREE_LEVELS.map((d) => (
                      <option key={d} value={d}>
                        {optLabel(o.degreeLevels as Record<string, string>, d)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    {t.intendedMajor}
                  </label>
                  <MajorPicker
                    value={form.intendedMajor}
                    onChange={(major) => setForm((f) => ({ ...f, intendedMajor: major }))}
                    invalid={invalidFields.has("major")}
                  />
                  <ValidationHint show={invalidFields.has("major")}>
                    {t.selectFieldOfStudy}
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    {t.excitesYou}{" "}
                    <span className="field-meta font-medium text-[var(--text-hint)]">
                      {t.selectAll}
                    </span>
                  </label>
                  <div
                    className={clsx(
                      "grid grid-cols-2 gap-2.5 min-[860px]:grid-cols-4",
                      invalidFields.has("excites") &&
                        "rounded-lg p-1 outline outline-[1.5px] outline-[#E53935] outline-offset-[4px]",
                    )}
                  >
                    {EXCITES_OPTIONS.map((opt) => (
                      <OptTile
                        key={opt}
                        selected={form.excites.includes(opt)}
                        onClick={() => toggleExcite(opt)}
                      >
                        {optLabel(o.excites as Record<string, string>, opt)}
                      </OptTile>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("excites")}>
                    {t.selectAtLeastOne}
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    {t.strongestSubjects}{" "}
                    <span className="field-meta font-medium text-[var(--text-hint)]">
                      {t.selectAll}
                    </span>
                  </label>
                  <div
                    className={clsx(
                      "space-y-3.5",
                      invalidFields.has("subjects") &&
                        "rounded-lg outline outline-[1.5px] outline-[#E53935] outline-offset-[4px]",
                    )}
                  >
                    {SUBJECT_GROUPS.map((g) => (
                      <div key={g.label}>
                        <div className="subj-group-label mb-2 text-[10px] font-bold uppercase tracking-[0.8px] text-[var(--text-hint)]">
                          {optLabel(o.subjectGroups as Record<string, string>, g.label)}
                        </div>
                        <div className="subj-grid flex flex-wrap gap-2">
                          {g.subjects.map((sub) => (
                            <SubjectChip
                              key={sub}
                              selected={form.strongestSubjects.includes(sub)}
                              onClick={() => toggleSubject(sub)}
                            >
                              {optLabel(o.subjects as Record<string, string>, sub)}
                            </SubjectChip>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("subjects")}>
                    {t.selectSubject}
                  </ValidationHint>
                </div>
                <div className="quiz-nav mt-auto flex items-center justify-between pt-7">
                  <button
                    type="button"
                    onClick={goBack}
                    className="cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-transparent px-6 py-2.5 text-[13px] font-medium text-[var(--text-mid)] hover:bg-[var(--sand)]"
                  >
                    {t.back}
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--green)] px-7 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(45,106,79,0.2)] transition hover:-translate-y-px hover:bg-[var(--green-dark)]"
                  >
                    {t.next}
                    <ArrowRight className="icon-directional size-3.5" strokeWidth={2.5} aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}

            {screen === 4 ? (
              <div className="flex flex-1 flex-col">
                <div className="q-title serif mb-1.5 text-[22px]">
                  {t.lifestyleTitle}
                </div>
                <div className="q-sub mb-6 text-[13px] text-[var(--text-light)]">
                  {t.lifestyleSubtitle}
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    {t.campusEnvironment}
                  </label>
                  <div
                    className={clsx(
                      "grid grid-cols-1 gap-2.5 min-[560px]:grid-cols-3",
                      invalidFields.has("env") &&
                        "rounded-lg outline outline-[1.5px] outline-[#E53935] outline-offset-[4px]",
                    )}
                  >
                    {ENV_OPTIONS.map((opt) => (
                      <OptTile
                        key={opt}
                        selected={form.campusEnvironment === opt}
                        onClick={() => setForm((f) => ({ ...f, campusEnvironment: opt }))}
                      >
                        {optLabel(o.env as Record<string, string>, opt)}
                      </OptTile>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("env")}>
                    {t.selectEnvironment}
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    {t.mattersMost}{" "}
                    <span className="field-meta font-medium text-[var(--text-hint)]">
                      {t.selectUpTo2}
                    </span>
                  </label>
                  <div
                    className={clsx(
                      "grid grid-cols-1 gap-2.5 min-[560px]:grid-cols-3",
                      invalidFields.has("matters") &&
                        "rounded-lg outline outline-[1.5px] outline-[#E53935] outline-offset-[4px]",
                    )}
                  >
                    {MATTERS_OPTIONS.map((opt) => (
                      <OptTile
                        key={opt}
                        selected={form.mattersMost.includes(opt)}
                        onClick={() => toggleMatters(opt)}
                      >
                        {optLabel(o.matters as Record<string, string>, opt)}
                      </OptTile>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("matters")}>
                    {t.selectMatters}
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    {t.outsideSchool}{" "}
                    <span className="field-meta font-medium text-[var(--text-hint)]">
                      {t.selectAll}
                    </span>
                  </label>
                  <div
                    className={clsx(
                      "flex flex-wrap gap-2",
                      invalidFields.has("activities") &&
                        "rounded-lg outline outline-[1.5px] outline-[#E53935] outline-offset-[4px]",
                    )}
                  >
                    {ACTIVITY_OPTIONS.map((opt) => (
                      <PillToggle
                        key={opt}
                        selected={form.outsideActivities.includes(opt)}
                        onClick={() => toggleActivity(opt)}
                      >
                        {optLabel(o.activities as Record<string, string>, opt)}
                      </PillToggle>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("activities")}>
                    {t.selectActivity}
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    {t.academicAmbition}
                  </label>
                  <div
                    className={clsx(
                      "grid grid-cols-1 gap-2.5 min-[560px]:grid-cols-3",
                      invalidFields.has("ambition") &&
                        "rounded-lg outline outline-[1.5px] outline-[#E53935] outline-offset-[4px]",
                    )}
                  >
                    {AMBITION_OPTIONS.map((opt) => (
                      <OptTile
                        key={opt}
                        selected={form.academicAmbition === opt}
                        onClick={() => setForm((f) => ({ ...f, academicAmbition: opt }))}
                      >
                        {optLabel(o.ambition as Record<string, string>, opt)}
                      </OptTile>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("ambition")}>
                    {t.selectAmbition}
                  </ValidationHint>
                </div>
                <div className="quiz-nav mt-auto flex items-center justify-between pt-7">
                  <button
                    type="button"
                    onClick={goBack}
                    className="cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] px-6 py-2.5 text-[13px] font-medium text-[var(--text-mid)] hover:bg-[var(--sand)]"
                  >
                    {t.back}
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--green)] px-7 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(45,106,79,0.2)] transition hover:-translate-y-px hover:bg-[var(--green-dark)]"
                  >
                    {t.next}
                    <ArrowRight className="icon-directional size-3.5" strokeWidth={2.5} aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}

            {screen === 5 ? (
              <div className="flex flex-1 flex-col">
                <div className="q-title serif mb-1.5 text-[22px]">{t.goalsTitle}</div>
                <div className="q-sub mb-6 text-[13px] text-[var(--text-light)]">
                  {t.goalsSubtitle}
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    {t.goalAfterUni}
                  </label>
                  <div
                    className={clsx(
                      "grid grid-cols-1 gap-2.5 min-[560px]:grid-cols-3",
                      invalidFields.has("goal") &&
                        "rounded-lg outline outline-[1.5px] outline-[#E53935] outline-offset-[4px]",
                    )}
                  >
                    {GOAL_OPTIONS.map((opt) => (
                      <OptTile
                        key={opt}
                        selected={form.goalAfterUniversity === opt}
                        onClick={() => setForm((f) => ({ ...f, goalAfterUniversity: opt }))}
                      >
                        {optLabel(o.goals as Record<string, string>, opt)}
                      </OptTile>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("goal")}>
                    {t.selectGoal}
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    {t.workLocation}
                  </label>
                  <div
                    className={clsx(
                      "grid grid-cols-2 gap-2.5",
                      invalidFields.has("workloc") &&
                        "rounded-lg outline outline-[1.5px] outline-[#E53935] outline-offset-[4px]",
                    )}
                  >
                    {WORKLOC_OPTIONS.map((opt) => (
                      <OptTile
                        key={opt}
                        selected={form.workLocationPreference === opt}
                        onClick={() =>
                          setForm((f) => ({ ...f, workLocationPreference: opt }))
                        }
                      >
                        {optLabel(o.workLoc as Record<string, string>, opt)}
                      </OptTile>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("workloc")}>
                    {t.selectWorkPref}
                  </ValidationHint>
                </div>
                <div className="quiz-nav mt-auto flex items-center justify-between pt-7">
                  <button
                    type="button"
                    onClick={goBack}
                    className="cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] px-6 py-2.5 text-[13px] font-medium hover:bg-[var(--sand)]"
                  >
                    {t.back}
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--green)] px-7 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(45,106,79,0.2)] transition hover:-translate-y-px hover:bg-[var(--green-dark)]"
                  >
                    {t.next}
                    <ArrowRight className="icon-directional size-3.5" strokeWidth={2.5} aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}

            {screen === 6 ? (
              <div className="flex flex-1 flex-col">
                <div className="q-title serif mb-1.5 text-[22px]">{t.budgetTitle}</div>
                <div className="q-sub mb-6 text-[13px] text-[var(--text-light)]">
                  {t.budgetSubtitle}
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    {t.budgetQuestion}
                  </label>
                  <div
                    className={clsx(
                      "grid grid-cols-1 gap-2.5 min-[560px]:grid-cols-3",
                      invalidFields.has("budget") &&
                        "rounded-lg outline outline-[1.5px] outline-[#E53935] outline-offset-[4px]",
                    )}
                  >
                    {BUDGET_OPTIONS.map((opt) => (
                      <OptTile
                        key={opt}
                        selected={form.budgetBand === opt}
                        onClick={() => setForm((f) => ({ ...f, budgetBand: opt }))}
                      >
                        {optLabel(o.budget as Record<string, string>, opt)}
                      </OptTile>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("budget")}>
                    {t.selectBudget}
                  </ValidationHint>
                </div>
                <label className="field-label mb-[7px] block text-[13px] font-semibold">
                  {t.anythingElse}{" "}
                  <span className="font-medium text-[var(--text-hint)]">{t.optional}</span>
                </label>
                <textarea
                  rows={3}
                  className="mb-4 w-full resize-none rounded-[10px] border-[1.5px] border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.08)]"
                  placeholder={t.extraNotesPlaceholder}
                  value={form.extraNotes}
                  onChange={(e) => setForm((f) => ({ ...f, extraNotes: e.target.value }))}
                />
                {submitError ? (
                  <div
                    className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    role="alert"
                  >
                    {submitError}
                  </div>
                ) : null}
                <div className="quiz-nav mt-auto flex justify-center pt-9">
                  <button
                    type="button"
                    onClick={submit}
                    className="btn-match inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--green)] px-9 py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_16px_rgba(45,106,79,0.25)] transition hover:-translate-y-0.5 hover:bg-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                  >
                    {t.findMatches}
                    <ArrowRight className="icon-directional size-4" strokeWidth={2.5} aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
