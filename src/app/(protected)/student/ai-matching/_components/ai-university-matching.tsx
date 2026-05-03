"use client";

import clsx from "clsx";
import Link from "next/link";
import {
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

const PROGRESS_LABELS = [
  "Getting started",
  "About you",
  "Academics",
  "Study interests",
  "Lifestyle",
  "Goals",
  "Budget",
] as const;

const TOTAL_PROGRESS = 7;

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

function testScoreFieldMeta(test: string): { label: string; placeholder: string } {
  switch (test) {
    case "SAT":
      return { label: "SAT Score", placeholder: "e.g. 1400" };
    case "IELTS":
      return { label: "IELTS Band", placeholder: "e.g. 7.0" };
    case "ACT":
      return { label: "ACT Score", placeholder: "e.g. 32" };
    case "TOEFL":
      return { label: "TOEFL Score", placeholder: "e.g. 100" };
    case "Duolingo":
      return { label: "Duolingo Score", placeholder: "e.g. 120" };
    default:
      return { label: `${test} score`, placeholder: "" };
  }
}

const ACADEMIC_SYSTEMS = [
  { value: "ib", label: "IB (International Baccalaureate)" },
  { value: "al", label: "A Levels" },
  { value: "us", label: "American System (GPA)" },
  { value: "igcse", label: "IGCSE" },
  { value: "french", label: "French Baccalaureate" },
  { value: "indian", label: "Indian Curriculum (CBSE/ISC)" },
  { value: "national", label: "National Curriculum" },
  { value: "other", label: "Other" },
] as const;

/** Labels & placeholders from `showGradeInput()` in ai_university_matching.html */
function gradeFieldMeta(systemValue: string): { label: string; placeholder: string } {
  const map: Record<string, readonly [string, string]> = {
    ib: ["Predicted IB score", "e.g. 38"],
    al: ["Predicted A Level grades", "e.g. AAB"],
    us: ["Current GPA", "e.g. 3.7"],
    igcse: ["Predicted IGCSE grades", "e.g. 7A* 2A"],
    french: ["Predicted score", "e.g. 15/20"],
    indian: ["Predicted percentage", "e.g. 92%"],
    national: ["Current average", "e.g. 90%"],
    other: ["Your score / grade", "Enter your score"],
  };
  const row = map[systemValue] ?? map.other;
  return { label: row[0], placeholder: row[1] };
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

type UniversityMatch = {
  universityName: string;
  programName: string;
  city: string;
  country: string;
  matchScore: number;
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
  placeholder,
  invalid,
}: {
  value: string;
  onChange: (name: string) => void;
  placeholder: string;
  invalid?: boolean;
}) {
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
              {selected.name}
            </>
          ) : (
            placeholder
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
              placeholder="Search country..."
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
                  <span className="flex-1">{c.name}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="px-4 py-4 text-center text-[12px] text-[var(--text-hint)]">
                No countries found
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
          {value || "Select a field"}
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
              placeholder="Search majors..."
              className="w-full rounded-lg border-[1.5px] border-[var(--border-light)] bg-[var(--sand)] py-2 pl-9 pr-3 text-[13px] outline-none focus:border-[var(--green-light)] focus:bg-white"
              autoFocus
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1.5">
            {groups.map(({ group, majors }) => (
              <div key={group}>
                <div className="px-4 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.8px] text-[var(--text-hint)]">
                  {group}
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
                    {m}
                  </button>
                ))}
              </div>
            ))}
            {groups.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-[var(--text-hint)]">
                No majors found
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

function MatchScoreRing({ score }: { score: number }) {
  const n = Math.min(100, Math.max(0, Math.round(score)));
  return (
    <div className="flex size-16 shrink-0 items-center justify-center rounded-full border-[6px] border-[var(--green-bg)] bg-white shadow-[inset_0_0_0_2px_#d5e8db]">
      <span className="text-[17px] font-bold text-[var(--green)]">{n}</span>
    </div>
  );
}

function MatchCard({ match }: { match: UniversityMatch }) {
  return (
    <article className="rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white p-7 transition hover:border-[#d5dbd8] hover:shadow-[0_6px_22px_rgba(0,0,0,0.05)] max-[600px]:px-5 max-[600px]:py-[22px]">
      <p className="mb-[18px] text-[13px] text-[var(--text-light)]">
        Program aligned with your interests and academic strengths.
      </p>
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="serif text-[22px] leading-tight tracking-[-0.2px] text-[var(--text)] max-[600px]:text-[19px]">
            {match.universityName}
          </h3>
          <p className="mt-1 text-[13px] text-[var(--text-light)]">{match.programName}</p>
          <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[var(--text-light)]">
            <MapPin className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
            {match.city}, {match.country}
          </p>
        </div>
        <MatchScoreRing score={match.matchScore} />
      </div>

      <div className="mb-[18px] flex flex-wrap gap-2">
        <span className="rounded-[var(--radius-pill)] bg-[var(--green-pale)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--green)]">
          {match.admissionFit}
        </span>
        <span className="rounded-[var(--radius-pill)] bg-[var(--sand)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--text-mid)]">
          {match.tuitionEstimate}
        </span>
      </div>

      <div className="mb-3.5 rounded-[var(--radius)] border border-[#d5e8db] bg-[var(--green-pale)] px-5 py-4">
        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.7px] text-[var(--green)]">
          Why this matches
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

      <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[var(--border-light)] pt-4">
        {match.nextSteps.slice(0, 2).map((step) => (
          <span
            key={step}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--text-mid)]"
          >
            <Check className="size-3 text-[var(--green)]" aria-hidden />
            {step}
          </span>
        ))}
        <a
          href={match.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--green)] px-[22px] py-2.5 text-[12.5px] font-semibold text-white! no-underline transition hover:bg-[var(--green-dark)] hover:text-white!"
        >
          Visit official page
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

