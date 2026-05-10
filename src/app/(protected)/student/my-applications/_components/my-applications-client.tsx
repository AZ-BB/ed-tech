"use client";

import type { Database } from "@/database.types";
import { createSupabaseBrowserClient } from "@/utils/supabase-browser";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";

import type { MyApplicationsInitialPayload } from "../_lib/my-applications-types";
import {
  AID_OPTIONS,
  APPLICATION_METHOD_OPTIONS,
  BUDGET_OPTIONS,
  CURRICULUM_OPTIONS,
  ESSAY_TYPE_OPTIONS,
  GRADE_OPTIONS,
  SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY,
  TARGET_INTAKE_OPTIONS,
  UNIVERSITY_APPLICATION_STATUSES,
  UNIVERSITY_DECISIONS,
} from "../_lib/my-applications-defaults";

type ShortlistRow =
  Database["public"]["Tables"]["student_shortlist_universities"]["Row"];
type DocRow =
  Database["public"]["Tables"]["student_my_application_documents"]["Row"];
type EssayRow =
  Database["public"]["Tables"]["student_my_application_essays"]["Row"];
type RecRow =
  Database["public"]["Tables"]["student_my_application_recommendations"]["Row"];
type TaskRow =
  Database["public"]["Tables"]["student_my_application_tasks"]["Row"];

type TabId =
  | "profile"
  | "universities"
  | "documents"
  | "essays"
  | "recommendations"
  | "tasks";

const STATUS_LABEL: Record<string, string> = {
  considering: "Considering",
  shortlisted: "Shortlisted",
  preparing_application: "Preparing application",
  submitted: "Submitted",
  interview_invited: "Interview invited",
  withdrawn: "Withdrawn",
};

const DECISION_LABEL: Record<string, string> = {
  "": "—",
  pending: "Pending",
  offer_received: "Offer received",
  conditional_offer: "Conditional offer",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
  accepted: "Accepted",
  declined_by_me: "Declined by me",
};

const ESSAY_STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  drafting: "Drafting",
  in_review: "In review",
  complete: "Complete",
};

const REC_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  drafting: "Drafting",
  submitted: "Submitted",
};

function methodPillLabel(applicationMethod: string | null): string {
  if (!applicationMethod) return "—";
  const i = applicationMethod.indexOf(" — ");
  return i === -1 ? applicationMethod : applicationMethod.slice(0, i);
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** e.g. Feb 12, or Feb 12, 2025 if not current year */
function formatShortMonthDay(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const nowY = new Date().getFullYear();
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      ...(y !== nowY ? { year: "numeric" as const } : {}),
    });
  } catch {
    return iso;
  }
}

function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isTaskDueOverdue(dueDate: string | null, completed: boolean) {
  if (completed || !dueDate) return false;
  const today = ymdLocal(new Date());
  return dueDate.slice(0, 10) < today;
}

function isTaskDueThisWeek(dueDate: string | null, completed: boolean) {
  if (completed || !dueDate) return false;
  const due = dueDate.slice(0, 10);
  const t = new Date();
  const start = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const dueD = new Date(due + "T12:00:00");
  return dueD >= start && dueD <= end;
}

function formatRelativeTime(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    const t = new Date(iso).getTime();
    const diffMs = Date.now() - t;
    const days = Math.floor(diffMs / 86400000);
    if (days < 0) return formatShortMonthDay(iso);
    if (days === 0) {
      const hours = Math.floor(diffMs / 3600000);
      if (hours < 1) return "just now";
      if (hours === 1) return "1 hour ago";
      return `${hours} hours ago`;
    }
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    return formatShortMonthDay(iso);
  } catch {
    return formatShortMonthDay(iso);
  }
}

function CalloutInfo({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3.5 flex gap-3 rounded-[10px] border border-[var(--green-bg)] bg-[var(--green-pale)] px-3.5 py-3.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--green)] text-white">
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <p className="text-[12.5px] leading-relaxed text-[var(--green-dark)]">
        {children}
      </p>
    </div>
  );
}

function StatusPill({
  variant,
  label,
}: {
  variant: "green" | "amber" | "red" | "blue" | "grey";
  label: string;
}) {
  const wrap =
    variant === "green"
      ? "bg-[rgba(82,183,135,0.13)] text-[#1B4332]"
      : variant === "amber"
        ? "bg-[rgba(212,162,42,0.14)] text-[#7a5d10]"
        : variant === "red"
          ? "bg-[rgba(231,76,60,0.12)] text-[#8c2d22]"
          : variant === "blue"
            ? "bg-[rgba(52,152,219,0.12)] text-[#1d4d70]"
            : "bg-[#ECEAE5] text-[var(--text-mid)]";
  const dot =
    variant === "green"
      ? "bg-[var(--green-bright)]"
      : variant === "amber"
        ? "bg-[#D4A22A]"
        : variant === "red"
          ? "bg-[var(--red)]"
          : variant === "blue"
            ? "bg-[#3498DB]"
            : "bg-[#a0a0a0]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold leading-snug ${wrap}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`}
        aria-hidden
      />
      {label}
    </span>
  );
}

function btnSmClass(primary?: boolean) {
  return primary
    ? "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--green)] bg-[var(--green)] px-2.5 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[var(--green-dark)]"
    : "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]";
}

function profileCompletionPct(args: {
  grade: string;
  curriculum: string;
  destinations: string[];
  programs: string[];
  english: string;
  sat: string;
}): { pct: number; missing: number } {
  let ok = 0;
  const total = 6;
  if (args.grade.trim()) ok++;
  if (args.curriculum.trim()) ok++;
  if (args.destinations.length) ok++;
  if (args.programs.length) ok++;
  if (args.english.trim() || args.sat.trim()) ok++;
  if (args.english.trim() && args.sat.trim()) ok++;
  else if (args.english.trim() || args.sat.trim()) ok += 0.5;
  const pct = Math.round((ok / total) * 100);
  const missing = total - Math.ceil(ok);
  return { pct: Math.min(100, pct), missing: Math.max(0, missing) };
}

