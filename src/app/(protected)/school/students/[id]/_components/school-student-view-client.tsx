"use client";

import { SchoolTasksClient } from "@/app/(protected)/school/tasks/_components/school-tasks-client";
import type { SchoolTaskTableRow } from "@/app/(protected)/school/tasks/_lib/fetch-school-tasks-page";
import {
  updateSchoolStudentCreditLimits,
  addSchoolStudentNote,
} from "@/actions/school-students";
import type { Database } from "@/database.types";
import { SCHOOL_STUDENT_NOTE_TAGS } from "@/lib/school-student-note-tags";
import { format } from "date-fns";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { SchoolStudentDetailPayload } from "../_lib/fetch-school-student-detail";

import { SchoolStudentDocumentsTab } from "./school-student-documents-tab";
import { SchoolStudentEssaysTab } from "./school-student-essays-tab";
import { SchoolStudentInteractionsTab } from "./school-student-interactions-tab";
import { SchoolStudentPanel } from "./school-student-panel";
import { SchoolStudentShortlistTab } from "./school-student-shortlist-tab";

type TabId =
  | "snapshot"
  | "activity"
  | "shortlist"
  | "essays"
  | "docs"
  | "notes"
  | "interactions"
  | "tasks"
  | "history";

const TAB_DEFS: { id: TabId; label: string }[] = [
  { id: "snapshot", label: "Snapshot" },
  { id: "activity", label: "Activity" },
  { id: "shortlist", label: "Shortlist" },
  { id: "essays", label: "Essays" },
  { id: "docs", label: "Documents" },
  { id: "notes", label: "Notes" },
  { id: "interactions", label: "Interactions" },
  { id: "tasks", label: "Tasks" },
  { id: "history", label: "History" },
];

type ApplicationProfileRow =
  Database["public"]["Tables"]["student_application_profile"]["Row"];

export type SchoolStudentViewClientProps = {
  student: SchoolStudentDetailPayload["student"];
  applicationProfile: ApplicationProfileRow | null;
  quickStats: SchoolStudentDetailPayload["quickStats"];
  platformActivity: SchoolStudentDetailPayload["platformActivity"];
  shortlist: SchoolStudentDetailPayload["shortlist"];
  countries: SchoolStudentDetailPayload["countries"];
  studentNotes: SchoolStudentDetailPayload["studentNotes"];
  studentInteractions: SchoolStudentDetailPayload["studentInteractions"];
  documents: SchoolStudentDetailPayload["documents"];
  essays: SchoolStudentDetailPayload["essays"];
  /** From `?tab=tasks` so filter Apply keeps the Tasks tab active after navigation. */
  initialTab?: TabId;
  tasksPanel: {
    rows: SchoolTaskTableRow[];
    totalRows: number;
    page: number;
    limit: number;
    q: string;
    when: string;
    priority: string;
    status: string;
  };
};

function initials(first: string, last: string): string {
  const a = first.trim()[0];
  const b = last.trim()[0];
  const pair = `${a ?? ""}${b ?? ""}`.toUpperCase();
  if (pair) return pair.slice(0, 2);
  if (a) return a.toUpperCase();
  return "?";
}

function joinList(items: string[] | null | undefined): string {
  if (!Array.isArray(items) || items.length === 0) return "—";
  const t = items.map((x) => x.trim()).filter(Boolean);
  return t.length ? t.join(", ") : "—";
}

function snapDisplay(value: string | null | undefined, empty: string): string {
  const t = value?.trim();
  return t ? t : empty;
}

function RiskPill({
  riskClass,
  label,
}: {
  riskClass: "green" | "amber" | "red";
  label: string;
}) {
  const pillCls =
    riskClass === "green"
      ? "bg-[rgba(82,183,135,.13)] text-[#1B4332] [&_.sd-pill-dot]:bg-[var(--green-bright)]"
      : riskClass === "amber"
        ? "bg-[rgba(212,162,42,.14)] text-[#7a5d10] [&_.sd-pill-dot]:bg-[#D4A22A]"
        : "bg-[rgba(231,76,60,.12)] text-[#8c2d22] [&_.sd-pill-dot]:bg-[#E74C3C]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold leading-snug ${pillCls}`}
    >
      <span className="sd-pill-dot h-1.5 w-1.5 rounded-full" />
      {label}
    </span>
  );
}

function SnapItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--border-light)] bg-[#faf9f4] p-3.5">
      <div className="mb-1 text-[11.5px] font-medium uppercase tracking-[0.05em] text-[var(--text-light)]">
        {label}
      </div>
      <div className="text-[13.5px] font-semibold text-[var(--text)]">
        {value}
      </div>
    </div>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="px-5 py-10 text-center text-[13px] text-[var(--text-light)]">
      {message}
    </div>
  );
}

function parseCreditLimitDraft(
  raw: string,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  if (!/^\d+$/.test(trimmed)) {
    return {
      ok: false,
      error: "Use a whole number ≥ 0, or leave blank for school default.",
    };
  }
  const n = Number(trimmed);
  if (!Number.isSafeInteger(n)) {
    return { ok: false, error: "That number is too large." };
  }
  return { ok: true, value: n };
}

function CreditLimitCard({
  kind,
  studentId,
  displayLimit,
  override,
  schoolDefault,
  label,
}: {
  kind: "advisor" | "ambassador";
  studentId: string;
  displayLimit: number | null;
  override: number | null;
  schoolDefault: number | null;
  label: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const placeholder =
    schoolDefault != null
      ? `School default (${schoolDefault})`
      : "School default";

  function openEdit() {
    setDraft(override !== null ? String(override) : "");
    setLocalError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setLocalError(null);
  }

  async function save() {
    const parsed = parseCreditLimitDraft(draft);
    if (!parsed.ok) {
      setLocalError(parsed.error);
      return;
    }

    const patch =
      kind === "advisor"
        ? { advisor_credit_limit: parsed.value }
        : { ambassador_credit_limit: parsed.value };

    setLocalError(null);
    setPending(true);
    try {
      const res = await updateSchoolStudentCreditLimits(studentId, patch);
      const err = res.error;
      if (err != null && err !== "") {
        setLocalError(typeof err === "string" ? err : "Could not save.");
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col justify-between rounded-[10px] border border-[var(--border-light)] bg-white p-3.5">
      {!editing ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-[family-name:var(--font-dm-serif)] text-2xl leading-none text-[var(--text)]">
                {displayLimit ?? "—"}
              </div>
              <div className="mt-1 text-[11.5px] text-[var(--text-light)]">
                {label}
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[var(--text-mid)] hover:border-[var(--text-mid)]"
              aria-label={`Edit ${label}`}
              onClick={openEdit}
            >
              Edit
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="text-[11.5px] font-medium text-[var(--text)]">
            {label}
          </div>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            disabled={pending}
            className="w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2 font-[family-name:var(--font-dm-sans)] text-[13px] text-[var(--text-mid)]"
            aria-invalid={Boolean(localError)}
          />
          <div className="text-[10px] text-[var(--text-hint)]">
            Leave blank to use the school-wide default on this profile.
          </div>
          {localError ? (
            <div className="text-[11.5px] text-[#c0392b]">{localError}</div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => void save()}
              className="inline-flex rounded-lg border border-[var(--green)] bg-[var(--green)] px-2.5 py-1 text-[11.5px] font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={cancel}
              className="inline-flex rounded-lg border border-[var(--border)] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[var(--text-mid)] disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] border border-[var(--border-light)] bg-white p-3.5">
      <div className="font-[family-name:var(--font-dm-serif)] text-2xl leading-none text-[var(--text)]">
        {value}
      </div>
      <div className="mt-1 text-[11.5px] text-[var(--text-light)]">{label}</div>
    </div>
  );
}

function ActivityContent({
  student,
  platformActivity,
}: {
  student: SchoolStudentDetailPayload["student"];
  platformActivity: SchoolStudentDetailPayload["platformActivity"];
}) {
  const who = student.firstName?.trim() || "this student";
  const cells: { label: string; value: number }[] = [
    { label: "Programs viewed", value: platformActivity.programsViewed },
    { label: "Universities saved", value: platformActivity.universitiesSaved },
    { label: "Scholarships saved", value: platformActivity.scholarshipsSaved },
    { label: "AI matches", value: platformActivity.aiMatches },
    { label: "Essays reviewed", value: platformActivity.essaysReviewed },
    { label: "Advisor sessions", value: platformActivity.advisorSessions },
    {
      label: "Ambassador sessions",
      value: platformActivity.ambassadorSessions,
    },
    { label: "Webinars attended", value: platformActivity.webinarsAttended },
  ];

  return (
    <SchoolStudentPanel
      head="Platform activity"
      sub={`What ${who} has done on Univeera (read-only)`}
    >
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {cells.map((c) => (
          <ActivityCell key={c.label} label={c.label} value={c.value} />
        ))}
      </div>
      <div className="mt-3.5 flex flex-col justify-between gap-2 rounded-[10px] bg-[#faf9f4] px-3.5 py-3.5 text-[13px] sm:flex-row sm:items-center">
        <div>
          <span className="text-[var(--text-light)]">Last activity: </span>
          <span className="font-semibold text-[var(--text)]">
            {platformActivity.lastActivityDateLabel ?? "—"}
          </span>
        </div>
        <div className="sm:text-right">
          <span className="text-[var(--text-light)]">Total logins: </span>
          <span className="font-semibold text-[var(--text)]">
            {platformActivity.totalLogins}
          </span>
        </div>
      </div>
    </SchoolStudentPanel>
  );
}

function SnapshotContent({
  applicationProfile,
  quickStats,
  student,
}: {
  applicationProfile: ApplicationProfileRow | null;
  quickStats: SchoolStudentDetailPayload["quickStats"];
  student: SchoolStudentDetailPayload["student"];
}) {
  const preferred = applicationProfile
    ? joinList(applicationProfile.preferred_destinations)
    : "—";
  const programs = applicationProfile
    ? joinList(applicationProfile.interested_programs)
    : "—";
  const budget = snapDisplay(applicationProfile?.budget_range, "-");
  const english = applicationProfile?.english_test_scores?.trim()
    ? applicationProfile.english_test_scores.trim()
    : "Pending";
  const sat = snapDisplay(applicationProfile?.sat_act_scores, "-");
  const curr = snapDisplay(applicationProfile?.curriculum, "-");

  return (
    <>
      <SchoolStudentPanel
        head="Snapshot"
        sub="Quick overview — student profile and key info"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SnapItem label="Preferred destinations" value={preferred} />
          <SnapItem label="Interested programs" value={programs} />
          <SnapItem label="Budget range" value={budget} />
          <SnapItem label="English test" value={english} />
          <SnapItem label="SAT / ACT" value={sat} />
          <SnapItem label="Curriculum" value={curr} />
        </div>
      </SchoolStudentPanel>

      <SchoolStudentPanel head="Quick stats">
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <div className="rounded-[10px] border border-[var(--border-light)] bg-white p-3.5">
            <div className="font-[family-name:var(--font-dm-serif)] text-2xl leading-none text-[var(--text)]">
              {quickStats.universitiesCount}
            </div>
            <div className="mt-1 text-[11.5px] text-[var(--text-light)]">
              Universities
            </div>
          </div>
          <div className="rounded-[10px] border border-[var(--border-light)] bg-white p-3.5">
            <div className="font-[family-name:var(--font-dm-serif)] text-2xl leading-none text-[var(--text)]">
              {quickStats.documentsInCount}
            </div>
            <div className="mt-1 text-[11.5px] text-[var(--text-light)]">
              Documents in
            </div>
          </div>
          <div className="rounded-[10px] border border-[var(--border-light)] bg-white p-3.5">
            <div className="font-[family-name:var(--font-dm-serif)] text-2xl leading-none text-[var(--text)]">
              {quickStats.openTasksCount}
            </div>
            <div className="mt-1 text-[11.5px] text-[var(--text-light)]">
              Open tasks
            </div>
          </div>
          <div className="rounded-[10px] border border-[var(--border-light)] bg-white p-3.5">
            <div className="font-[family-name:var(--font-dm-serif)] text-2xl leading-none text-[var(--text)]">
              {quickStats.supportSessionsCount}
            </div>
            <div className="mt-1 text-[11.5px] text-[var(--text-light)]">
              Support sessions
            </div>
          </div>
        </div>
      </SchoolStudentPanel>

      <SchoolStudentPanel head="Credits">
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col justify-center rounded-[10px] border border-[var(--border-light)] bg-white p-3.5">
              <div className="font-[family-name:var(--font-dm-serif)] text-2xl leading-none text-[var(--text)]">
                {student.advisorCreditsUsedNet}
              </div>
              <div className="mt-1 text-[11.5px] text-[var(--text-light)]">
                Advisor credits used
              </div>
            </div>
            <div className="flex flex-col justify-center rounded-[10px] border border-[var(--border-light)] bg-white p-3.5">
              <div className="font-[family-name:var(--font-dm-serif)] text-2xl leading-none text-[var(--text)]">
                {student.ambassadorCreditsUsedNet}
              </div>
              <div className="mt-1 text-[11.5px] text-[var(--text-light)]">
                Ambassador credits used
              </div>
            </div>
            <div className="flex flex-col justify-center rounded-[10px] border border-[var(--border-light)] bg-white p-3.5 sm:col-span-2 lg:col-span-1">
              <div className="font-[family-name:var(--font-dm-serif)] text-2xl leading-none text-[var(--text)]">
                {student.creditsUsedTotal}
              </div>
              <div className="mt-1 text-[11.5px] text-[var(--text-light)]">
                Total credits used
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <CreditLimitCard
              kind="advisor"
              studentId={student.id}
              displayLimit={student.advisorCreditLimit}
              override={student.advisorCreditLimitOverride}
              schoolDefault={student.schoolDefaultAdvisorCreditLimit}
              label="Advisor credit limit"
            />
            <CreditLimitCard
              kind="ambassador"
              studentId={student.id}
              displayLimit={student.ambassadorCreditLimit}
              override={student.ambassadorCreditLimitOverride}
              schoolDefault={student.schoolDefaultAmbassadorCreditLimit}
              label="Ambassador credit limit"
            />
          </div>
        </div>
      </SchoolStudentPanel>
    </>
  );
}

function NotesTabContent({
  studentId,
  notes,
}: {
  studentId: string;
  notes: SchoolStudentDetailPayload["studentNotes"];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [selectedNoteTag, setSelectedNoteTag] = useState<string>(
    SCHOOL_STUDENT_NOTE_TAGS[0],
  );

  function formatWhen(iso: string): string {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "—";
      return format(d, "MMM d, yyyy");
    } catch {
      return "—";
    }
  }

  async function submit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const res = await addSchoolStudentNote(null, formData);
      const errMsg =
        res.error == null
          ? null
          : typeof res.error === "string"
            ? res.error
            : "Something went wrong.";
      if (errMsg) {
        setError(errMsg);
      } else {
        formRef.current?.reset();
        setSelectedNoteTag(SCHOOL_STUDENT_NOTE_TAGS[0]);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <SchoolStudentPanel
      head="Counselor notes"
      sub="Internal-only — students cannot see these."
    >
      <div className="mb-3.5 flex flex-col gap-2.5 rounded-[10px] border border-[var(--border-light)] bg-[var(--cream)] p-3.5">
        <form ref={formRef} action={submit} className="flex flex-col gap-2.5">
          <input type="hidden" name="student_id" value={studentId} />
          <input type="hidden" name="note_type" value={selectedNoteTag} />
          <textarea
            name="content"
            placeholder="Add internal counselor note... (Cmd+Enter to save)"
            className="min-h-[64px] w-full resize-y rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 font-[family-name:var(--font-dm-sans)] text-[13px] outline-none focus:border-[var(--green-light)]"
            disabled={pending}
            maxLength={8000}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !pending) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-[5px]">
              {SCHOOL_STUDENT_NOTE_TAGS.map((tag) => {
                const active = selectedNoteTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    disabled={pending}
                    onClick={() => setSelectedNoteTag(tag)}
                    className={`cursor-pointer rounded-[14px] border px-[9px] py-1 font-[family-name:var(--font-dm-sans)] text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
                      active
                        ? "border-[var(--green-light)] bg-[var(--green-pale)] text-[var(--green-dark)]"
                        : "border-[var(--border)] bg-white text-[var(--text-mid)]"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border-[1.5px] border-[var(--green)] bg-[var(--green)] px-2.5 py-1.5 font-[family-name:var(--font-dm-sans)] text-[11.5px] font-semibold text-white hover:border-[var(--green-dark)] hover:bg-[var(--green-dark)] disabled:opacity-55"
            >
              {pending ? "Saving…" : "Save note"}
            </button>
          </div>
          {error ? (
            <div className="text-[12.5px] font-medium text-[#8c2d22]">
              {error}
            </div>
          ) : null}
        </form>
      </div>

      {notes.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-[var(--text-light)]">
          No notes yet — add the first one above
        </div>
      ) : (
        <div className="flex flex-col">
          {notes.map((n) => (
            <div
              key={n.id}
              className="mb-2 rounded-[10px] border border-[var(--border-light)] bg-white p-3.5 last:mb-0"
            >
              <div className="mb-2 flex items-center justify-between gap-2.5">
                <div className="min-w-0 font-[family-name:var(--font-dm-sans)] text-[12px] text-[var(--text-mid)]">
                  <strong className="font-semibold text-[var(--text)]">
                    {n.authorLabel}
                  </strong>
                  {" · "}
                  <span className="inline-flex items-center gap-1 rounded-[20px] border border-[var(--border)] bg-transparent px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap text-[var(--text-mid)] leading-snug">
                    {n.noteType}
                  </span>
                </div>
                <div className="shrink-0 font-[family-name:var(--font-dm-sans)] text-[11.5px] text-[var(--text-hint)]">
                  {formatWhen(n.createdAt)}
                </div>
              </div>
              <div className="font-[family-name:var(--font-dm-sans)] text-[13px] leading-[1.55] text-[var(--text)] whitespace-pre-wrap">
                {n.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </SchoolStudentPanel>
  );
}

type EmptyTabId = Exclude<
  TabId,
  | "snapshot"
  | "activity"
  | "shortlist"
  | "notes"
  | "docs"
  | "tasks"
  | "interactions"
  | "essays"
>;

const EMPTY_TAB: Record<
  EmptyTabId,
  { title: string; subtitle?: string; message: string }
> = {
  history: {
    title: "Meetings & support history",
    subtitle: "Sessions booked, attended, and reviews — coming soon.",
    message: "Content coming soon.",
  },
};

export function SchoolStudentViewClient({
  student,
  applicationProfile,
  quickStats,
  platformActivity,
  shortlist,
  countries,
  studentNotes,
  studentInteractions,
  documents,
  essays,
  initialTab = "snapshot",
  tasksPanel,
}: SchoolStudentViewClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>(initialTab);
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  useEffect(() => {
    if (tab !== "tasks") setNewTaskOpen(false);
  }, [tab]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    if (tab === "tasks") {
      if (next.get("tab") === "tasks") return;
      next.set("tab", "tasks");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    } else {
      if (next.get("tab") !== "tasks") return;
      next.delete("tab");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  }, [tab, pathname, router, searchParams]);

  const ini = useMemo(
    () => initials(student.firstName, student.lastName),
    [student.firstName, student.lastName],
  );

  const fullName = [student.firstName, student.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const sidebarRows: { lab: string; val: string; valSmall?: boolean }[] = [
    { lab: "Grade", val: student.gradeDisplay ?? "—" },
    { lab: "Nationality", val: student.nationalityName ?? "—" },
    { lab: "Curriculum", val: student.curriculumDisplay ?? "—" },
    { lab: "Target intake", val: student.targetIntakeDisplay ?? "—" },
    { lab: "Counselor", val: student.counselorLabel },
    { lab: "Profile", val: `${student.profilePercent}%` },
    {
      lab: "Stage",
      val: student.stageLabel,
      valSmall: true,
    },
    { lab: "Last active", val: student.lastActiveLabel },
  ];

  let tabBody: ReactNode;
  if (tab === "snapshot") {
    tabBody = (
      <SnapshotContent
        applicationProfile={applicationProfile}
        quickStats={quickStats}
        student={student}
      />
    );
  } else if (tab === "activity") {
    tabBody = (
      <ActivityContent student={student} platformActivity={platformActivity} />
    );
  } else if (tab === "shortlist") {
    tabBody = (
      <SchoolStudentShortlistTab
        studentId={student.id}
        initialShortlist={shortlist}
        countries={countries}
      />
    );
  } else if (tab === "essays") {
    tabBody = (
      <SchoolStudentEssaysTab
        studentId={student.id}
        initialEssays={essays}
        shortlist={shortlist}
      />
    );
  } else if (tab === "notes") {
    tabBody = <NotesTabContent studentId={student.id} notes={studentNotes} />;
  } else if (tab === "interactions") {
    tabBody = (
      <SchoolStudentInteractionsTab
        studentId={student.id}
        interactions={studentInteractions}
      />
    );
  } else if (tab === "docs") {
    tabBody = (
      <SchoolStudentDocumentsTab
        studentId={student.id}
        initialDocuments={documents}
      />
    );
  } else if (tab === "tasks") {
    tabBody = (
      <SchoolTasksClient
        variant="studentProfile"
        scopedStudentId={student.id}
        rows={tasksPanel.rows}
        totalRows={tasksPanel.totalRows}
        page={tasksPanel.page}
        limit={tasksPanel.limit}
        q={tasksPanel.q}
        when={tasksPanel.when}
        priority={tasksPanel.priority}
        status={tasksPanel.status}
        studentOptions={[]}
        newTaskModal={{ open: newTaskOpen, onOpenChange: setNewTaskOpen }}
      />
    );
  } else {
    const cfg = EMPTY_TAB[tab];
    tabBody = (
      <SchoolStudentPanel head={cfg.title} sub={cfg.subtitle}>
        <EmptyBlock message={cfg.message} />
      </SchoolStudentPanel>
    );
  }

  return (
    <div className="w-full">
      <Link
        href="/school/students"
        className="sd-back mb-3.5 inline-flex cursor-pointer items-center gap-1.5 py-1.5 text-[12.5px] font-medium text-[var(--text-mid)] hover:text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to all students
      </Link>

      <div className="sd-grid grid grid-cols-1 items-start gap-5 xl:grid-cols-[280px_1fr] xl:gap-5">
        <aside className="sd-side flex flex-col gap-3.5 rounded-[14px] border border-[var(--border-light)] bg-white p-[22px] xl:sticky xl:top-[80px]">
          <div className="sd-side-top flex flex-col items-center gap-2.5 border-b border-[var(--border-light)] pb-[18px] text-center">
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] font-[family-name:var(--font-dm-serif)] text-2xl font-bold text-[var(--green-dark)]">
              {ini}
            </div>
            <div className="font-[family-name:var(--font-dm-serif)] text-xl leading-snug text-[var(--text)]">
              {fullName || "Student"}
            </div>
            <div className="break-all text-xs text-[var(--text-light)]">
              {student.email || "—"}
            </div>
            <RiskPill riskClass={student.riskClass} label={student.riskLabel} />
          </div>

          {sidebarRows.map((r) => (
            <div
              key={r.lab}
              className="flex justify-between gap-2 py-1 text-[12.5px]"
            >
              <span className="shrink-0 text-[var(--text-light)]">{r.lab}</span>
              <span
                className={`max-w-[60%] text-right font-medium text-[var(--text)] ${r.valSmall ? "text-[11.5px] leading-snug" : ""}`}
              >
                {r.val}
              </span>
            </div>
          ))}

          <div className="mt-2 flex flex-col gap-1.5">
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-[var(--green)] bg-[var(--green)] px-2.5 py-1 text-[11.5px] font-semibold text-white opacity-55"
              title="Coming soon"
            >
              Email student
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("tasks");
                setNewTaskOpen(true);
              }}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-[var(--border)] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]"
            >
              + Add task
            </button>
          </div>
        </aside>

        <div className="sd-main flex flex-col gap-[18px]">
          <div className="sd-tabs flex gap-0.5 overflow-x-auto rounded-[10px] border border-[var(--border-light)] bg-white p-1">
            {TAB_DEFS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 rounded-[7px] px-3.5 py-2 font-[family-name:var(--font-dm-sans)] text-[12.5px] font-medium whitespace-nowrap transition-colors ${
                    active
                      ? "bg-[var(--green)] text-white"
                      : "border-0 bg-transparent text-[var(--text-light)] hover:text-[var(--text)]"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div id="sd-tab-content">{tabBody}</div>
        </div>
      </div>
    </div>
  );
}