function validateStep(step: number, form: FormState): string | null {
  switch (step) {
    case 1:
      if (!form.fullName.trim()) return "Please enter your full name.";
      if (!form.schoolName.trim()) return "Please enter your school name.";
      if (!form.schoolCountry) return "Please select your school's country.";
      if (!form.nationality) return "Please select your country.";
      return null;
    case 2:
      if (!form.academicSystem) return "Please select your academic system.";
      if (!form.predictedScore.trim()) return "Please enter your score.";
      if (form.testsTaken.length === 0) return "Please select at least one test option.";
      if (missingScoreTests(form).length > 0) {
        return "Please enter a score for each selected test.";
      }
      return null;
    case 3:
      if (!form.primaryStudyDestination) return "Please select where you would like to study.";
      if (!form.degreeLevel) return "Please select degree level.";
      if (!form.intendedMajor) return "Please select a field of study.";
      if (form.excites.length === 0) return "Select at least one interest.";
      if (form.strongestSubjects.length === 0) return "Select at least one subject.";
      return null;
    case 4:
      if (!form.campusEnvironment) return "Please select a campus environment.";
      if (form.mattersMost.length === 0) return "Please select what matters most (up to 2).";
      if (form.mattersMost.length > 2) return "Select at most 2 priorities.";
      if (form.outsideActivities.length === 0) return "Select at least one activity.";
      if (!form.academicAmbition) return "Please select your academic ambition.";
      return null;
    case 5:
      if (!form.goalAfterUniversity) return "Please select your goal after university.";
      if (!form.workLocationPreference) return "Please select a work location preference.";
      return null;
    case 6:
      if (!form.budgetBand) return "Please select your budget range.";
      return null;
    default:
      return null;
  }
}