export function MyApplicationsClient({
  initial,
}: {
  initial: MyApplicationsInitialPayload;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [tab, setTab] = useState<TabId>("profile");
  const [toast, setToast] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(initial.profile.first_name);
  const [lastName, setLastName] = useState(initial.profile.last_name);
  const [nationalityCode, setNationalityCode] = useState(
    initial.profile.nationality_country_code,
  );

  const ap0 = initial.applicationProfile;
  const [grade, setGrade] = useState(ap0?.grade ?? "");
  const [curriculum, setCurriculum] = useState(ap0?.curriculum ?? "");
  const [targetIntake, setTargetIntake] = useState(ap0?.target_intake ?? "");
  const [destinations, setDestinations] = useState<string[]>(
    ap0?.preferred_destinations ?? [],
  );
  const [programs, setPrograms] = useState<string[]>(
    ap0?.interested_programs ?? [],
  );
  const [budgetRange, setBudgetRange] = useState(ap0?.budget_range ?? "");
  const [needAid, setNeedAid] = useState(ap0?.need_based_aid ?? "");
  const [englishScores, setEnglishScores] = useState(
    ap0?.english_test_scores ?? "",
  );
  const [satAct, setSatAct] = useState(ap0?.sat_act_scores ?? "");
  const [predictedGrades, setPredictedGrades] = useState(
    ap0?.predicted_grades ?? "",
  );
  const [predictedSchool, setPredictedSchool] = useState(
    ap0?.predicted_grades_set_by_school ?? false,
  );
  const [otherTests, setOtherTests] = useState(ap0?.other_tests ?? "");

  const [shortlist, setShortlist] = useState<ShortlistRow[]>(initial.shortlist);
  const [documents, setDocuments] = useState<DocRow[]>(initial.documents);
  const [essays, setEssays] = useState<EssayRow[]>(initial.essays);
  const [recs, setRecs] = useState<RecRow[]>(initial.recommendations);
  const [tasks, setTasks] = useState<TaskRow[]>(initial.tasks);

  const [uniModal, setUniModal] = useState(false);
  const [essayModal, setEssayModal] = useState(false);
  const [recModal, setRecModal] = useState(false);

  const [uniForm, setUniForm] = useState({
    university_name: "",
    country: "",
    major_program: "",
    application_method: "",
    application_deadline: "",
  });
  const [essayForm, setEssayForm] = useState({
    title: "",
    essay_type: ESSAY_TYPE_OPTIONS[0] as string,
    for_application: "",
    limit_note: "",
    requirement_note: "",
  });
  const [recForm, setRecForm] = useState({
    teacher_name: "",
    teacher_subject: "",
    teacher_email: "",
    for_application: "",
    personal_note: "",
    needed_by: "",
  });

  const [essayOpenId, setEssayOpenId] = useState<string | null>(null);
  const [essayDraft, setEssayDraft] = useState("");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const { pct, missing } = profileCompletionPct({
    grade,
    curriculum,
    destinations,
    programs,
    english: englishScores,
    sat: satAct,
  });

  const openTasks = tasks.filter((t) => !t.completed).length;
  const tasksDueThisWeek = useMemo(
    () =>
      tasks.filter((t) => isTaskDueThisWeek(t.due_date, t.completed)).length,
    [tasks],
  );
  const counselorDisplayName = useMemo(() => {
    const named = tasks
      .map((t) => t.assigned_by_name)
      .find((n) => n && n.trim());
    return named?.trim() ?? null;
  }, [tasks]);
  const shortlistHintUniversities = useMemo(
    () =>
      shortlist.filter((u) => {
        const name = u.university_name.trim().toLowerCase();
        if (!name) return false;
        return !essays.some((e) =>
          (e.for_application ?? "").toLowerCase().includes(name),
        );
      }),
    [shortlist, essays],
  );

  const buildApplicationProfileRow = useCallback(() => {
    return {
      student_id: initial.studentId,
      grade: grade || null,
      curriculum: curriculum || null,
      target_intake: targetIntake || null,
      preferred_destinations: destinations,
      interested_programs: programs,
      budget_range: budgetRange || null,
      need_based_aid: needAid || null,
      english_test_scores: englishScores || null,
      sat_act_scores: satAct || null,
      predicted_grades: predictedGrades || null,
      predicted_grades_set_by_school: predictedSchool,
      other_tests: otherTests || null,
      updated_at: new Date().toISOString(),
    };
  }, [
    initial.studentId,
    grade,
    curriculum,
    targetIntake,
    destinations,
    programs,
    budgetRange,
    needAid,
    englishScores,
    satAct,
    predictedGrades,
    predictedSchool,
    otherTests,
  ]);

  const saveAbout = async () => {
    const { error: e1 } = await supabase
      .from("student_profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        nationality_country_code: nationalityCode,
      })
      .eq("id", initial.studentId);
    if (e1) {
      showToast(e1.message);
      return;
    }
    const { error: e2 } = await supabase
      .from("student_application_profile")
      .upsert(buildApplicationProfileRow(), {
        onConflict: "student_id",
      });
    if (e2) {
      showToast(e2.message);
      return;
    }
    showToast("Saved · counselor will see updates");
  };

  const saveGoals = async () => {
    const { error } = await supabase
      .from("student_application_profile")
      .upsert(buildApplicationProfileRow(), {
        onConflict: "student_id",
      });
    if (error) {
      showToast(error.message);
      return;
    }
    showToast("Saved");
  };

  const saveScores = async () => {
    const { error } = await supabase
      .from("student_application_profile")
      .upsert(buildApplicationProfileRow(), {
        onConflict: "student_id",
      });
    if (error) {
      showToast(error.message);
      return;
    }
    showToast("Saved");
  };

  const addUniversity = async () => {
    if (
      !uniForm.university_name.trim() ||
      !uniForm.country ||
      !uniForm.major_program.trim() ||
      !uniForm.application_method
    ) {
      showToast("Fill in all fields first");
      return;
    }
    const nextSort = shortlist.length
      ? Math.max(...shortlist.map((r) => r.sort_order)) + 1
      : 0;
    const insert = {
      student_id: initial.studentId,
      university_name: uniForm.university_name.trim(),
      country: uniForm.country,
      major_program: uniForm.major_program.trim(),
      application_method: uniForm.application_method,
      application_deadline: uniForm.application_deadline || null,
      status: "considering",
      decision: "",
      sort_order: nextSort,
    };
    const { data, error } = await supabase
      .from("student_shortlist_universities")
      .insert(insert)
      .select("*")
      .single();
    if (error || !data) {
      showToast(error?.message ?? "Could not add");
      return;
    }
    setShortlist((prev) => [data, ...prev]);
    setUniModal(false);
    setUniForm({
      university_name: "",
      country: "",
      major_program: "",
      application_method: "",
      application_deadline: "",
    });
    showToast(`${data.university_name} added · counselor will see this`);
  };

  const updateShortlistRow = async (
    id: string,
    patch: Partial<ShortlistRow>,
  ) => {
    const { error } = await supabase
      .from("student_shortlist_universities")
      .update(patch)
      .eq("id", id);
    if (error) showToast(error.message);
  };

  const removeUniversity = async (id: string) => {
    if (!confirm("Remove from shortlist?")) return;
    const { error } = await supabase
      .from("student_shortlist_universities")
      .delete()
      .eq("id", id);
    if (error) {
      showToast(error.message);
      return;
    }
    setShortlist((prev) => prev.filter((r) => r.id !== id));
  };

  const uploadDocument = async (doc: DocRow, file: File) => {
    if (doc.slot_key === SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY) {
      showToast("Your school enters this — it is read-only for you.");
      return;
    }
    const safeName = file.name.replace(/[^\w.\-()+ ]/g, "_");
    const path = `${initial.studentId}/${doc.slot_key}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("student-my-applications")
      .upload(path, file, {
        upsert: true,
      });
    if (upErr) {
      showToast(upErr.message);
      return;
    }
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("student_my_application_documents")
      .update({
        storage_path: path,
        file_name: file.name,
        status: "submitted",
        uploaded_at: now,
        updated_at: now,
      })
      .eq("id", doc.id)
      .select("*")
      .single();
    if (error || !data) {
      showToast(error?.message ?? "Update failed");
      return;
    }
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? data : d)));
    showToast(`${doc.display_name} uploaded`);
  };

  const addEssay = async () => {
    if (!essayForm.title.trim() || !essayForm.for_application.trim()) {
      showToast("Title and application are required");
      return;
    }
    const { data, error } = await supabase
      .from("student_my_application_essays")
      .insert({
        student_id: initial.studentId,
        title: essayForm.title.trim(),
        essay_type: essayForm.essay_type,
        for_application: essayForm.for_application.trim(),
        limit_note: essayForm.limit_note.trim() || null,
        requirement_note: essayForm.requirement_note.trim() || null,
        status: "not_started",
        body: "",
        version: 1,
      })
      .select("*")
      .single();
    if (error || !data) {
      showToast(error?.message ?? "Could not create");
      return;
    }
    setEssays((prev) => [data, ...prev]);
    setEssayModal(false);
    setEssayForm({
      title: "",
      essay_type: ESSAY_TYPE_OPTIONS[0] as string,
      for_application: "",
      limit_note: "",
      requirement_note: "",
    });
    showToast("Essay created");
  };

  const saveEssayDraft = async (essayId: string) => {
    const essay = essays.find((x) => x.id === essayId);
    if (!essay) return;
    const trimmed = essayDraft;
    const now = new Date().toISOString();
    const nextStatus =
      essay.status === "not_started" && trimmed.trim().length > 0
        ? "drafting"
        : essay.status === "not_started"
          ? "not_started"
          : essay.status;
    const nextVersion =
      trimmed !== essay.body
        ? essay.body.trim().length > 0
          ? essay.version + 1
          : essay.version
        : essay.version;
    const { data, error } = await supabase
      .from("student_my_application_essays")
      .update({
        body: trimmed,
        last_edited_at: now,
        updated_at: now,
        status: nextStatus,
        version: nextVersion,
      })
      .eq("id", essayId)
      .select("*")
      .single();
    if (error || !data) {
      showToast(error?.message ?? "Could not save");
      return;
    }
    setEssays((prev) => prev.map((x) => (x.id === essayId ? data : x)));
    setEssayOpenId(null);
    showToast("Essay saved");
  };

  const sendRecRequest = async () => {
    if (
      !recForm.teacher_name.trim() ||
      !recForm.teacher_email.trim() ||
      !recForm.for_application.trim()
    ) {
      showToast("Teacher name, email, and application are required");
      return;
    }
    if (!recForm.needed_by) {
      showToast("Pick a deadline first");
      return;
    }
    const { data, error } = await supabase
      .from("student_my_application_recommendations")
      .insert({
        student_id: initial.studentId,
        teacher_name: recForm.teacher_name.trim(),
        teacher_subject: recForm.teacher_subject.trim() || null,
        teacher_email: recForm.teacher_email.trim().toLowerCase(),
        for_application: recForm.for_application.trim(),
        personal_note: recForm.personal_note.trim() || null,
        needed_by: recForm.needed_by,
        status: "pending",
      })
      .select("*")
      .single();
    if (error || !data) {
      showToast(error?.message ?? "Could not send");
      return;
    }
    setRecs((prev) => [data, ...prev]);
    setRecModal(false);
    setRecForm({
      teacher_name: "",
      teacher_subject: "",
      teacher_email: "",
      for_application: "",
      personal_note: "",
      needed_by: "",
    });
    showToast(`Request recorded for ${data.teacher_name}`);
  };

  const toggleTask = async (t: TaskRow) => {
    const next = !t.completed;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("student_my_application_tasks")
      .update({
        completed: next,
        completed_at: next ? now : null,
        updated_at: now,
      })
      .eq("id", t.id)
      .select("*")
      .single();
    if (error || !data) {
      showToast(error?.message ?? "Update failed");
      return;
    }
    setTasks((prev) => prev.map((x) => (x.id === t.id ? data : x)));
  };

  const fieldClass =
    "rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 text-[13px] text-[var(--text)] outline-none focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.07)]";
  const labelClass =
    "text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-mid)]";
  const panelClass =
    "mb-3.5 overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white";
  const panelHeadClass =
    "flex items-center justify-between gap-2.5 border-b border-[var(--border-light)] px-5 py-4";
  const panelBodyClass = "px-5 py-[18px]";

  const missingDocs = documents.filter((d) => d.status === "missing").length;

  const universitiesTabCount = useMemo(
    () => shortlist.length + initial.activityShortlistedUniversities.length,
    [shortlist.length, initial.activityShortlistedUniversities.length],
  );

  return (
    <div className="mx-auto pb-14 text-[var(--text)]">
      <div className="mb-[18px] px-4">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--green)]">
          Your application workspace
        </div>
        <h1 className="font-[family-name:var(--font-dm-serif)] font-bold text-[28px] leading-tight tracking-tight text-[var(--text)] sm:text-[30px]">
          Keep your school in the loop
        </h1>
        <p className="mt-1.5 max-w-[680px] text-sm leading-relaxed text-[var(--text-mid)]">
          Update your profile, shortlist, documents, and application status
          here. Your school counselor sees this in real time and can flag
          anything that needs attention before deadlines.
        </p>
      </div>

      <div className="relative mb-[18px] flex flex-col gap-3 overflow-hidden rounded-[14px] bg-gradient-to-br from-[var(--green-dark)] to-[var(--green)] px-5 py-5 text-white sm:flex-row sm:items-center sm:gap-[18px]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative z-[1] min-w-0 flex-1">
          <div className="font-[family-name:var(--font-dm-serif)] text-lg leading-snug">
            Your profile is {pct}% complete
          </div>
          <div className="mt-1 text-[12.5px] text-white/70">
            {missing > 0
              ? `${missing} section${missing === 1 ? "" : "s"} could use more detail.`
              : "Great work — your counselor has a solid picture."}
          </div>
        </div>
        <div className="relative z-[1] flex flex-col items-start gap-1.5 sm:items-end">
          <div className="font-[family-name:var(--font-dm-serif)] text-3xl leading-none">
            {pct}%
          </div>
          <div className="h-1.5 w-[140px] max-w-full rounded bg-white/15">
            <div
              className="h-full rounded bg-[var(--green-bright)] transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mb-4 flex gap-0.5 overflow-x-auto rounded-[10px] border border-[var(--border-light)] bg-white p-1">
        {(
          [
            ["profile", "Profile", null],
            ["universities", "Universities", universitiesTabCount],
            ["documents", "Documents", missingDocs > 0 ? missingDocs : null],
            ["essays", "Essays", null],
            ["recommendations", "Recommendations", null],
            ["tasks", "Tasks", openTasks > 0 ? openTasks : null],
          ] as const
        ).map(([id, label, badge]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-[7px] px-3.5 py-2 text-[12.5px] font-medium whitespace-nowrap transition-colors ${
              tab === id
                ? "bg-[var(--green)] text-white"
                : "text-[var(--text-light)] hover:text-[var(--text)]"
            }`}
          >
            {label}
            {badge != null && badge > 0 ? (
              <span
                className={`rounded-lg px-1.5 py-0.5 text-[10px] font-bold ${
                  tab === id
                    ? "bg-white/25 text-white"
                    : "bg-[#FCEBEB] text-[#8c2d22]"
                }`}
              >
                {badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <div className="animate-[my-apps-fade-in_0.2s_ease]">
          <div className="mb-3.5 flex gap-3 rounded-[10px] border border-[var(--green-bg)] bg-[var(--green-pale)] px-3.5 py-3.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--green)] text-white">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <p className="text-[12.5px] leading-relaxed text-[var(--green-dark)]">
              <strong>Why this matters:</strong> The information you fill in
              here is what your counselor sees on their dashboard. Better info →
              better guidance.
            </p>
          </div>

          <div className={panelClass}>
            <div className={panelHeadClass}>
              <div>
                <div className="text-[15px] font-semibold tracking-tight">
                  About you
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  Basic info — most of this came from your school registration
                </div>
              </div>
            </div>
            <div className={panelBodyClass}>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>First name</label>
                  <input
                    className={fieldClass}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Last name</label>
                  <input
                    className={fieldClass}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>School email</label>
                  <input
                    className={`${fieldClass} bg-[var(--cream)] text-[var(--text-light)]`}
                    value={initial.profile.email}
                    disabled
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Grade</label>
                  <select
                    className={fieldClass}
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelClass}>Curriculum</label>
                  <select
                    className={fieldClass}
                    value={curriculum}
                    onChange={(e) => setCurriculum(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {CURRICULUM_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelClass}>Nationality</label>
                  <select
                    className={fieldClass}
                    value={nationalityCode}
                    onChange={(e) => setNationalityCode(e.target.value)}
                  >
                    {initial.countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelClass}>Target intake</label>
                  <select
                    className={fieldClass}
                    value={targetIntake}
                    onChange={(e) => setTargetIntake(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {TARGET_INTAKE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3.5 flex justify-end border-t border-[var(--border-light)] pt-3.5">
                <button
                  type="button"
                  className="rounded-lg border border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[13px] font-semibold text-white hover:border-[var(--green-dark)] hover:bg-[var(--green-dark)]"
                  onClick={() => void saveAbout()}
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>

          <div className={panelClass}>
            <div className={panelHeadClass}>
              <div>
                <div className="text-[15px] font-semibold tracking-tight">
                  Your goals
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  Where you want to study, what you want to study, and your
                  budget
                </div>
              </div>
            </div>
            <div className={panelBodyClass}>
              <TagField
                label="Preferred destinations"
                hint="Type a country and press Enter to add"
                values={destinations}
                onChange={setDestinations}
                placeholder="Add a country…"
              />
              <div className="mt-3.5">
                <TagField
                  label="Interested programs / majors"
                  values={programs}
                  onChange={setPrograms}
                  placeholder="Add a program…"
                />
              </div>
              <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Budget range (annual)</label>
                  <select
                    className={fieldClass}
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {BUDGET_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Need-based financial aid</label>
                  <select
                    className={fieldClass}
                    value={needAid}
                    onChange={(e) => setNeedAid(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {AID_OPTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3.5 flex justify-end border-t border-[var(--border-light)] pt-3.5">
                <button
                  type="button"
                  className="rounded-lg border border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[13px] font-semibold text-white hover:border-[var(--green-dark)] hover:bg-[var(--green-dark)]"
                  onClick={() => void saveGoals()}
                >
                  Save goals
                </button>
              </div>
            </div>
          </div>

          <div className={panelClass}>
            <div className={panelHeadClass}>
              <div>
                <div className="text-[15px] font-semibold tracking-tight">
                  Test scores
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  Add your test scores as you take them — your counselor will
                  use these for matching
                </div>
              </div>
            </div>
            <div className={panelBodyClass}>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>IELTS / TOEFL</label>
                  <input
                    className={fieldClass}
                    placeholder="e.g. IELTS 7.5 or TOEFL 102"
                    value={englishScores}
                    onChange={(e) => setEnglishScores(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>SAT / ACT</label>
                  <input
                    className={fieldClass}
                    placeholder="e.g. SAT 1450"
                    value={satAct}
                    onChange={(e) => setSatAct(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelClass}>
                    Predicted IB / A-Level grades
                  </label>
                  <input
                    className={`${fieldClass} ${predictedSchool ? "bg-[var(--cream)] text-[var(--text-light)]" : ""}`}
                    value={predictedGrades}
                    onChange={(e) => setPredictedGrades(e.target.value)}
                    disabled={predictedSchool}
                  />
                  <div className="flex items-center gap-2 text-[11.5px] text-[var(--text-hint)]">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={predictedSchool}
                        onChange={(e) => setPredictedSchool(e.target.checked)}
                        className="rounded border-[var(--border)]"
                      />
                      Mark as set by school (student read-only)
                    </label>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelClass}>
                    Other tests (AP, BMAT, LNAT…)
                  </label>
                  <input
                    className={fieldClass}
                    placeholder="e.g. AP Calc BC: 5, AP Physics: 4"
                    value={otherTests}
                    onChange={(e) => setOtherTests(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-3.5 flex justify-end border-t border-[var(--border-light)] pt-3.5">
                <button
                  type="button"
                  className="rounded-lg border border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[13px] font-semibold text-white hover:border-[var(--green-dark)] hover:bg-[var(--green-dark)]"
                  onClick={() => void saveScores()}
                >
                  Save scores
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "universities" ? (
        <div className="animate-[my-apps-fade-in_0.2s_ease]">
          <div className="mb-3.5 flex gap-3 rounded-[10px] border border-[var(--green-bg)] bg-[var(--green-pale)] px-3.5 py-3.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--green)] text-white">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <p className="text-[12.5px] leading-relaxed text-[var(--green-dark)]">
              Universities you shortlist in <strong>University Search</strong>{" "}
              appear below. Use <strong>Your application shortlist</strong> to
              track status and decisions for every school — including ones you
              add manually.
            </p>
          </div>

          {initial.activityShortlistedUniversities.length > 0 ? (
            <div className={panelClass}>
              <div className={panelHeadClass}>
                <div>
                  <div className="text-[15px] font-semibold tracking-tight">
                    From University Search{" "}
                    <span className="font-normal text-[var(--text-light)]">
                      ({initial.activityShortlistedUniversities.length})
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--text-light)]">
                    Pulled from your shortlist in the catalog (student
                    activities)
                  </div>
                </div>
              </div>
              <div className={`${panelBodyClass} space-y-2`}>
                {initial.activityShortlistedUniversities.map((u) => (
                  <div
                    key={u.uniId}
                    className="flex flex-col gap-2 rounded-[10px] border border-[var(--border-light)] bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-[#E6F1FB] text-[#185FA5]">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden
                        >
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13.5px] font-semibold">
                            {u.name}
                          </span>
                          <span className="rounded-full bg-[var(--green-pale)] px-2 py-0.5 text-[10px] font-semibold text-[var(--green-dark)]">
                            Catalog
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11.5px] text-[var(--text-light)]">
                          {[u.countryName ?? u.countryCode, u.city]
                            .filter(Boolean)
                            .join(" · ")}
                          {u.method ? (
                            <>
                              {" "}
                              ·{" "}
                              <span className="rounded-full bg-[var(--green-pale)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--green-dark)]">
                                {methodPillLabel(u.method)}
                              </span>
                            </>
                          ) : null}
                          {u.deadlineDate ? (
                            <> · Deadline {formatDate(u.deadlineDate)}</>
                          ) : null}
                          {u.createdAt ? (
                            <> · Shortlisted {formatDate(u.createdAt)}</>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/student/universities/${u.uniId}`}
                      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]"
                    >
                      View in catalog
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className={panelClass}>
            <div className={panelHeadClass}>
              <div>
                <div className="text-[15px] font-semibold tracking-tight">
                  Your application shortlist{" "}
                  <span className="font-normal text-[var(--text-light)]">
                    ({shortlist.length})
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  Track status and decisions — add schools not in the catalog
                  here
                </div>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--green)] bg-[var(--green)] px-2.5 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[var(--green-dark)]"
                onClick={() => setUniModal(true)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add university
              </button>
            </div>
            <div className={`${panelBodyClass} space-y-2`}>
              {shortlist.length === 0 ? (
                <p className="text-sm text-[var(--text-mid)]">
                  {initial.activityShortlistedUniversities.length > 0
                    ? "No manual entries yet — add deadlines, status, and decisions above, or use Add university for schools outside the catalog."
                    : "No universities yet — shortlist schools from University Search or add one here."}
                </p>
              ) : (
                shortlist.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col gap-2 rounded-[10px] border border-[var(--border-light)] bg-white p-3 transition-colors hover:border-[var(--border)] lg:flex-row lg:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-[var(--green-bg)] text-[var(--green)]">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden
                        >
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-semibold">
                          {u.university_name}
                        </div>
                        <div className="mt-0.5 text-[11.5px] text-[var(--text-light)]">
                          {[u.country, u.major_program]
                            .filter(Boolean)
                            .join(" · ")}
                          {u.application_method ? (
                            <>
                              {" "}
                              ·{" "}
                              <span className="rounded-full bg-[var(--green-pale)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--green-dark)]">
                                {methodPillLabel(u.application_method)}
                              </span>
                            </>
                          ) : null}
                          {u.application_deadline ? (
                            <>
                              {" "}
                              · Deadline {formatDate(u.application_deadline)}
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                      <div>
                        <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wide text-[var(--text-hint)]">
                          Status
                        </div>
                        <select
                          className={`${fieldClass} w-full py-1.5 text-[11.5px]`}
                          value={u.status}
                          onChange={(e) => {
                            const status = e.target.value;
                            setShortlist((prev) =>
                              prev.map((x) =>
                                x.id === u.id ? { ...x, status } : x,
                              ),
                            );
                            void updateShortlistRow(u.id, { status });
                          }}
                        >
                          {UNIVERSITY_APPLICATION_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABEL[s] ?? s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wide text-[var(--text-hint)]">
                          Decision
                        </div>
                        <select
                          className={`${fieldClass} w-full py-1.5 text-[11.5px]`}
                          value={u.decision ?? ""}
                          onChange={(e) => {
                            const decision = e.target.value;
                            setShortlist((prev) =>
                              prev.map((x) =>
                                x.id === u.id ? { ...x, decision } : x,
                              ),
                            );
                            void updateShortlistRow(u.id, {
                              decision: decision || null,
                            });
                          }}
                        >
                          {UNIVERSITY_DECISIONS.map((d) => (
                            <option key={d || "none"} value={d}>
                              {DECISION_LABEL[d] ?? d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        title="Remove"
                        className="flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-lg border border-[var(--border)] text-[var(--text-light)] hover:border-[#f0c4c4] hover:bg-[#FCEBEB] hover:text-[var(--red)]"
                        onClick={() => void removeUniversity(u.id)}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden
                        >
                          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "documents" ? (
        <div className="animate-[my-apps-fade-in_0.2s_ease]">
          <div className="mb-3.5 flex gap-3 rounded-[10px] border border-[var(--green-bg)] bg-[var(--green-pale)] px-3.5 py-3.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--green)] text-white">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <p className="text-[12.5px] leading-relaxed text-[var(--green-dark)]">
              Upload each file-based document below. <strong>Predicted</strong>{" "}
              is entered by your school and is read-only. Once uploaded, a file
              shows as <strong>Submitted</strong> and you can replace it anytime.
            </p>
          </div>
          <div className={panelClass}>
            <div className={panelHeadClass}>
              <div>
                <div className="text-[15px] font-semibold tracking-tight">
                  Document checklist
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  Upload files where needed · Predicted is from your school
                </div>
              </div>
            </div>
            <div className={`${panelBodyClass} space-y-2`}>
              {documents.map((d) => (
                <DocumentRow
                  key={d.id}
                  doc={d}
                  onPickFile={(file) => void uploadDocument(d, file)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "essays" ? (
        <div className="animate-[my-apps-fade-in_0.2s_ease]">
          <CalloutInfo>
            Save your essay drafts here.{" "}
            <strong>
              Each essay is linked to a specific university or application
            </strong>{" "}
            so your counselor knows what each piece is for.
          </CalloutInfo>
          <div className={panelClass}>
            <div className={panelHeadClass}>
              <div>
                <div className="text-[15px] font-semibold tracking-tight">
                  Your essays
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  Personal statements, supplementals, and scholarship essays
                </div>
              </div>
              <button
                type="button"
                className={btnSmClass(true)}
                onClick={() => setEssayModal(true)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New essay
              </button>
            </div>
            <div className={`${panelBodyClass} space-y-[7px]`}>
              {essays.length === 0 ? (
                <p className="text-sm text-[var(--text-mid)]">
                  {shortlistHintUniversities.length > 0
                    ? "You have not saved any essay drafts yet."
                    : 'No essays yet. Use "New essay" when you are ready.'}
                </p>
              ) : null}
              {essays.map((e) => {
                const iconWrap =
                  e.status === "in_review"
                    ? "bg-[rgba(212,162,42,0.14)] text-[#D4A22A]"
                    : e.status === "drafting"
                      ? "bg-[rgba(52,152,219,0.12)] text-[#3498DB]"
                      : e.status === "complete"
                        ? "bg-[var(--green-bg)] text-[var(--green)]"
                        : "bg-[var(--green-bg)] text-[var(--green)]";
                const pill =
                  e.status === "in_review" ? (
                    <StatusPill
                      variant="amber"
                      label={ESSAY_STATUS_LABEL.in_review}
                    />
                  ) : e.status === "drafting" ? (
                    <StatusPill
                      variant="blue"
                      label={ESSAY_STATUS_LABEL.drafting}
                    />
                  ) : e.status === "complete" ? (
                    <StatusPill
                      variant="green"
                      label={ESSAY_STATUS_LABEL.complete}
                    />
                  ) : null;
                return (
                  <div key={e.id} className="space-y-2">
                    <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3 transition-colors hover:border-[var(--border)] sm:flex-row sm:items-center">
                      <div
                        className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg ${iconWrap}`}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden
                        >
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-semibold">
                          {e.title}
                        </div>
                        <div className="mt-0.5 text-[11.5px] leading-snug text-[var(--text-light)]">
                          For: <strong>{e.for_application ?? "—"}</strong>
                          {e.essay_type ? <> ({e.essay_type})</> : null}
                          {e.status === "not_started" ? (
                            <>
                              {" · "}Not started
                              {e.requirement_note ? (
                                <> · {e.requirement_note}</>
                              ) : e.limit_note ? (
                                <> · {e.limit_note}</>
                              ) : null}
                            </>
                          ) : (
                            <>
                              {" · "}V{e.version}
                              {e.limit_note ? <> · {e.limit_note}</> : null}
                              {e.last_edited_at ? (
                                <>
                                  {" "}
                                  · Last edited{" "}
                                  {formatRelativeTime(e.last_edited_at)}
                                </>
                              ) : null}
                              {e.counselor_comment_preview ? (
                                <> · {e.counselor_comment_preview}</>
                              ) : e.comment_count > 0 ? (
                                <>
                                  {" · "}
                                  {e.comment_count} comment
                                  {e.comment_count !== 1 ? "s" : ""}
                                </>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                        {pill}
                        {e.status === "not_started" ? (
                          <button
                            type="button"
                            className={btnSmClass(true)}
                            onClick={() => {
                              setEssayOpenId(e.id);
                              setEssayDraft(e.body);
                            }}
                          >
                            Start writing
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={btnSmClass(false)}
                            onClick={() => {
                              setEssayOpenId((id) =>
                                id === e.id ? null : e.id,
                              );
                              setEssayDraft(e.body);
                            }}
                          >
                            {essayOpenId === e.id ? "Close" : "Open"}
                          </button>
                        )}
                      </div>
                    </div>
                    {essayOpenId === e.id ? (
                      <div className="rounded-[10px] border border-[var(--border-light)] bg-[var(--cream)] px-3.5 py-3">
                        <label className={labelClass}>Draft</label>
                        <textarea
                          className={`${fieldClass} mt-1.5 min-h-[120px] w-full resize-y`}
                          value={essayDraft}
                          onChange={(ev) => setEssayDraft(ev.target.value)}
                          placeholder="Write your essay here…"
                        />
                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            className={btnSmClass(false)}
                            onClick={() => setEssayOpenId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className={btnSmClass(true)}
                            onClick={() => void saveEssayDraft(e.id)}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {shortlistHintUniversities.length > 0 ? (
                <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--border-light)] bg-[var(--cream)] px-3.5 py-3 sm:flex-row sm:items-center">
                  <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-[var(--green-bg)] text-[var(--green)]">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold text-[var(--text-light)]">
                      Need to write essays for:{" "}
                      {shortlistHintUniversities
                        .map((u) => u.university_name)
                        .join(", ")}
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-[var(--text-light)]">
                      Click &quot;New essay&quot; above to draft for these
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "recommendations" ? (
        <div className="animate-[my-apps-fade-in_0.2s_ease]">
          <CalloutInfo>
            <strong>
              Most universities require 1–2 recommendation letters
            </strong>{" "}
            from teachers. Request them here — your teacher gets a notification,
            drafts the letter on Univeera, and submits it directly.
          </CalloutInfo>
          <div className={panelClass}>
            <div className={panelHeadClass}>
              <div>
                <div className="text-[15px] font-semibold tracking-tight">
                  Recommendation letters
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  Track requests, see which letters are pending, drafting, or
                  submitted
                </div>
              </div>
              <button
                type="button"
                className={btnSmClass(true)}
                onClick={() => setRecModal(true)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Request a letter
              </button>
            </div>
            <div className={`${panelBodyClass} space-y-[7px]`}>
              {recs.length === 0 ? (
                <p className="text-sm text-[var(--text-mid)]">
                  No requests yet.
                </p>
              ) : (
                recs.map((r) => {
                  const iconWrap =
                    r.status === "submitted"
                      ? "bg-[var(--green-bg)] text-[var(--green)]"
                      : r.status === "drafting"
                        ? "bg-[rgba(212,162,42,0.14)] text-[#D4A22A]"
                        : "bg-[#FCEBEB] text-[var(--red)]";
                  const metaTail =
                    r.status === "submitted"
                      ? r.submitted_at
                        ? `Submitted ${formatShortMonthDay(r.submitted_at)}`
                        : "Submitted"
                      : r.status === "drafting"
                        ? "Drafting in progress"
                        : "Awaiting response";
                  const teacherLine = `${r.teacher_name}${r.teacher_subject?.trim() ? ` (${r.teacher_subject.trim()})` : ""}`;
                  const pill =
                    r.status === "submitted" ? (
                      <StatusPill
                        variant="green"
                        label={REC_STATUS_LABEL.submitted}
                      />
                    ) : r.status === "drafting" ? (
                      <StatusPill
                        variant="amber"
                        label={REC_STATUS_LABEL.drafting}
                      />
                    ) : (
                      <StatusPill
                        variant="red"
                        label={REC_STATUS_LABEL.pending}
                      />
                    );
                  const action =
                    r.status === "submitted" ? (
                      <button
                        type="button"
                        className={btnSmClass(false)}
                        onClick={() =>
                          showToast(
                            "Letter viewer can be wired when submissions are stored.",
                          )
                        }
                      >
                        View
                      </button>
                    ) : r.status === "drafting" ? (
                      <button
                        type="button"
                        className={btnSmClass(false)}
                        onClick={() =>
                          showToast(
                            `Friendly nudge sent to ${r.teacher_name} (stub).`,
                          )
                        }
                      >
                        Nudge
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={btnSmClass(false)}
                        onClick={() =>
                          showToast(
                            "Request reminder (stub) — email delivery can be wired later.",
                          )
                        }
                      >
                        Resend
                      </button>
                    );
                  return (
                    <div
                      key={r.id}
                      className="flex flex-col gap-3 rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3 transition-colors hover:border-[var(--border)] sm:flex-row sm:items-center"
                    >
                      <div
                        className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg ${iconWrap}`}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden
                        >
                          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-semibold">
                          {teacherLine}
                        </div>
                        <div className="mt-0.5 text-[11.5px] leading-snug text-[var(--text-light)]">
                          For: {r.for_application} · Requested{" "}
                          {formatShortMonthDay(r.requested_at)} · {metaTail}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                        {pill}
                        {action}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className={`${panelClass} mt-3.5`}>
            <div className={panelHeadClass}>
              <div className="text-[15px] font-semibold tracking-tight">
                Tips for great recommendation letters
              </div>
            </div>
            <div className={`${panelBodyClass} pt-2`}>
              <div className="flex flex-col gap-2 text-[13px] leading-[1.55] text-[var(--text-mid)]">
                <div className="flex gap-2.5">
                  <span className="shrink-0 font-bold text-[var(--green)]">
                    →
                  </span>
                  <div>
                    <strong>Ask early.</strong> Give teachers at least 4–6
                    weeks. They often write 20+ letters per cycle.
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <span className="shrink-0 font-bold text-[var(--green)]">
                    →
                  </span>
                  <div>
                    <strong>Pick teachers who know you well.</strong> A B+ from
                    a teacher who knows your story is better than an A from one
                    who doesn&apos;t.
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <span className="shrink-0 font-bold text-[var(--green)]">
                    →
                  </span>
                  <div>
                    <strong>Add a personal note.</strong> Remind them of a
                    specific project, presentation, or moment they could
                    mention.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "tasks" ? (
        <div className="animate-[my-apps-fade-in_0.2s_ease]">
          <CalloutInfo>
            These tasks were assigned by{" "}
            <strong>{counselorDisplayName ?? "your counselor"}</strong>. Tick
            them off as you complete them.
          </CalloutInfo>
          <div className={panelClass}>
            <div className={panelHeadClass}>
              <div>
                <div className="text-[15px] font-semibold tracking-tight">
                  Tasks from your counselor
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  {openTasks} open
                  {tasksDueThisWeek > 0
                    ? ` · ${tasksDueThisWeek} due this week`
                    : ""}
                </div>
              </div>
            </div>
            <div className={`${panelBodyClass} space-y-[7px]`}>
              {tasks.length === 0 ? (
                <p className="text-sm text-[var(--text-mid)]">No tasks yet.</p>
              ) : (
                tasks.map((t) => {
                  const overdue = isTaskDueOverdue(t.due_date, t.completed);
                  const assignLabel = t.assigned_by_name?.trim()
                    ? `Assigned by ${t.assigned_by_name.trim()}`
                    : "Self-assigned";
                  const priorityPill =
                    t.priority === "high" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(231,76,60,0.12)] px-[7px] py-px text-[10px] font-bold text-[#8c2d22]">
                        <span
                          className="h-1 w-1 shrink-0 rounded-full bg-[var(--red)]"
                          aria-hidden
                        />
                        High
                      </span>
                    ) : t.priority === "medium" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(212,162,42,0.14)] px-[7px] py-px text-[10px] font-bold text-[#7a5d10]">
                        <span
                          className="h-1 w-1 shrink-0 rounded-full bg-[#D4A22A]"
                          aria-hidden
                        />
                        Medium
                      </span>
                    ) : t.priority === "low" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#ECEAE5] px-[7px] py-px text-[10px] font-bold text-[var(--text-mid)]">
                        <span
                          className="h-1 w-1 shrink-0 rounded-full bg-[#a0a0a0]"
                          aria-hidden
                        />
                        Low
                      </span>
                    ) : null;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => void toggleTask(t)}
                      className={`flex w-full cursor-pointer items-start gap-3 rounded-[10px] border border-[var(--border-light)] px-3.5 py-3 text-left transition-colors hover:border-[var(--border)] ${
                        t.completed ? "bg-[var(--cream)]" : "bg-white"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-[var(--border)] bg-white ${
                          t.completed
                            ? "border-[var(--green-bright)] bg-[var(--green-bright)]"
                            : ""
                        }`}
                      >
                        {t.completed ? (
                          <svg
                            className="h-2.5 w-2.5 text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            aria-hidden
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-[13.5px] font-semibold ${t.completed ? "text-[var(--text-light)] line-through" : ""}`}
                        >
                          {t.title}
                        </div>
                        {t.description?.trim() ? (
                          <p
                            className={`mt-1 whitespace-pre-wrap text-[12px] leading-snug text-[var(--text-mid)] ${
                              t.completed
                                ? "text-[var(--text-hint)] line-through"
                                : ""
                            }`}
                          >
                            {t.description.trim()}
                          </p>
                        ) : null}
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-[var(--text-light)]">
                          <span>{assignLabel}</span>
                          {priorityPill}
                          {!t.completed && t.due_date ? (
                            <span
                              className={
                                overdue
                                  ? "font-medium text-[var(--red)]"
                                  : undefined
                              }
                            >
                              Due {formatDate(t.due_date)}
                              {overdue ? " — overdue" : ""}
                            </span>
                          ) : null}
                          {t.completed && t.completed_at ? (
                            <span className="text-[var(--text-light)]">
                              Completed {formatDate(t.completed_at)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      {uniModal ? (
        <ModalVeil onClose={() => setUniModal(false)} title="Add a university">
          <div className="flex flex-col gap-3.5">
            <div>
              <label className={labelClass}>University name</label>
              <input
                className={`${fieldClass} mt-1.5 w-full`}
                value={uniForm.university_name}
                onChange={(e) =>
                  setUniForm((f) => ({ ...f, university_name: e.target.value }))
                }
                placeholder="e.g. University of Edinburgh"
              />
            </div>
            <div>
              <label className={labelClass}>University location</label>
              <select
                className={`${fieldClass} mt-1.5 w-full`}
                value={uniForm.country}
                onChange={(e) =>
                  setUniForm((f) => ({ ...f, country: e.target.value }))
                }
              >
                <option value="">Select country…</option>
                {initial.countries.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Major / program</label>
              <input
                className={`${fieldClass} mt-1.5 w-full`}
                value={uniForm.major_program}
                onChange={(e) =>
                  setUniForm((f) => ({ ...f, major_program: e.target.value }))
                }
                placeholder="e.g. BSc Finance"
              />
            </div>
            <div>
              <label className={labelClass}>How do you apply?</label>
              <select
                className={`${fieldClass} mt-1.5 w-full`}
                value={uniForm.application_method}
                onChange={(e) =>
                  setUniForm((f) => ({
                    ...f,
                    application_method: e.target.value,
                  }))
                }
              >
                <option value="">Select application system…</option>
                {APPLICATION_METHOD_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Deadline (optional)</label>
              <input
                type="date"
                className={`${fieldClass} mt-1.5 w-full`}
                value={uniForm.application_deadline}
                onChange={(e) =>
                  setUniForm((f) => ({
                    ...f,
                    application_deadline: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2 border-t border-[var(--border-light)] bg-[var(--cream)] px-[22px] py-3.5 -mx-[22px] -mb-[18px] rounded-b-[14px]">
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)]"
              onClick={() => setUniModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[var(--green-dark)]"
              onClick={() => void addUniversity()}
            >
              Add to shortlist
            </button>
          </div>
        </ModalVeil>
      ) : null}

      {essayModal ? (
        <ModalVeil
          onClose={() => setEssayModal(false)}
          title="Start a new essay"
        >
          <div className="flex flex-col gap-3.5">
            <div>
              <label className={labelClass}>Essay title</label>
              <input
                className={`${fieldClass} mt-1.5 w-full`}
                value={essayForm.title}
                onChange={(e) =>
                  setEssayForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClass}>Essay type</label>
              <select
                className={`${fieldClass} mt-1.5 w-full`}
                value={essayForm.essay_type}
                onChange={(e) =>
                  setEssayForm((f) => ({ ...f, essay_type: e.target.value }))
                }
              >
                {ESSAY_TYPE_OPTIONS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>For which application?</label>
              <input
                className={`${fieldClass} mt-1.5 w-full`}
                value={essayForm.for_application}
                onChange={(e) =>
                  setEssayForm((f) => ({
                    ...f,
                    for_application: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className={labelClass}>
                Word / character limit (if known)
              </label>
              <input
                className={`${fieldClass} mt-1.5 w-full`}
                value={essayForm.limit_note}
                onChange={(e) =>
                  setEssayForm((f) => ({ ...f, limit_note: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClass}>
                Requirement / prompt note (optional)
              </label>
              <input
                className={`${fieldClass} mt-1.5 w-full`}
                value={essayForm.requirement_note}
                onChange={(e) =>
                  setEssayForm((f) => ({
                    ...f,
                    requirement_note: e.target.value,
                  }))
                }
                placeholder="e.g. Required for Rotman supplemental"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2 border-t border-[var(--border-light)] bg-[var(--cream)] px-[22px] py-3.5 -mx-[22px] -mb-[18px] rounded-b-[14px]">
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[11.5px] font-semibold"
              onClick={() => setEssayModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[var(--green-dark)]"
              onClick={() => void addEssay()}
            >
              Create essay
            </button>
          </div>
        </ModalVeil>
      ) : null}

      {recModal ? (
        <ModalVeil
          onClose={() => setRecModal(false)}
          title="Request a recommendation letter"
        >
          <p className="mb-3 rounded-lg border border-[var(--green-bg)] bg-[var(--green-pale)] px-3 py-2.5 text-xs leading-relaxed text-[var(--green-dark)]">
            Your teacher receives the request details here; full email delivery
            can be wired later.
          </p>
          <div className="grid gap-3.5 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Teacher name</label>
              <input
                className={`${fieldClass} mt-1.5 w-full`}
                value={recForm.teacher_name}
                onChange={(e) =>
                  setRecForm((f) => ({ ...f, teacher_name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClass}>Subject (optional)</label>
              <input
                className={`${fieldClass} mt-1.5 w-full`}
                value={recForm.teacher_subject}
                onChange={(e) =>
                  setRecForm((f) => ({ ...f, teacher_subject: e.target.value }))
                }
                placeholder="e.g. Mathematics"
              />
            </div>
            <div>
              <label className={labelClass}>Teacher email</label>
              <input
                type="email"
                className={`${fieldClass} mt-1.5 w-full`}
                value={recForm.teacher_email}
                onChange={(e) =>
                  setRecForm((f) => ({ ...f, teacher_email: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="mt-3.5">
            <label className={labelClass}>For which application?</label>
            <input
              className={`${fieldClass} mt-1.5 w-full`}
              value={recForm.for_application}
              onChange={(e) =>
                setRecForm((f) => ({ ...f, for_application: e.target.value }))
              }
            />
          </div>
          <div className="mt-3.5">
            <label className={labelClass}>Personal note (optional)</label>
            <textarea
              className={`${fieldClass} mt-1.5 min-h-[60px] w-full resize-y`}
              value={recForm.personal_note}
              onChange={(e) =>
                setRecForm((f) => ({ ...f, personal_note: e.target.value }))
              }
            />
          </div>
          <div className="mt-3.5">
            <label className={labelClass}>When do you need it by?</label>
            <input
              type="date"
              className={`${fieldClass} mt-1.5 w-full`}
              value={recForm.needed_by}
              onChange={(e) =>
                setRecForm((f) => ({ ...f, needed_by: e.target.value }))
              }
            />
          </div>
          <div className="mt-5 flex justify-end gap-2 border-t border-[var(--border-light)] bg-[var(--cream)] px-[22px] py-3.5 -mx-[22px] -mb-[18px] rounded-b-[14px]">
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[11.5px] font-semibold"
              onClick={() => setRecModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[var(--green-dark)]"
              onClick={() => void sendRecRequest()}
            >
              Save request
            </button>
          </div>
        </ModalVeil>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-2 rounded-[10px] bg-[var(--green-dark)] px-4 py-3 text-[13px] font-medium text-white shadow-lg">
          <svg
            className="h-3.5 w-3.5 text-[var(--green-bright)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            aria-hidden
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function TagField({
  label,
  hint,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");
  const add = (raw: string) => {
    const v = raw.trim();
    if (!v || values.includes(v)) return;
    onChange([...values, v]);
    setInput("");
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-mid)]">
        {label}
      </label>
      <div
        className="flex min-h-[42px] cursor-text flex-wrap items-center gap-1.5 rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2 focus-within:border-[var(--green-light)]"
        onClick={(e) => {
          const t = e.currentTarget.querySelector("input");
          t?.focus();
        }}
      >
        {values.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--green-pale)] px-2.5 py-1 text-xs font-medium text-[var(--green-dark)]"
          >
            {t}
            <button
              type="button"
              className="text-[var(--green-dark)] opacity-60 hover:opacity-100"
              aria-label={`Remove ${t}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange(values.filter((x) => x !== t));
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          className="min-w-[120px] flex-1 border-none bg-transparent py-0.5 text-[13px] outline-none"
          value={input}
          placeholder={placeholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(input);
            }
          }}
        />
      </div>
      {hint ? (
        <p className="text-[11.5px] text-[var(--text-hint)]">{hint}</p>
      ) : null}
    </div>
  );
}

function DocumentRow({
  doc,
  onPickFile,
}: {
  doc: DocRow;
  onPickFile: (f: File) => void;
}) {
  if (doc.slot_key === SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY) {
    const text = doc.school_text_value?.trim();
    const has = !!text;
    return (
      <div className="flex flex-col gap-2 rounded-[10px] border border-[var(--border-light)] bg-[#faf9f4] p-3 sm:flex-row sm:items-center">
        <div
          className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg ${
            has
              ? "bg-[var(--green-bg)] text-[var(--green)]"
              : "bg-[#ECEAE5] text-[var(--text-mid)]"
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold">{doc.display_name}</div>
          <div className="mt-0.5 text-[11.5px] text-[var(--text-light)]">
            {has ? (
              <span className="text-[var(--text)]">{text}</span>
            ) : (
              "Your school has not entered this yet."
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
              has
                ? "bg-[rgba(82,183,135,.13)] text-[#1B4332]"
                : "bg-[#ECEAE5] text-[var(--text-mid)]"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
            {has ? "From school" : "Pending"}
          </span>
          <span
            className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--cream)] px-2.5 py-1.5 text-[11.5px] font-semibold text-[var(--text-hint)]"
            title="Read-only"
          >
            View only
          </span>
        </div>
      </div>
    );
  }

  const missing = doc.status === "missing";
  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-[var(--border-light)] bg-white p-3 sm:flex-row sm:items-center">
      <div
        className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg ${
          missing
            ? "bg-[#FCEBEB] text-[var(--red)]"
            : "bg-[rgba(52,152,219,0.12)] text-[#3498DB]"
        }`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold">{doc.display_name}</div>
        <div className="mt-0.5 text-[11.5px] text-[var(--text-light)]">
          {doc.file_name && doc.uploaded_at
            ? `${doc.file_name} · Uploaded ${formatDate(doc.uploaded_at)}`
            : doc.description || "Not uploaded yet"}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
            missing
              ? "bg-[rgba(231,76,60,0.12)] text-[#8c2d22]"
              : "bg-[rgba(52,152,219,0.12)] text-[#1d4d70]"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
          {missing ? "Missing" : "Submitted"}
        </span>
        <label className="cursor-pointer">
          <input
            type="file"
            className="sr-only"
            onChange={(e) =>
              e.target.files?.[0] && onPickFile(e.target.files[0])
            }
          />
          <span
            className={`inline-flex rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold ${
              missing
                ? "border-[var(--green)] bg-[var(--green)] text-white hover:bg-[var(--green-dark)]"
                : "border-[var(--border)] bg-white text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)]"
            }`}
          >
            {missing ? "Upload" : "Replace"}
          </span>
        </label>
      </div>
    </div>
  );
}

function ModalVeil({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(15,30,20,0.5)] p-5"
      role="dialog"
      aria-modal
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-[14px] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border-light)] px-[22px] py-4">
          <h2 className="font-[family-name:var(--font-dm-serif)] text-xl tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            className="rounded-md p-1.5 text-[var(--text-light)] hover:bg-[var(--cream)]"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-[22px] py-[18px]">{children}</div>
      </div>
    </div>
  );
}