function formToPayload(form: FormState): MatchingPayload {
  const sys = ACADEMIC_SYSTEMS.find((x) => x.value === form.academicSystem);
  return {
    fullName: form.fullName.trim(),
    schoolName: form.schoolName.trim(),
    schoolCountry: form.schoolCountry,
    nationality: form.nationality,
    academicSystem: sys?.label ?? form.academicSystem,
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
  };
}

export function AiUniversityMatching() {
  const [form, setForm] = useState<FormState>(initialForm);
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

  const predictedGradeField = useMemo(
    () => (form.academicSystem ? gradeFieldMeta(form.academicSystem) : null),
    [form.academicSystem],
  );

  const goNext = () => {
    if (screen === 0) {
      setScreen(1);
      setStepError(null);
      return;
    }
    const err = validateStep(screen, form);
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
        showToast("You can select up to 2 options");
        return f;
      }
      return { ...f, mattersMost: [...f.mattersMost, label] };
    });
  };

  const submit = async () => {
    const err = validateStep(6, form);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    setSubmitError(null);
    setLoading(true);
    try {
      const payload = formToPayload(form);
      const response = await fetch("/api/ai/university-matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as MatchResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to generate AI matches.");
      }
      setResult(data);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Unable to generate AI matches.");
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
        <header className="results-header mb-6 text-center">
          <h1 className="serif mb-1.5 text-[28px] text-[var(--text)]">Your best matches</h1>
          <p className="mx-auto text-[14px] text-[var(--text-light)]">
            Based on your academic background, preferences, lifestyle, and goals — here are
            universities that fit you best.
          </p>
        </header>

        <div className="mb-3.5 flex gap-4 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-[26px] py-[22px] max-[600px]:flex-col">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[#d5e8db] bg-white">
            <Sparkles className="size-5 text-[var(--green)]" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="profile-label mb-1 text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--green)]">
              Your profile
            </div>
            <p className="profile-text text-[14px] leading-relaxed text-[var(--text-mid)]">
              {result.profileSummary}
            </p>
          </div>
        </div>

        <section className="rec-card mb-5 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-[26px] py-[22px]">
          <h2 className="rec-title mb-2.5 text-[14px] font-semibold text-[var(--text)]">
            Recommended strategy
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
          <span>Your top matches</span>
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
              End-to-end application support
            </div>
            <div className="global-cta-title serif mb-3 text-[30px] leading-tight tracking-[-0.3px] text-white max-[600px]:text-2xl">
              Let us handle your applications for you
            </div>
            <p className="global-cta-sub mx-auto mb-6 text-[14px] leading-relaxed text-white/[0.82] max-[600px]:text-[13px]">
              We&apos;ll take care of everything — from shortlisting to submission — so you can
              focus on what matters most.
            </p>
            <Link
              href="/student"
              className="global-cta-btn inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-white px-8 py-3.5 text-[13.5px] font-bold text-[var(--green-dark)] shadow-[0_4px_14px_rgba(0,0,0,0.12)] transition hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(0,0,0,0.18)]"
            >
              Start your application
              <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden />
            </Link>
            <p className="global-cta-line mt-5 text-[11.5px] font-medium tracking-[0.3px] text-white/[0.62]">
              Dedicated advisor · End-to-end support · Full visibility
            </p>
          </div>
        </div>

        <div className="results-footer mt-6 text-center">
          <button
            type="button"
            onClick={retake}
            className="btn-retake cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white px-7 py-3 text-[13px] font-semibold text-[var(--green)] transition hover:border-[var(--green)] hover:bg-[var(--green-bg)]"
          >
            Retake quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full  px-5 pb-[60px] pt-1">
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
            {PROGRESS_LABELS[screen] ?? ""}
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
            <div className="loading-title serif text-xl text-[var(--text)]">Finding your best matches...</div>
            <div className="loading-sub text-[13px] text-[var(--text-light)]">
              Analyzing universities against your profile
            </div>
          </div>
        ) : (
          <>
            {screen === 0 ? (
              <div className="intro flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <div className="intro-badge inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--green-bg)] px-4 py-1.5 text-[12px] font-medium text-[var(--green)]">
                  <Search className="size-3.5" strokeWidth={2} aria-hidden />
                  AI-powered matching
                </div>
                <h2 className="serif text-[30px] leading-tight text-[var(--text)]">
                  Let&apos;s find the right universities for you
                </h2>
                <p className="text-[15px] text-[var(--text-light)]">
                  We&apos;ll use this to match you with the best programs based on your interests
                  and strengths.
                </p>
                <p className="-mt-1 text-[12px] text-[var(--text-hint)]">Takes less than 5 minutes</p>
                <button
                  type="button"
                  onClick={goNext}
                  className="btn-start mt-2 inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--green)] px-9 py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_16px_rgba(45,106,79,0.25)] transition hover:-translate-y-0.5 hover:bg-[var(--green-dark)]"
                >
                  Start
                  <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden />
                </button>
              </div>
            ) : null}

            {screen === 1 ? (
              <div className="flex flex-1 flex-col">
                <div className="q-title serif mb-1.5 text-[22px] text-[var(--text)]">
                  Tell us about yourself
                </div>
                <div className="q-sub mb-6 text-[13px] text-[var(--text-light)]">
                  We&apos;ll use this to find relevant opportunities for your background and region.
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold text-[var(--text)]">
                    Full name
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
                    placeholder="Enter your full name"
                  />
                  <ValidationHint show={invalidFields.has("fullName")}>
                    Please enter your full name
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold text-[var(--text)]">
                    What school do you attend?
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
                    placeholder="Enter your school name"
                  />
                  <ValidationHint show={invalidFields.has("schoolName")}>
                    Please enter your school name
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold text-[var(--text)]">
                    What country is your school in?
                  </label>
                  <CountryPicker
                    value={form.schoolCountry}
                    onChange={(name) => setForm((f) => ({ ...f, schoolCountry: name }))}
                    placeholder="Search or select a country"
                    invalid={invalidFields.has("schoolCountry")}
                  />
                  <ValidationHint show={invalidFields.has("schoolCountry")}>
                    Please select your school&apos;s country
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold text-[var(--text)]">
                    Where are you from?
                  </label>
                  <CountryPicker
                    value={form.nationality}
                    onChange={(name) => setForm((f) => ({ ...f, nationality: name }))}
                    placeholder="Search or select a country"
                    invalid={invalidFields.has("nationality")}
                  />
                  <ValidationHint show={invalidFields.has("nationality")}>
                    Please select your country
                  </ValidationHint>
                </div>
                <div className="quiz-nav mt-auto flex items-center justify-between pt-7">
                  <div />
                  <button
                    type="button"
                    onClick={goNext}
                    className="btn-next inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] border-0 bg-[var(--green)] px-7 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(45,106,79,0.2)] transition hover:-translate-y-px hover:bg-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                  >
                    Next
                    <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}

            {screen === 2 ? (
              <div className="flex flex-1 flex-col">
                <div className="q-title serif mb-1.5 text-[22px]">Your academic profile</div>
                <div className="q-sub mb-6 text-[13px] text-[var(--text-light)]">
                  This helps us match you with universities that fit your academic level.
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    What is your academic system?
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
                    <option value="">Select system</option>
                    {ACADEMIC_SYSTEMS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ValidationHint show={invalidFields.has("academicSystem")}>
                    Please select your academic system
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
                      Please enter your score
                    </ValidationHint>
                  </div>
                ) : null}
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    Have you taken any tests?
                  </label>
                  <div
                    className={clsx(
                      "check-grid flex flex-wrap gap-2",
                      invalidFields.has("testsTaken") &&
                        "rounded-lg outline outline-[1.5px] outline-[#E53935] outline-offset-[4px]",
                    )}
                  >
                    {TEST_OPTIONS.map((t) => (
                      <PillToggle
                        key={t}
                        selected={form.testsTaken.includes(t)}
                        onClick={() => toggleTest(t)}
                      >
                        {t}
                      </PillToggle>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("testsTaken")}>
                    Please select at least one option
                  </ValidationHint>
                  {TESTS_WITH_SCORE_INPUTS.some((test) => form.testsTaken.includes(test)) ? (
                    <div className="score-inputs mt-3 grid grid-cols-1 gap-3 min-[560px]:grid-cols-2">
                      {TESTS_WITH_SCORE_INPUTS.filter((test) =>
                        form.testsTaken.includes(test),
                      ).map((test) => {
                        const meta = testScoreFieldMeta(test);
                        const scoreKey = scoreFieldInvalidKey(test);
                        const scoreInvalid = invalidFields.has(scoreKey);
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
                            </label>
                            <input
                              id={`test-score-${test}`}
                              type="text"
                              required
                              value={form.testScores[test] ?? ""}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  testScores: {
                                    ...f.testScores,
                                    [test]: e.target.value,
                                  },
                                }))
                              }
                              placeholder={meta.placeholder}
                              className={clsx(
                                "w-full rounded-lg border-[1.5px] px-3 py-2 text-[13px] outline-none transition focus:border-[var(--green-light)]",
                                scoreInvalid
                                  ? "border-[#E53935] shadow-[0_0_0_3px_rgba(229,57,53,0.08)]"
                                  : "border-[var(--border)]",
                              )}
                              aria-invalid={scoreInvalid}
                            />
                            <ValidationHint show={scoreInvalid}>
                              Enter your {meta.label.toLowerCase()}
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
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--green)] px-7 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(45,106,79,0.2)] transition hover:-translate-y-px hover:bg-[var(--green-dark)]"
                  >
                    Next
                    <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}

            {screen === 3 ? (
              <div className="flex flex-1 flex-col">
                <div className="q-title serif mb-1.5 text-[22px]">What do you want to study?</div>
                <div className="q-sub mb-6 text-[13px] text-[var(--text-light)]">
                  Tell us your destination, interests, and strengths so we can match you accurately.
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    Where would you like to study?
                  </label>
                  <CountryPicker
                    value={form.primaryStudyDestination}
                    onChange={(name) =>
                      setForm((f) => ({ ...f, primaryStudyDestination: name }))
                    }
                    placeholder="Search or select a country"
                    invalid={invalidFields.has("destination")}
                  />
                  <ValidationHint show={invalidFields.has("destination")}>
                    Please select a destination
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    Degree level
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
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    What do you want to study?
                  </label>
                  <MajorPicker
                    value={form.intendedMajor}
                    onChange={(major) => setForm((f) => ({ ...f, intendedMajor: major }))}
                    invalid={invalidFields.has("major")}
                  />
                  <ValidationHint show={invalidFields.has("major")}>
                    Please select a field of study
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    What excites you most?{" "}
                    <span className="field-meta font-medium text-[var(--text-hint)]">
                      Select all that apply
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
                        {opt}
                      </OptTile>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("excites")}>
                    Please select at least one option
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    What are your strongest subjects?{" "}
                    <span className="field-meta font-medium text-[var(--text-hint)]">
                      Select all that apply
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
                          {g.label}
                        </div>
                        <div className="subj-grid flex flex-wrap gap-2">
                          {g.subjects.map((sub) => (
                            <SubjectChip
                              key={sub}
                              selected={form.strongestSubjects.includes(sub)}
                              onClick={() => toggleSubject(sub)}
                            >
                              {sub}
                            </SubjectChip>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("subjects")}>
                    Please select at least one subject
                  </ValidationHint>
                </div>
                <div className="quiz-nav mt-auto flex items-center justify-between pt-7">
                  <button
                    type="button"
                    onClick={goBack}
                    className="cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-transparent px-6 py-2.5 text-[13px] font-medium text-[var(--text-mid)] hover:bg-[var(--sand)]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--green)] px-7 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(45,106,79,0.2)] transition hover:-translate-y-px hover:bg-[var(--green-dark)]"
                  >
                    Next
                    <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}

            {screen === 4 ? (
              <div className="flex flex-1 flex-col">
                <div className="q-title serif mb-1.5 text-[22px]">
                  Your lifestyle and interests
                </div>
                <div className="q-sub mb-6 text-[13px] text-[var(--text-light)]">
                  We&apos;ll match universities that fit your lifestyle, goals, and personality.
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    What type of campus environment suits you best?
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
                        {opt}
                      </OptTile>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("env")}>
                    Please select an environment
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    What matters most to you?{" "}
                    <span className="field-meta font-medium text-[var(--text-hint)]">
                      Select up to 2
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
                        {opt}
                      </OptTile>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("matters")}>
                    Please select what matters most (1–2 options)
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    What do you spend time on outside school?{" "}
                    <span className="field-meta font-medium text-[var(--text-hint)]">
                      Select all that apply
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
                        {opt}
                      </PillToggle>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("activities")}>
                    Please select at least one activity
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    How would you describe your academic ambition?
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
                        {opt}
                      </OptTile>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("ambition")}>
                    Please select your ambition level
                  </ValidationHint>
                </div>
                <div className="quiz-nav mt-auto flex items-center justify-between pt-7">
                  <button
                    type="button"
                    onClick={goBack}
                    className="cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] px-6 py-2.5 text-[13px] font-medium text-[var(--text-mid)] hover:bg-[var(--sand)]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--green)] px-7 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(45,106,79,0.2)] transition hover:-translate-y-px hover:bg-[var(--green-dark)]"
                  >
                    Next
                    <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}

            {screen === 5 ? (
              <div className="flex flex-1 flex-col">
                <div className="q-title serif mb-1.5 text-[22px]">Your goals</div>
                <div className="q-sub mb-6 text-[13px] text-[var(--text-light)]">
                  Understanding your ambitions helps us recommend the right path.
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    What&apos;s your goal after university?
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
                        {opt}
                      </OptTile>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("goal")}>
                    Please select your goal
                  </ValidationHint>
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    Where do you see yourself working?
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
                        {opt}
                      </OptTile>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("workloc")}>
                    Please select a preference
                  </ValidationHint>
                </div>
                <div className="quiz-nav mt-auto flex items-center justify-between pt-7">
                  <button
                    type="button"
                    onClick={goBack}
                    className="cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] px-6 py-2.5 text-[13px] font-medium hover:bg-[var(--sand)]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--green)] px-7 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(45,106,79,0.2)] transition hover:-translate-y-px hover:bg-[var(--green-dark)]"
                  >
                    Next
                    <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}

            {screen === 6 ? (
              <div className="flex flex-1 flex-col">
                <div className="q-title serif mb-1.5 text-[22px]">One last thing</div>
                <div className="q-sub mb-6 text-[13px] text-[var(--text-light)]">
                  This helps us factor in affordability and scholarship options.
                </div>
                <div className="mb-[18px]">
                  <label className="field-label mb-[7px] block text-[13px] font-semibold">
                    What is your budget for university?
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
                        {opt}
                      </OptTile>
                    ))}
                  </div>
                  <ValidationHint show={invalidFields.has("budget")}>
                    Please select your budget range
                  </ValidationHint>
                </div>
                <label className="field-label mb-[7px] block text-[13px] font-semibold">
                  Anything else we should know?{" "}
                  <span className="font-medium text-[var(--text-hint)]">Optional</span>
                </label>
                <textarea
                  rows={3}
                  className="mb-4 w-full resize-none rounded-[10px] border-[1.5px] border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.08)]"
                  placeholder="Scholarships, constraints, dream cities..."
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
                    Find my best matches
                    <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden />
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
