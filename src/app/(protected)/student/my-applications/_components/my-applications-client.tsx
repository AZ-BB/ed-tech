"use client";

import type { Database } from "@/database.types";
import { sortApplicationDocumentsBySlotOrder } from "@/lib/ensure-student-application-documents";
import { COUNTRIES } from "@/lib/countries";
import { createSupabaseBrowserClient } from "@/utils/supabase-browser";
import { useLocale } from "@/lib/i18n/locale-context";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { getStudentEssayFileViewUrl } from "@/actions/essay-my-application-files";
import {
  createRecommendationRequest,
  getRecommendationLetterViewUrl,
  resendRecommendationRequestEmail,
} from "@/actions/recommendation-requests";
import {
  removeUniversityFromFavourites,
  removeUniversityFromShortlist,
} from "@/actions/universities";
import { moveCatalogFavouriteToApplicationShortlist } from "@/actions/student-my-application-universities";
import type {
  ActivityCatalogUniversity,
  EssayWithComments,
  MyApplicationsInitialPayload,
} from "../_lib/my-applications-types";
import { MoveToShortlistModal } from "./move-to-shortlist-modal";
import {
  buildLiveApplicationProfileCompletionInput,
  type StudentApplicationProfileCompletionRow,
} from "@/lib/student-application-profile-completion";
import {
  getMyApplicationsWorkspaceCompletion,
  workspaceCompletionSubtitle,
} from "../_lib/my-applications-workspace-completion";
import {
  labelPreferredDestinationEntry,
  normalizePreferredDestinationsForEditor,
} from "../_lib/preferred-destinations-iso";
import {
  ACT_SCORE_MAX,
  ACT_SCORE_MIN,
  SAT_SCORE_MAX,
  SAT_SCORE_MIN,
  clampActScoreOnBlur,
  clampSatScoreOnBlur,
  formatLegacySatActSummary,
  parseLegacySatActScores,
  sanitizeActScoreInput,
  sanitizeSatScoreInput,
} from "../_lib/sat-act-score-input";
import {
  IELTS_SCORE_MAX,
  IELTS_SCORE_MIN,
  TOEFL_SCORE_MAX,
  TOEFL_SCORE_MIN,
  clampIeltsScoreOnBlur,
  clampToeflScoreOnBlur,
  formatLegacyEnglishSummary,
  parseLegacyEnglishScores,
  sanitizeIeltsScoreInput,
  sanitizeToeflScoreInput,
} from "../_lib/ielts-toefl-score-input";
import {
  AID_OPTIONS,
  APPLICATION_METHOD_OPTIONS,
  BUDGET_OPTIONS,
  CURRICULUM_OPTIONS,
  ESSAY_STATUSES,
  ESSAY_TYPE_OPTIONS,
  GRADE_OPTIONS,
  DEFAULT_MY_APPLICATION_DOCUMENT_SLOTS,
  SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY,
  isOtherDocumentSlot,
  makeSupplementalOtherDocumentSlotKey,
  TARGET_INTAKE_OPTIONS,
  UNIVERSITY_APPLICATION_STATUSES,
  UNIVERSITY_DECISIONS,
  type EssayStatusSlug,
} from "../_lib/my-applications-defaults";

type ShortlistRow =
  Database["public"]["Tables"]["student_shortlist_universities"]["Row"];
type DocRow =
  Database["public"]["Tables"]["student_my_application_documents"]["Row"];
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

function methodPillLabel(applicationMethod: string | null): string {
  if (!applicationMethod) return "—";
  const i = applicationMethod.indexOf(" — ");
  return i === -1 ? applicationMethod : applicationMethod.slice(0, i);
}

function formatDate(iso: string | null | undefined, locale?: string) {
  if (!iso) return "";
  const dateLocale = locale === "ar" ? "ar" : undefined;
  try {
    return new Date(iso).toLocaleDateString(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** e.g. Feb 12, or Feb 12, 2025 if not current year */
function formatShortMonthDay(iso: string | null | undefined, locale?: string) {
  if (!iso) return "";
  const dateLocale = locale === "ar" ? "ar" : undefined;
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const nowY = new Date().getFullYear();
    return d.toLocaleDateString(dateLocale, {
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

type EssayFormState = {
  title: string;
  essay_type: string;
  for_application: string;
  essay_prompt: string;
  limit_note: string;
  deadline: string;
  instructions_note: string;
};

function defaultEssayForm(): EssayFormState {
  return {
    title: "",
    essay_type: ESSAY_TYPE_OPTIONS[0] as string,
    for_application: "",
    essay_prompt: "",
    limit_note: "",
    deadline: "",
    instructions_note: "",
  };
}

function essayToForm(essay: EssayWithComments): EssayFormState {
  return {
    title: essay.title ?? "",
    essay_type: essay.essay_type ?? (ESSAY_TYPE_OPTIONS[0] as string),
    for_application: essay.for_application ?? "",
    essay_prompt: essay.essay_prompt ?? "",
    limit_note: essay.limit_note ?? "",
    deadline: essay.deadline ? essay.deadline.slice(0, 10) : "",
    instructions_note: essay.instructions_note ?? "",
  };
}

function formatRelativeTime(
  iso: string | null | undefined,
  timeLabels: {
    justNow: string;
    oneHourAgo: string;
    hoursAgo: string;
    yesterday: string;
    daysAgo: string;
  },
  locale?: string,
) {
  if (!iso) return "";
  try {
    const t = new Date(iso).getTime();
    const diffMs = Date.now() - t;
    const days = Math.floor(diffMs / 86400000);
    if (days < 0) return formatShortMonthDay(iso, locale);
    if (days === 0) {
      const hours = Math.floor(diffMs / 3600000);
      if (hours < 1) return timeLabels.justNow;
      if (hours === 1) return timeLabels.oneHourAgo;
      return timeLabels.hoursAgo.replace("{count}", String(hours));
    }
    if (days === 1) return timeLabels.yesterday;
    if (days < 7) return timeLabels.daysAgo.replace("{count}", String(days));
    return formatShortMonthDay(iso, locale);
  } catch {
    return formatShortMonthDay(iso, locale);
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

export function MyApplicationsClient({
  initial,
}: {
  initial: MyApplicationsInitialPayload;
}) {
  const { dict, locale } = useLocale();
  const app = dict.student.applications;
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "tasks" ? "tasks" : "profile";
  const [tab, setTab] = useState<TabId>(initialTab);
  const [toast, setToast] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(initial.profile.first_name);
  const [lastName, setLastName] = useState(initial.profile.last_name);
  const [nationalityCode, setNationalityCode] = useState(
    initial.profile.nationality_country_code,
  );

  const ap0 = initial.applicationProfile;
  const [grade, setGrade] = useState(
    ap0?.grade ?? initial.profile.grade ?? "",
  );
  const gradeSelectOptions = useMemo(() => {
    const opts: string[] = [...GRADE_OPTIONS];
    if (grade && !opts.includes(grade)) {
      opts.push(grade);
    }
    return opts;
  }, [grade]);
  const [curriculum, setCurriculum] = useState(ap0?.curriculum ?? "");
  const [targetIntake, setTargetIntake] = useState(ap0?.target_intake ?? "");
  const [destinations, setDestinations] = useState<string[]>(() =>
    normalizePreferredDestinationsForEditor(
      ap0?.preferred_destinations ?? [],
      initial.countries,
    ),
  );
  const [programs, setPrograms] = useState<string[]>(
    ap0?.interested_programs ?? [],
  );
  const [budgetRange, setBudgetRange] = useState(ap0?.budget_range ?? "");
  const [needAid, setNeedAid] = useState(ap0?.need_based_aid ?? "");
  const [ieltsScore, setIeltsScore] = useState(() => {
    const i = ap0?.ielts_score?.trim();
    const t = ap0?.toefl_score?.trim();
    if (i || t) return i ?? "";
    return parseLegacyEnglishScores(ap0?.english_test_scores ?? null).ielts;
  });
  const [toeflScore, setToeflScore] = useState(() => {
    const i = ap0?.ielts_score?.trim();
    const t = ap0?.toefl_score?.trim();
    if (i || t) return t ?? "";
    return parseLegacyEnglishScores(ap0?.english_test_scores ?? null).toefl;
  });
  const [satScore, setSatScore] = useState(() => {
    const s = ap0?.sat_score?.trim();
    const a = ap0?.act_score?.trim();
    if (s || a) return s ?? "";
    return parseLegacySatActScores(ap0?.sat_act_scores ?? null).sat;
  });
  const [actScore, setActScore] = useState(() => {
    const s = ap0?.sat_score?.trim();
    const a = ap0?.act_score?.trim();
    if (s || a) return a ?? "";
    return parseLegacySatActScores(ap0?.sat_act_scores ?? null).act;
  });
  const [predictedGrades, setPredictedGrades] = useState(
    ap0?.predicted_grades ?? "",
  );
  const predictedGradesLocked = Boolean(
    initial.applicationProfile?.predicted_grades_set_by_school,
  );
  const [otherTests, setOtherTests] = useState(ap0?.other_tests ?? "");
  const [savedApplicationProfile, setSavedApplicationProfile] =
    useState<StudentApplicationProfileCompletionRow | null>(
      initial.applicationProfile,
    );

  const [shortlist, setShortlist] = useState<ShortlistRow[]>(initial.shortlist);
  const [favourites, setFavourites] = useState<ActivityCatalogUniversity[]>(
    () => initial.activityFavouriteUniversities,
  );
  const [documents, setDocuments] = useState<DocRow[]>(initial.documents);
  const [essays, setEssays] = useState<EssayWithComments[]>(initial.essays);
  const [recs, setRecs] = useState<RecRow[]>(initial.recommendations);
  const [tasks, setTasks] = useState<TaskRow[]>(initial.tasks);

  const [uniModal, setUniModal] = useState(false);
  const [essayModal, setEssayModal] = useState(false);
  const [recModal, setRecModal] = useState(false);
  const [moveToShortlistTarget, setMoveToShortlistTarget] =
    useState<ActivityCatalogUniversity | null>(null);
  const [removeFavouriteTarget, setRemoveFavouriteTarget] =
    useState<ActivityCatalogUniversity | null>(null);
  const [removingFavourite, setRemovingFavourite] = useState(false);

  const [uniForm, setUniForm] = useState({
    university_name: "",
    country: "",
    major_program: "",
    application_method: "",
    application_deadline: "",
  });
  const [essayForm, setEssayForm] = useState<EssayFormState>(defaultEssayForm);
  const [essayEditingId, setEssayEditingId] = useState<string | null>(null);
  const [essayDeleteTarget, setEssayDeleteTarget] =
    useState<EssayWithComments | null>(null);
  const [deletingEssay, setDeletingEssay] = useState(false);
  const [savingEssay, setSavingEssay] = useState(false);
  const [sendingRecRequest, setSendingRecRequest] = useState(false);
  const [recForm, setRecForm] = useState({
    teacher_name: "",
    teacher_subject: "",
    teacher_email: "",
    for_application: "",
    personal_note: "",
    needed_by: "",
  });

  const [essayDetailId, setEssayDetailId] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const { pct, missingAreas } = useMemo(() => {
    const profileInput = buildLiveApplicationProfileCompletionInput({
      grade,
      curriculum,
      destinations,
      programs,
      ieltsScore,
      toeflScore,
      satScore,
      actScore,
      savedApplicationProfile,
    });
    return getMyApplicationsWorkspaceCompletion({
      profileInput,
      shortlistCount: shortlist.length,
      documents,
      essaysCount: essays.length,
      recommendationsCount: recs.length,
    });
  }, [
    grade,
    curriculum,
    destinations,
    programs,
    ieltsScore,
    toeflScore,
    satScore,
    actScore,
    savedApplicationProfile,
    shortlist.length,
    documents,
    essays.length,
    recs.length,
  ]);

  const completionSubtitle = useMemo(
    () => workspaceCompletionSubtitle(missingAreas, app.completion),
    [missingAreas, app.completion],
  );

  const ieltsScoreInvalid = useMemo(() => {
    const t = ieltsScore.trim();
    if (!t) return false;
    const n = parseFloat(t);
    return (
      !Number.isFinite(n) ||
      n < IELTS_SCORE_MIN ||
      n > IELTS_SCORE_MAX
    );
  }, [ieltsScore]);

  const toeflScoreInvalid = useMemo(() => {
    const t = toeflScore.trim();
    if (!t) return false;
    const n = parseInt(t, 10);
    return (
      !Number.isFinite(n) ||
      n < TOEFL_SCORE_MIN ||
      n > TOEFL_SCORE_MAX
    );
  }, [toeflScore]);

  const satScoreInvalid = useMemo(() => {
    const t = satScore.trim();
    if (!t) return false;
    const n = parseInt(t, 10);
    return (
      !Number.isFinite(n) ||
      n < SAT_SCORE_MIN ||
      n > SAT_SCORE_MAX
    );
  }, [satScore]);

  const actScoreInvalid = useMemo(() => {
    const t = actScore.trim();
    if (!t) return false;
    const n = parseInt(t, 10);
    return (
      !Number.isFinite(n) ||
      n < ACT_SCORE_MIN ||
      n > ACT_SCORE_MAX
    );
  }, [actScore]);

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

  const detailEssay =
    essayDetailId != null
      ? essays.find((x) => x.id === essayDetailId)
      : undefined;

  function studentEssayIconWrap(
    status: EssayStatusSlug,
    hasFile: boolean,
  ): string {
    if (!hasFile) return "bg-[#f1ede7] text-[var(--text-light)]";
    if (status === "ready_for_review")
      return "bg-[rgba(82,183,135,0.16)] text-[var(--green)]";
    if (status === "in_progress")
      return "bg-[rgba(212,162,42,0.16)] text-[#D4A22A]";
    return "bg-[rgba(142,68,173,0.12)] text-[#8E44AD]";
  }

  function studentEssayRowTone(
    status: EssayStatusSlug,
    hasFile: boolean,
  ): string {
    if (!hasFile) return "border-dashed bg-[#fdfdfa]";
    return "border-[var(--border-light)] bg-white";
  }

  function studentStatusSelectCls(s: EssayStatusSlug) {
    return s === "ready_for_review"
      ? "bg-[rgba(82,183,135,0.13)] text-[#1B4332] border-[rgba(82,183,135,0.3)]"
      : s === "in_progress"
        ? "bg-[rgba(212,162,42,0.14)] text-[#7a5d10] border-[rgba(212,162,42,0.3)]"
        : "bg-[#ECEAE5] text-[var(--text-mid)] border-[var(--border)]";
  }

  const studentEssayBtnRow = (primary?: boolean, danger?: boolean) =>
    danger
      ? `${btnSmClass(false)} flex-1 justify-center border-[rgba(231,76,60,0.35)] text-[#8c2d22] hover:bg-[rgba(231,76,60,0.08)]`
      : primary
        ? `${btnSmClass(true)} flex-1 justify-center`
        : `${btnSmClass(false)} flex-1 justify-center`;

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
      ielts_score: ieltsScore.trim() || null,
      toefl_score: toeflScore.trim() || null,
      english_test_scores: formatLegacyEnglishSummary(ieltsScore, toeflScore),
      sat_score: satScore.trim() || null,
      act_score: actScore.trim() || null,
      sat_act_scores: formatLegacySatActSummary(satScore, actScore),
      predicted_grades: predictedGrades || null,
      predicted_grades_set_by_school:
        initial.applicationProfile?.predicted_grades_set_by_school ?? false,
      other_tests: otherTests || null,
      updated_at: new Date().toISOString(),
    };
  }, [
    initial.studentId,
    initial.applicationProfile?.predicted_grades_set_by_school,
    grade,
    curriculum,
    targetIntake,
    destinations,
    programs,
    budgetRange,
    needAid,
    ieltsScore,
    toeflScore,
    satScore,
    actScore,
    predictedGrades,
    otherTests,
  ]);

  const syncSavedApplicationProfile = useCallback(() => {
    setSavedApplicationProfile({
      grade: grade || null,
      curriculum: curriculum || null,
      preferred_destinations: destinations,
      interested_programs: programs,
      ielts_score: ieltsScore.trim() || null,
      toefl_score: toeflScore.trim() || null,
      english_test_scores: formatLegacyEnglishSummary(ieltsScore, toeflScore),
      sat_score: satScore.trim() || null,
      act_score: actScore.trim() || null,
      sat_act_scores: formatLegacySatActSummary(satScore, actScore),
    });
  }, [
    grade,
    curriculum,
    destinations,
    programs,
    ieltsScore,
    toeflScore,
    satScore,
    actScore,
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
    syncSavedApplicationProfile();
    showToast(app.toasts.saved);
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
    syncSavedApplicationProfile();
    showToast(app.toasts.saved);
  };

  const saveScores = async () => {
    const ieltsFinal = ieltsScore.trim() ? clampIeltsScoreOnBlur(ieltsScore) : "";
    const toeflFinal = toeflScore.trim() ? clampToeflScoreOnBlur(toeflScore) : "";
    const nIelts = ieltsFinal ? parseFloat(ieltsFinal) : NaN;
    if (
      ieltsFinal &&
      (!Number.isFinite(nIelts) ||
        nIelts < IELTS_SCORE_MIN ||
        nIelts > IELTS_SCORE_MAX)
    ) {
      showToast(
        app.toasts.ieltsRangeToast
          .replace("{min}", String(IELTS_SCORE_MIN))
          .replace("{max}", String(IELTS_SCORE_MAX)),
      );
      return;
    }
    const nToefl = toeflFinal ? parseInt(toeflFinal, 10) : NaN;
    if (
      toeflFinal &&
      (!Number.isFinite(nToefl) ||
        nToefl < TOEFL_SCORE_MIN ||
        nToefl > TOEFL_SCORE_MAX)
    ) {
      showToast(
        app.toasts.toeflRangeToast
          .replace("{min}", String(TOEFL_SCORE_MIN))
          .replace("{max}", String(TOEFL_SCORE_MAX)),
      );
      return;
    }
    const satFinal = satScore.trim() ? clampSatScoreOnBlur(satScore) : "";
    const actFinal = actScore.trim() ? clampActScoreOnBlur(actScore) : "";
    const nSat = satFinal ? parseInt(satFinal, 10) : NaN;
    if (
      satFinal &&
      (!Number.isFinite(nSat) ||
        nSat < SAT_SCORE_MIN ||
        nSat > SAT_SCORE_MAX)
    ) {
      showToast(
        app.toasts.satRangeToast
          .replace("{min}", String(SAT_SCORE_MIN))
          .replace("{max}", String(SAT_SCORE_MAX)),
      );
      return;
    }
    const nAct = actFinal ? parseInt(actFinal, 10) : NaN;
    if (
      actFinal &&
      (!Number.isFinite(nAct) ||
        nAct < ACT_SCORE_MIN ||
        nAct > ACT_SCORE_MAX)
    ) {
      showToast(
        app.toasts.actRangeToast
          .replace("{min}", String(ACT_SCORE_MIN))
          .replace("{max}", String(ACT_SCORE_MAX)),
      );
      return;
    }
    setIeltsScore(ieltsFinal);
    setToeflScore(toeflFinal);
    setSatScore(satFinal);
    setActScore(actFinal);
    const row = {
      ...buildApplicationProfileRow(),
      ielts_score: ieltsFinal || null,
      toefl_score: toeflFinal || null,
      english_test_scores: formatLegacyEnglishSummary(ieltsFinal, toeflFinal),
      sat_score: satFinal || null,
      act_score: actFinal || null,
      sat_act_scores: formatLegacySatActSummary(satFinal, actFinal),
    };
    const { error } = await supabase
      .from("student_application_profile")
      .upsert(row, {
        onConflict: "student_id",
      });
    if (error) {
      showToast(error.message);
      return;
    }
    syncSavedApplicationProfile();
    showToast(app.toasts.saved);
  };

  const addUniversity = async () => {
    if (
      !uniForm.university_name.trim() ||
      !uniForm.country ||
      !uniForm.major_program.trim() ||
      !uniForm.application_method
    ) {
      showToast(app.toasts.fillFields);
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
      showToast(error?.message ?? app.toasts.couldNotAdd);
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
    showToast(
      app.toasts.addedToShortlistToast.replace("{name}", data.university_name),
    );
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
    if (!confirm(app.toasts.removeShortlistConfirm)) return;
    const row = shortlist.find((r) => r.id === id);
    if (row?.catalog_university_id) {
      const res = await removeUniversityFromShortlist(row.catalog_university_id);
      if (res.error) {
        showToast(
          typeof res.error === "string" ? res.error : app.toasts.couldNotRemove,
        );
        return;
      }
      setShortlist((prev) => prev.filter((r) => r.id !== id));
      return;
    }
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

  const moveFavouriteToShortlist = async (
    u: ActivityCatalogUniversity,
    majorProgram: string,
  ) => {
    const res = await moveCatalogFavouriteToApplicationShortlist(
      u.uniId,
      majorProgram,
    );
    if (res.error || !res.data) {
      showToast(
        typeof res.error === "string"
          ? res.error
          : app.toasts.couldNotMove,
      );
      return;
    }
    const inserted = res.data;
    setFavourites((prev) => prev.filter((x) => x.uniId !== u.uniId));
    setShortlist((prev) => {
      if (prev.some((r) => r.id === inserted.id)) {
        return prev.map((r) => (r.id === inserted.id ? inserted : r));
      }
      return [inserted, ...prev];
    });
    setMoveToShortlistTarget(null);
    showToast(app.toasts.movedToShortlistToast.replace("{name}", u.name));
  };

  const removeFavourite = async (u: ActivityCatalogUniversity) => {
    setRemovingFavourite(true);
    try {
      const res = await removeUniversityFromFavourites(u.uniId);
      if (res.error) {
        showToast(
          typeof res.error === "string"
            ? res.error
            : app.toasts.couldNotRemoveFav,
        );
        return;
      }
      setFavourites((prev) => prev.filter((x) => x.uniId !== u.uniId));
      setRemoveFavouriteTarget(null);
      showToast(
        app.toasts.removedFromFavoritesToast.replace("{name}", u.name),
      );
    } finally {
      setRemovingFavourite(false);
    }
  };

  const uploadDocument = async (doc: DocRow, file: File) => {
    if (doc.slot_key === SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY) {
      showToast(app.toasts.schoolReadOnly);
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
      showToast(error?.message ?? app.toasts.updateFailed);
      return;
    }
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? data : d)));
    showToast(
      app.toasts.docUploadedToast.replace("{name}", doc.display_name),
    );
  };

  const saveOtherDocumentDisplayName = async (docId: string, displayName: string) => {
    const name = displayName.trim();
    if (!name) {
      showToast(app.toasts.enterDocName);
      return;
    }
    if (name.length > 120) {
      showToast(app.toasts.nameTooLong);
      return;
    }
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("student_my_application_documents")
      .update({ display_name: name, description: null, updated_at: now })
      .eq("id", docId)
      .eq("student_id", initial.studentId)
      .select("*")
      .single();
    if (error || !data) {
      showToast(error?.message ?? app.toasts.couldNotSaveName);
      return;
    }
    setDocuments((prev) =>
      sortApplicationDocumentsBySlotOrder(
        prev.map((d) => (d.id === docId ? data : d)),
      ),
    );
    showToast(app.toasts.docNameSaved);
  };

  const addOtherDocument = async () => {
    const slot_key = makeSupplementalOtherDocumentSlotKey();
    const { data, error } = await supabase
      .from("student_my_application_documents")
      .insert({
        student_id: initial.studentId,
        slot_key,
        display_name: "Other",
        description: null,
        status: "missing",
      })
      .select("*")
      .single();
    if (error || !data) {
      showToast(error?.message ?? app.toasts.couldNotAddDoc);
      return;
    }
    setDocuments((prev) =>
      sortApplicationDocumentsBySlotOrder([...prev, data as DocRow]),
    );
    showToast(app.toasts.addedDocRow);
  };

  const removeOtherDocument = async (doc: DocRow) => {
    if (!isOtherDocumentSlot(doc.slot_key)) return;
    const storagePath = doc.storage_path?.trim();
    const { error } = await supabase
      .from("student_my_application_documents")
      .delete()
      .eq("id", doc.id)
      .eq("student_id", initial.studentId);
    if (error) {
      showToast(error.message ?? app.toasts.couldNotRemoveDoc);
      return;
    }
    if (storagePath) {
      const { error: rmErr } = await supabase.storage
        .from("student-my-applications")
        .remove([storagePath]);
      if (rmErr) {
        console.error("[removeOtherDocument] storage remove", rmErr);
      }
    }
    setDocuments((prev) =>
      sortApplicationDocumentsBySlotOrder(
        prev.filter((d) => d.id !== doc.id),
      ),
    );
    showToast(app.toasts.docRowRemoved);
  };

  const closeEssayModal = () => {
    setEssayModal(false);
    setEssayEditingId(null);
    setEssayForm(defaultEssayForm());
  };

  const openEssayModalForAdd = () => {
    setEssayEditingId(null);
    setEssayForm(defaultEssayForm());
    setEssayModal(true);
  };

  const openEssayModalForEdit = (essay: EssayWithComments) => {
    setEssayEditingId(essay.id);
    setEssayForm(essayToForm(essay));
    setEssayModal(true);
  };

  const saveEssay = async () => {
    if (
      !essayForm.title.trim() ||
      !essayForm.for_application.trim() ||
      !essayForm.essay_type.trim()
    ) {
      showToast(app.toasts.essayRequired);
      return;
    }
    setSavingEssay(true);
    const payload = {
      title: essayForm.title.trim(),
      essay_type: essayForm.essay_type.trim(),
      for_application: essayForm.for_application.trim(),
      essay_prompt: essayForm.essay_prompt.trim() || null,
      limit_note: essayForm.limit_note.trim() || null,
      deadline: essayForm.deadline.trim()
        ? essayForm.deadline.trim().slice(0, 10)
        : null,
      instructions_note: essayForm.instructions_note.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const selectQuery = `
        *,
        student_my_application_essay_comments (
          id,
          essay_id,
          author_id,
          author_display_name,
          body,
          created_at
        )
      `;
    if (essayEditingId) {
      const { data, error } = await supabase
        .from("student_my_application_essays")
        .update(payload)
        .eq("id", essayEditingId)
        .eq("student_id", initial.studentId)
        .select(selectQuery)
        .single();
      setSavingEssay(false);
      if (error || !data) {
        showToast(error?.message ?? app.toasts.couldNotUpdateEssay);
        return;
      }
      setEssays((prev) =>
        prev.map((x) =>
          x.id === essayEditingId ? (data as EssayWithComments) : x,
        ),
      );
      closeEssayModal();
      showToast(app.toasts.essayUpdated);
      return;
    }
    const { data, error } = await supabase
      .from("student_my_application_essays")
      .insert({
        student_id: initial.studentId,
        ...payload,
        requirement_note: null,
        status: "not_started",
        body: "",
        version: 1,
      })
      .select(selectQuery)
      .single();
    setSavingEssay(false);
    if (error || !data) {
      showToast(error?.message ?? app.toasts.couldNotCreate);
      return;
    }
    setEssays((prev) => [data as EssayWithComments, ...prev]);
    closeEssayModal();
    showToast(app.toasts.essayCreated);
  };

  const deleteEssay = async (essay: EssayWithComments) => {
    setDeletingEssay(true);
    const storagePath = essay.file_storage_path?.trim();
    const { error } = await supabase
      .from("student_my_application_essays")
      .delete()
      .eq("id", essay.id)
      .eq("student_id", initial.studentId);
    if (error) {
      setDeletingEssay(false);
      showToast(error.message ?? app.toasts.couldNotDeleteEssay);
      return;
    }
    if (storagePath) {
      const { error: rmErr } = await supabase.storage
        .from("student-my-applications")
        .remove([storagePath]);
      if (rmErr) {
        console.error("[deleteEssay] storage remove", rmErr);
      }
    }
    setEssays((prev) => prev.filter((x) => x.id !== essay.id));
    if (essayDetailId === essay.id) setEssayDetailId(null);
    setEssayDeleteTarget(null);
    setDeletingEssay(false);
    showToast(app.toasts.essayDeleted);
  };

  const updateEssayStatus = async (
    essayId: string,
    status: EssayStatusSlug,
  ) => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("student_my_application_essays")
      .update({ status, updated_at: now })
      .eq("id", essayId)
      .select(
        `
        *,
        student_my_application_essay_comments (
          id,
          essay_id,
          author_id,
          author_display_name,
          body,
          created_at
        )
      `,
      )
      .single();
    if (error || !data) {
      showToast(error?.message ?? app.toasts.couldNotUpdateStatus);
      return;
    }
    setEssays((prev) =>
      prev.map((x) =>
        x.id === essayId ? (data as EssayWithComments) : x,
      ),
    );
  };

  const uploadEssayFile = async (essayId: string, file: File) => {
    const safeName = file.name.replace(/[^\w.\-()+ ]/g, "_");
    const path = `${initial.studentId}/essays/${essayId}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("student-my-applications")
      .upload(path, file, { upsert: true });
    if (upErr) {
      showToast(upErr.message);
      return;
    }
    const now = new Date().toISOString();
    const essay = essays.find((x) => x.id === essayId);
    const wasNotStarted = essay?.status === "not_started";
    const bumpStatus = wasNotStarted
      ? ({ status: "in_progress" as const } as const)
      : {};
    const { data, error } = await supabase
      .from("student_my_application_essays")
      .update({
        file_storage_path: path,
        file_name: file.name,
        file_uploaded_at: now,
        updated_at: now,
        ...bumpStatus,
      })
      .eq("id", essayId)
      .select(
        `
        *,
        student_my_application_essay_comments (
          id,
          essay_id,
          author_id,
          author_display_name,
          body,
          created_at
        )
      `,
      )
      .single();
    if (error || !data) {
      showToast(error?.message ?? app.toasts.couldNotSaveFile);
      return;
    }
    setEssays((prev) =>
      prev.map((x) => (x.id === essayId ? (data as EssayWithComments) : x)),
    );
    showToast(
      wasNotStarted
        ? app.toasts.fileUploadedInProgress
        : app.toasts.fileUploaded,
    );
  };

  const openEssayFile = async (essayId: string) => {
    const res = await getStudentEssayFileViewUrl(essayId);
    if ("error" in res && res.error) {
      showToast(res.error);
      return;
    }
    if ("url" in res) window.open(res.url, "_blank", "noopener,noreferrer");
  };

  const sendRecRequest = async () => {
    if (sendingRecRequest) return;

    setSendingRecRequest(true);
    try {
      const res = await createRecommendationRequest({
        teacher_name: recForm.teacher_name,
        teacher_subject: recForm.teacher_subject || null,
        teacher_email: recForm.teacher_email,
        for_application: recForm.for_application,
        personal_note: recForm.personal_note || null,
        needed_by: recForm.needed_by,
      });
      if ("error" in res) {
        showToast(res.error);
        return;
      }
      setRecs((prev) => [res.row, ...prev]);
      setRecModal(false);
      setRecForm({
        teacher_name: "",
        teacher_subject: "",
        teacher_email: "",
        for_application: "",
        personal_note: "",
        needed_by: "",
      });
      showToast(
        app.toasts.requestSentToast.replace("{name}", res.row.teacher_name),
      );
    } finally {
      setSendingRecRequest(false);
    }
  };

  const resendRecRequest = async (recommendationId: string, teacherName: string) => {
    const res = await resendRecommendationRequestEmail(recommendationId);
    if ("error" in res) {
      showToast(res.error);
      return;
    }
    showToast(
      app.toasts.reminderSentToast.replace("{teacherName}", teacherName),
    );
  };

  const viewRecLetter = async (recommendationId: string) => {
    const res = await getRecommendationLetterViewUrl(recommendationId);
    if ("error" in res) {
      showToast(res.error);
      return;
    }
    window.open(res.url, "_blank", "noopener,noreferrer");
  };

  const toggleTask = async (task: TaskRow) => {
    const next = !task.completed;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("student_my_application_tasks")
      .update({
        completed: next,
        completed_at: next ? now : null,
        updated_at: now,
      })
      .eq("id", task.id)
      .select("*")
      .single();
    if (error || !data) {
      showToast(error?.message ?? app.toasts.updateFailed);
      return;
    }
    setTasks((prev) => prev.map((x) => (x.id === task.id ? data : x)));
  };

  const fieldClass =
    "box-border w-full min-w-0 max-w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 text-[13px] text-[var(--text)] outline-none focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.07)]";
  const labelClass =
    "text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-mid)]";
  const fieldWrapClass = "flex min-w-0 flex-col gap-1.5";
  const panelClass =
    "mb-3.5 min-w-0 overflow-x-clip rounded-[14px] border border-[var(--border-light)] bg-white";
  const panelHeadClass =
    "flex min-w-0 flex-col gap-3 border-b border-[var(--border-light)] px-5 py-4 md:flex-row md:items-start md:justify-between md:gap-4";
  const panelBodyClass = "min-w-0 px-5 py-5 sm:py-[18px]";

  const missingDocs = documents.filter(
    (d) => d.status === "missing" && !isOtherDocumentSlot(d.slot_key),
  ).length;

  const coreDocuments = useMemo(
    () => documents.filter((d) => !isOtherDocumentSlot(d.slot_key)),
    [documents],
  );
  const otherDocuments = useMemo(
    () =>
      sortApplicationDocumentsBySlotOrder(
        documents.filter((d) => isOtherDocumentSlot(d.slot_key)),
      ),
    [documents],
  );

  const universitiesTabCount = useMemo(
    () => shortlist.length + favourites.length,
    [shortlist.length, favourites.length],
  );

  return (
    <div className="mx-auto min-w-0 max-w-full pb-14 text-[var(--text)]">
      <div className="mb-[18px]">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--green)]">
          {app.workspaceLabel}
        </div>
        <h1 className="font-[family-name:var(--font-dm-serif)] font-bold text-[28px] leading-tight tracking-tight text-[var(--text)] sm:text-[30px]">
          {app.pageTitle}
        </h1>
        <p className="mt-1.5 max-w-[680px] text-sm leading-relaxed text-[var(--text-mid)]">
          {app.pageSubtitle}
        </p>
      </div>

      <div className="relative mb-[18px] flex flex-col gap-3 overflow-hidden rounded-[14px] bg-gradient-to-br from-[var(--green-dark)] to-[var(--green)] px-5 py-5 text-white md:flex-row md:items-center md:gap-[18px]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative z-[1] min-w-0 flex-1">
          <div className="font-[family-name:var(--font-dm-serif)] text-lg leading-snug">
            {app.completionTitle.replace("{pct}", String(pct))}
          </div>
          <div className="mt-1 text-[12.5px] text-white/70">
            {completionSubtitle}
          </div>
        </div>
        <div className="relative z-[1] flex flex-col items-start gap-1.5 md:items-end">
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

      <div className="mb-4 flex snap-x snap-mandatory gap-0.5 overflow-x-auto rounded-[10px] border border-[var(--border-light)] bg-white p-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-[var(--border)]">
        {(
          [
            ["profile", app.tabs.profile, null],
            ["universities", app.tabs.universities, universitiesTabCount],
            ["documents", app.tabs.documents, missingDocs > 0 ? missingDocs : null],
            ["essays", app.tabs.essays, null],
            ["recommendations", app.tabs.recommendations, null],
            ["tasks", app.tabs.tasks, openTasks > 0 ? openTasks : null],
          ] as const
        ).map(([id, label, badge]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-[7px] px-2.5 py-1.5 text-[12px] font-medium transition-colors sm:px-3.5 sm:py-2 sm:text-[12.5px] ${
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
        <div className="animate-[my-apps-fade-in_0.2s_ease] min-w-0">
          <CalloutInfo>
            <strong>{app.profileWhyTitle}</strong> {app.profileWhyText}
          </CalloutInfo>

          <div className={panelClass}>
            <div className={panelHeadClass}>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-tight">
                  {app.aboutYou}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  {app.aboutYouSub}
                </div>
              </div>
            </div>
            <div className={panelBodyClass}>
              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
                <div className={fieldWrapClass}>
                  <label className={labelClass}>{app.firstName}</label>
                  <input
                    className={fieldClass}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className={fieldWrapClass}>
                  <label className={labelClass}>{app.lastName}</label>
                  <input
                    className={fieldClass}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div className={fieldWrapClass}>
                  <label className={labelClass}>{app.schoolEmail}</label>
                  <input
                    className={`${fieldClass} bg-[var(--cream)] text-[var(--text-light)]`}
                    value={initial.profile.email}
                    disabled
                  />
                </div>
                <div className={fieldWrapClass}>
                  <label className={labelClass}>{app.grade}</label>
                  <select
                    className={fieldClass}
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                  >
                    <option value="">{app.select}</option>
                    {gradeSelectOptions.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={`${fieldWrapClass} md:col-span-2`}>
                  <label className={labelClass}>{app.curriculum}</label>
                  <select
                    className={fieldClass}
                    value={curriculum}
                    onChange={(e) => setCurriculum(e.target.value)}
                  >
                    <option value="">{app.select}</option>
                    {CURRICULUM_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={`${fieldWrapClass} md:col-span-2`}>
                  <label className={labelClass}>{app.nationality}</label>
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
                <div className={`${fieldWrapClass} md:col-span-2`}>
                  <label className={labelClass}>{app.targetIntake}</label>
                  <select
                    className={fieldClass}
                    value={targetIntake}
                    onChange={(e) => setTargetIntake(e.target.value)}
                  >
                    <option value="">{app.select}</option>
                    {TARGET_INTAKE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end border-t border-[var(--border-light)] pt-4">
                <button
                  type="button"
                  className="w-full rounded-lg border border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[13px] font-semibold text-white hover:border-[var(--green-dark)] hover:bg-[var(--green-dark)] sm:w-auto"
                  onClick={() => void saveAbout()}
                >
                  {app.saveChanges}
                </button>
              </div>
            </div>
          </div>

          <div className={panelClass}>
            <div className={panelHeadClass}>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-tight">
                  {app.yourGoals}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  {app.yourGoalsSub}
                </div>
              </div>
            </div>
            <div className={panelBodyClass}>
              <PreferredDestinationsMultiSelect
                labelClass={labelClass}
                fieldClass={fieldClass}
                values={destinations}
                onChange={setDestinations}
              />
              <div className="mt-3.5">
                <TagField
                  label={app.interestedPrograms}
                  labelTooltip={app.programsTooltip}
                  values={programs}
                  onChange={setPrograms}
                  placeholder={app.addProgram}
                />
              </div>
              <div className="mt-3.5 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
                <div className={fieldWrapClass}>
                  <label className={labelClass}>{app.budgetRange}</label>
                  <select
                    className={fieldClass}
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                  >
                    <option value="">{app.select}</option>
                    {BUDGET_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={fieldWrapClass}>
                  <label className={labelClass}>{app.needAid}</label>
                  <select
                    className={fieldClass}
                    value={needAid}
                    onChange={(e) => setNeedAid(e.target.value)}
                  >
                    <option value="">{app.select}</option>
                    {AID_OPTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end border-t border-[var(--border-light)] pt-4">
                <button
                  type="button"
                  className="w-full rounded-lg border border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[13px] font-semibold text-white hover:border-[var(--green-dark)] hover:bg-[var(--green-dark)] sm:w-auto"
                  onClick={() => void saveGoals()}
                >
                  {app.saveGoals}
                </button>
              </div>
            </div>
          </div>

          <div className={panelClass}>
            <div className={panelHeadClass}>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-tight">
                  {app.testScores}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  {app.testScoresSub}
                </div>
              </div>
            </div>
            <div className={panelBodyClass}>
              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
                <div className={fieldWrapClass}>
                  <label className={labelClass}>{app.ielts}</label>
                  <input
                    className={`${fieldClass} ${
                      ieltsScoreInvalid
                        ? "border-[#c0392b] shadow-[0_0_0_3px_rgba(192,57,43,0.12)]"
                        : ""
                    }`}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder={`e.g. 7.5 (${IELTS_SCORE_MIN}–${IELTS_SCORE_MAX})`}
                    value={ieltsScore}
                    onChange={(e) =>
                      setIeltsScore(sanitizeIeltsScoreInput(e.target.value))
                    }
                    onBlur={() =>
                      setIeltsScore((s) => (s.trim() ? clampIeltsScoreOnBlur(s) : ""))
                    }
                    aria-invalid={ieltsScoreInvalid}
                  />
                </div>
                <div className={fieldWrapClass}>
                  <label className={labelClass}>{app.toefl}</label>
                  <input
                    className={`${fieldClass} ${
                      toeflScoreInvalid
                        ? "border-[#c0392b] shadow-[0_0_0_3px_rgba(192,57,43,0.12)]"
                        : ""
                    }`}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={`e.g. 102 (${TOEFL_SCORE_MIN}–${TOEFL_SCORE_MAX})`}
                    value={toeflScore}
                    onChange={(e) =>
                      setToeflScore(sanitizeToeflScoreInput(e.target.value))
                    }
                    onBlur={() =>
                      setToeflScore((s) => (s.trim() ? clampToeflScoreOnBlur(s) : ""))
                    }
                    aria-invalid={toeflScoreInvalid}
                  />
                </div>
                <div className={fieldWrapClass}>
                  <label className={labelClass}>{app.sat}</label>
                  <input
                    className={`${fieldClass} ${
                      satScoreInvalid
                        ? "border-[#c0392b] shadow-[0_0_0_3px_rgba(192,57,43,0.12)]"
                        : ""
                    }`}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={`e.g. 1480 (${SAT_SCORE_MIN}–${SAT_SCORE_MAX})`}
                    value={satScore}
                    onChange={(e) =>
                      setSatScore(sanitizeSatScoreInput(e.target.value))
                    }
                    onBlur={() =>
                      setSatScore((s) => (s.trim() ? clampSatScoreOnBlur(s) : ""))
                    }
                    aria-invalid={satScoreInvalid}
                  />
                </div>
                <div className={fieldWrapClass}>
                  <label className={labelClass}>{app.act}</label>
                  <input
                    className={`${fieldClass} ${
                      actScoreInvalid
                        ? "border-[#c0392b] shadow-[0_0_0_3px_rgba(192,57,43,0.12)]"
                        : ""
                    }`}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={`e.g. 32 (${ACT_SCORE_MIN}–${ACT_SCORE_MAX})`}
                    value={actScore}
                    onChange={(e) =>
                      setActScore(sanitizeActScoreInput(e.target.value))
                    }
                    onBlur={() =>
                      setActScore((s) => (s.trim() ? clampActScoreOnBlur(s) : ""))
                    }
                    aria-invalid={actScoreInvalid}
                  />
                </div>
                <div className={`${fieldWrapClass} md:col-span-2`}>
                  <label className={labelClass}>
                    {app.predictedGrades}
                  </label>
                  <input
                    className={`${fieldClass} ${predictedGradesLocked ? "bg-[var(--cream)] text-[var(--text-light)]" : ""}`}
                    value={predictedGrades}
                    onChange={(e) => setPredictedGrades(e.target.value)}
                    disabled={predictedGradesLocked}
                  />
                  {predictedGradesLocked ? (
                    <p className="text-[11.5px] leading-snug text-[var(--text-hint)]">
                      {app.predictedLocked}
                    </p>
                  ) : null}
                </div>
                <div className={`${fieldWrapClass} md:col-span-2`}>
                  <label className={labelClass}>
                    {app.otherTests}
                  </label>
                  <input
                    className={fieldClass}
                    placeholder={app.otherTestsPlaceholder}
                    value={otherTests}
                    onChange={(e) => setOtherTests(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end border-t border-[var(--border-light)] pt-4">
                <button
                  type="button"
                  className="w-full rounded-lg border border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[13px] font-semibold text-white hover:border-[var(--green-dark)] hover:bg-[var(--green-dark)] sm:w-auto"
                  onClick={() => void saveScores()}
                >
                  {app.saveScores}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "universities" ? (
        <div className="animate-[my-apps-fade-in_0.2s_ease] min-w-0">
          <CalloutInfo>{app.universitiesHint}</CalloutInfo>

          <div className={panelClass}>
            <div className={panelHeadClass}>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-tight">
                  {app.favorites}{" "}
                  <span className="font-normal text-[var(--text-light)]">
                    ({favourites.length})
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  {app.favoritesSub}
                </div>
              </div>
            </div>
            <div className={`${panelBodyClass} space-y-2`}>
              {favourites.length === 0 ? (
                <p className="text-sm text-[var(--text-mid)]">
                  {app.noFavorites}
                </p>
              ) : (
                favourites.map((u) => (
                  <div
                    key={u.uniId}
                    className=" relative flex flex-col gap-2 rounded-[10px] border border-[var(--border-light)] bg-white p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <button
                      type="button"
                      className="absolute cursor-pointer right-0 top-0 z-10 flex h-5 w-5 items-center justify-center rounded-md text-[var(--text-hint)] transition-colors hover:bg-[var(--cream)] hover:text-[var(--text-mid)]"
                      aria-label={app.removeFavoriteAria.replace("{name}", u.name)}
                      title={app.removeFavoriteTitle}
                      onClick={() => setRemoveFavouriteTarget(u)}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        aria-hidden
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="flex min-w-0 flex-1 items-start gap-3 pr-6">
                      <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-[#fffbeb] text-[#b8860b]">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          aria-hidden
                        >
                          <path d="M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13.5px] font-semibold">
                            {u.name}
                          </span>
                          <span className="rounded-full bg-[#fffbeb] px-2 py-0.5 text-[10px] font-semibold text-[#8a6d1b]">
                            {app.catalog}
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
                        </div>
                      </div>
                    </div>
                    <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
                      <Link
                        href={`/student/universities/${u.uniId}`}
                        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]"
                      >
                        {app.viewInCatalog}
                      </Link>
                      <button
                        type="button"
                        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-[var(--green-dark)]"
                        onClick={() => setMoveToShortlistTarget(u)}
                      >
                        {app.moveToShortlist}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={panelClass}>
            <div className={panelHeadClass}>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-tight">
                  {app.shortlist}{" "}
                  <span className="font-normal text-[var(--text-light)]">
                    ({shortlist.length})
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  {app.shortlistSub}
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
                {app.addUniversity}
              </button>
            </div>
            <div className={`${panelBodyClass} space-y-2`}>
              {shortlist.length === 0 ? (
                <p className="text-sm text-[var(--text-mid)]">
                  {favourites.length > 0
                    ? app.noShortlistWithFavorites
                    : app.noShortlist}
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
                        </div>
                      </div>
                    </div>
                    <div className="flex w-full min-w-0 flex-col gap-2 lg:max-w-[min(100%,420px)] lg:flex-1 lg:flex-row lg:items-end lg:gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wide text-[var(--text-hint)]">
                          {app.status}
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
                              {app.statusLabels[s] ?? s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wide text-[var(--text-hint)]">
                          {app.decision}
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
                              {app.decisionLabels[d] ?? d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="inline-flex w-full shrink-0 items-center justify-center self-stretch rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[11.5px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[#f0c4c4] hover:bg-[#FCEBEB] hover:text-[var(--red)] lg:w-auto lg:self-end"
                        onClick={() => void removeUniversity(u.id)}
                      >
                        {app.removeFromShortlist}
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
        <div className="animate-[my-apps-fade-in_0.2s_ease] min-w-0">
          <CalloutInfo>{app.documentsHint}</CalloutInfo>
          <div className={panelClass}>
            <div className={panelHeadClass}>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-tight">
                  {app.documentChecklist}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  {app.documentChecklistSub}
                </div>
              </div>
            </div>
            <div className={`${panelBodyClass} space-y-2`}>
              {coreDocuments.map((d) => (
                <DocumentRow
                  key={d.id}
                  doc={d}
                  locale={locale}
                  onPickFile={(file) => void uploadDocument(d, file)}
                />
              ))}
            </div>
          </div>

          <div className={panelClass}>
            <div className={panelHeadClass}>
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold tracking-tight">
                    {app.otherDocuments}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--text-light)]">
                    {app.otherDocumentsSub}
                  </div>
                </div>
                <button
                  type="button"
                  className={`${btnSmClass(false)} shrink-0 self-start sm:mt-0.5`}
                  onClick={() => void addOtherDocument()}
                >
                  {app.addAnotherDocument}
                </button>
              </div>
            </div>
            <div className={`${panelBodyClass} space-y-2`}>
              {otherDocuments.length > 0 ? (
                otherDocuments.map((d) => (
                  <DocumentRow
                    key={d.id}
                    doc={d}
                    locale={locale}
                    onPickFile={(file) => void uploadDocument(d, file)}
                    allowDisplayNameEdit
                    onSaveDisplayName={(name) =>
                      void saveOtherDocumentDisplayName(d.id, name)
                    }
                    allowRemove
                    onRemove={() => void removeOtherDocument(d)}
                  />
                ))
              ) : (
                <p className="text-sm text-[var(--text-mid)]">
                  {app.noOtherDocuments}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "essays" ? (
        <div className="animate-[my-apps-fade-in_0.2s_ease] min-w-0">
          <CalloutInfo>{app.essaysHint}</CalloutInfo>
          <div className={panelClass}>
            <div className={panelHeadClass}>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold tracking-tight">
                  {app.yourEssays}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  {app.yourEssaysSub}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <Link
                  href="/student/essay-review"
                  className={`${btnSmClass(false)} text-inherit no-underline`}
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
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  {app.essayReview}
                </Link>
                <button
                  type="button"
                  className={btnSmClass(true)}
                  onClick={openEssayModalForAdd}
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
                  {app.addEssay}
                </button>
              </div>
            </div>
            <div className={`${panelBodyClass} flex flex-col gap-2`}>
              {essays.length === 0 ? (
                <p className="text-sm text-[var(--text-mid)]">
                  {shortlistHintUniversities.length > 0
                    ? app.noEssaysYet
                    : app.noEssays}
                </p>
              ) : null}
              {essays.map((e) => {
                const comments = e.student_my_application_essay_comments ?? [];
                const hasFile = Boolean(e.file_storage_path && e.file_name);
                const st = e.status as EssayStatusSlug;
                return (
                  <div
                    key={e.id}
                    className={`flex flex-col gap-3 rounded-[10px] border px-3.5 py-3.5 transition-colors hover:border-[var(--border)] lg:flex-row lg:items-start ${studentEssayRowTone(st, hasFile)}`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${studentEssayIconWrap(st, hasFile)}`}
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
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold leading-snug text-[var(--text)]">
                        {e.title}
                      </div>
                      <div className="mt-1 text-[11.5px] leading-relaxed text-[var(--text-light)]">
                        <span className="font-medium text-[var(--text-mid)]">{app.forLabel}</span>{" "}
                        {e.for_application ?? "—"}
                        {e.essay_type ? <> · {e.essay_type}</> : null}
                        {e.limit_note ? <> · {app.limit} {e.limit_note}</> : null}
                        {e.deadline ? <> · {app.due} {formatDate(e.deadline, locale)}</> : null}
                      </div>
                      {e.essay_prompt?.trim() ? (
                        <div className="mt-2 line-clamp-2 text-[12px] text-[var(--text-mid)]">
                          {e.essay_prompt.trim()}
                        </div>
                      ) : null}
                      <div
                        className={`mt-2 flex items-center gap-1.5 text-[12px] ${hasFile ? "text-[var(--text-mid)]" : "italic text-[var(--text-hint)]"}`}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="shrink-0"
                          aria-hidden
                        >
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                        </svg>
                        {hasFile ? (
                          <span>
                            <span className="font-medium text-[var(--text)]">{e.file_name}</span>
                            {e.file_uploaded_at ? <> · {formatDate(e.file_uploaded_at, locale)}</> : null}
                          </span>
                        ) : (
                          <span>{app.noFileUploaded}</span>
                        )}
                      </div>
                      {comments.length > 0 ? (
                        <div className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[var(--green)]">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                          </svg>
                          {comments.length === 1
                            ? app.counselorComments.replace("{count}", String(comments.length))
                            : app.counselorCommentsPlural.replace("{count}", String(comments.length))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex w-full shrink-0 flex-col gap-1.5 lg:w-[170px]">
                      <select
                        className={`w-full cursor-pointer rounded-md border-[1.5px] px-2.5 py-1.5 text-[11.5px] font-semibold outline-none focus:border-[var(--green-light)] ${studentStatusSelectCls(st)}`}
                        value={st}
                        onChange={(ev) =>
                          void updateEssayStatus(e.id, ev.target.value as EssayStatusSlug)
                        }
                        aria-label={app.essayStatusAria}
                      >
                        {ESSAY_STATUSES.map((v) => (
                          <option key={v} value={v}>
                            {app.essayStatusLabels[v]}
                          </option>
                        ))}
                      </select>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className={studentEssayBtnRow(false)}
                          onClick={() => openEssayModalForEdit(e)}
                        >
                          {app.edit}
                        </button>
                        <button
                          type="button"
                          className={studentEssayBtnRow(false, true)}
                          onClick={() => setEssayDeleteTarget(e)}
                        >
                          {app.delete}
                        </button>
                        <button
                          type="button"
                          className={studentEssayBtnRow(false)}
                          onClick={() => {
                            setEssayDetailId(e.id);
                          }}
                        >
                          {app.detail}
                        </button>
                        <label className={studentEssayBtnRow(true) + " cursor-pointer"}>
                          <input
                            type="file"
                            className="sr-only"
                            onChange={(ev) => {
                              const f = ev.target.files?.[0];
                              ev.target.value = "";
                              if (f) void uploadEssayFile(e.id, f);
                            }}
                          />
                          {app.upload}
                        </label>
                      </div>
                      {hasFile ? (
                        <button
                          type="button"
                          className={studentEssayBtnRow(false)}
                          onClick={() => void openEssayFile(e.id)}
                        >
                          {app.viewFile}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {shortlistHintUniversities.length > 0 ? (
                <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--border-light)] bg-[var(--cream)] px-3.5 py-3 md:flex-row md:items-center">
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
                      {app.needEssaysFor}{" "}
                      {shortlistHintUniversities
                        .map((u) => u.university_name)
                        .join(", ")}
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-[var(--text-light)]">
                      {app.needEssaysHint}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "recommendations" ? (
        <div className="animate-[my-apps-fade-in_0.2s_ease] min-w-0">
          <CalloutInfo>{app.recHint}</CalloutInfo>
          <div className={panelClass}>
            <div className={panelHeadClass}>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-tight">
                  {app.recommendationLetters}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  {app.recSub}
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
                {app.requestLetter}
              </button>
            </div>
            <div className={`${panelBodyClass} space-y-[7px]`}>
              {recs.length === 0 ? (
                <p className="text-sm text-[var(--text-mid)]">
                  {app.noRequests}
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
                        ? app.submittedOn.replace(
                            "{date}",
                            formatShortMonthDay(r.submitted_at, locale),
                          )
                        : app.recStatusLabels.submitted
                      : r.status === "drafting"
                        ? app.draftingInProgress
                        : app.awaitingResponse;
                  const teacherLine = `${r.teacher_name}${r.teacher_subject?.trim() ? ` (${r.teacher_subject.trim()})` : ""}`;
                  const pill =
                    r.status === "submitted" ? (
                      <StatusPill
                        variant="green"
                        label={app.recStatusLabels.submitted}
                      />
                    ) : r.status === "drafting" ? (
                      <StatusPill
                        variant="amber"
                        label={app.recStatusLabels.drafting}
                      />
                    ) : (
                      <StatusPill
                        variant="red"
                        label={app.recStatusLabels.pending}
                      />
                    );
                  const action =
                    r.status === "submitted" ? (
                      <button
                        type="button"
                        className={btnSmClass(false)}
                        onClick={() => void viewRecLetter(r.id)}
                      >
                        {app.view}
                      </button>
                    ) : r.status === "drafting" ? (
                      <button
                        type="button"
                        className={btnSmClass(false)}
                        onClick={() =>
                          showToast(
                            app.toasts.nudgeSent.replace(
                              "{name}",
                              r.teacher_name,
                            ),
                          )
                        }
                      >
                        {app.nudge}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={btnSmClass(false)}
                        onClick={() =>
                          void resendRecRequest(r.id, r.teacher_name)
                        }
                      >
                        {app.resend}
                      </button>
                    );
                  return (
                    <div
                      key={r.id}
                      className="flex flex-col gap-3 rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3 transition-colors hover:border-[var(--border)] md:flex-row md:items-center"
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
                        <div className="mt-0.5 break-words text-[11.5px] leading-snug text-[var(--text-light)]">
                          {app.forRecLabel} {r.for_application} · {app.requestedLabel}{" "}
                          {formatShortMonthDay(r.requested_at, locale)} · {metaTail}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
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
                {app.recTipsTitle}
              </div>
            </div>
            <div className={`${panelBodyClass} pt-2`}>
              <div className="flex flex-col gap-2 text-[13px] leading-[1.55] text-[var(--text-mid)]">
                <div className="flex gap-2.5">
                  <span className="shrink-0 font-bold text-[var(--green)]">
                    →
                  </span>
                  <div>
                    <strong>{app.recTip1Title}</strong> {app.recTip1}
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <span className="shrink-0 font-bold text-[var(--green)]">
                    →
                  </span>
                  <div>
                    <strong>{app.recTip2Title}</strong> {app.recTip2}
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <span className="shrink-0 font-bold text-[var(--green)]">
                    →
                  </span>
                  <div>
                    <strong>{app.recTip3Title}</strong> {app.recTip3}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "tasks" ? (
        <div className="animate-[my-apps-fade-in_0.2s_ease] min-w-0">
          <CalloutInfo>
            {app.tasksHint.replace(
              "{name}",
              counselorDisplayName ?? app.yourCounselor,
            )}
          </CalloutInfo>
          <div className={panelClass}>
            <div className={panelHeadClass}>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-tight">
                  {app.tasksFromCounselor}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  {app.openTasks.replace("{count}", String(openTasks))}
                  {tasksDueThisWeek > 0
                    ? app.dueThisWeek.replace(
                        "{count}",
                        String(tasksDueThisWeek),
                      )
                    : ""}
                </div>
              </div>
            </div>
            <div className={`${panelBodyClass} space-y-[7px]`}>
              {tasks.length === 0 ? (
                <p className="text-sm text-[var(--text-mid)]">{app.noTasks}</p>
              ) : (
                tasks.map((task) => {
                  const overdue = isTaskDueOverdue(task.due_date, task.completed);
                  const assignLabel = task.assigned_by_name?.trim()
                    ? app.assignedBy.replace(
                        "{name}",
                        task.assigned_by_name.trim(),
                      )
                    : app.selfAssigned;
                  const priorityPill =
                    task.priority === "high" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(231,76,60,0.12)] px-[7px] py-px text-[10px] font-bold text-[#8c2d22]">
                        <span
                          className="h-1 w-1 shrink-0 rounded-full bg-[var(--red)]"
                          aria-hidden
                        />
                        {app.high}
                      </span>
                    ) : task.priority === "medium" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(212,162,42,0.14)] px-[7px] py-px text-[10px] font-bold text-[#7a5d10]">
                        <span
                          className="h-1 w-1 shrink-0 rounded-full bg-[#D4A22A]"
                          aria-hidden
                        />
                        {app.medium}
                      </span>
                    ) : task.priority === "low" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#ECEAE5] px-[7px] py-px text-[10px] font-bold text-[var(--text-mid)]">
                        <span
                          className="h-1 w-1 shrink-0 rounded-full bg-[#a0a0a0]"
                          aria-hidden
                        />
                        {app.low}
                      </span>
                    ) : null;
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => void toggleTask(task)}
                      className={`flex w-full cursor-pointer items-start gap-3 rounded-[10px] border border-[var(--border-light)] px-3.5 py-3 text-left transition-colors hover:border-[var(--border)] ${
                        task.completed ? "bg-[var(--cream)]" : "bg-white"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-[var(--border)] bg-white ${
                          task.completed
                            ? "border-[var(--green-bright)] bg-[var(--green-bright)]"
                            : ""
                        }`}
                      >
                        {task.completed ? (
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
                          className={`text-[13.5px] font-semibold ${task.completed ? "text-[var(--text-light)] line-through" : ""}`}
                        >
                          {task.title}
                        </div>
                        {task.notes?.trim() ? (
                          <p
                            className={`mt-1 whitespace-pre-wrap text-[12px] leading-snug text-[var(--text-mid)] ${
                              task.completed
                                ? "text-[var(--text-hint)] line-through"
                                : ""
                            }`}
                          >
                            {task.notes.trim()}
                          </p>
                        ) : null}
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-[var(--text-light)]">
                          <span>{assignLabel}</span>
                          {priorityPill}
                          {!task.completed && task.due_date ? (
                            <span
                              className={
                                overdue
                                  ? "font-medium text-[var(--red)]"
                                  : undefined
                              }
                            >
                              {app.dueDate.replace(
                                "{date}",
                                formatDate(task.due_date, locale),
                              )}
                              {overdue ? app.overdue : ""}
                            </span>
                          ) : null}
                          {task.completed && task.completed_at ? (
                            <span className="text-[var(--text-light)]">
                              {app.completed.replace(
                                "{date}",
                                formatDate(task.completed_at, locale),
                              )}
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
        <ModalVeil onClose={() => setUniModal(false)} title={app.addUniversityModal}>
          <div className="flex flex-col gap-3.5">
            <div>
              <label className={labelClass}>{app.universityName}</label>
              <input
                className={`${fieldClass} mt-1.5 w-full`}
                value={uniForm.university_name}
                onChange={(e) =>
                  setUniForm((f) => ({ ...f, university_name: e.target.value }))
                }
                placeholder={app.universityNamePlaceholder}
              />
            </div>
            <div>
              <label className={labelClass}>{app.universityLocation}</label>
              <select
                className={`${fieldClass} mt-1.5 w-full`}
                value={uniForm.country}
                onChange={(e) =>
                  setUniForm((f) => ({ ...f, country: e.target.value }))
                }
              >
                <option value="">{app.selectCountry}</option>
                {initial.countries.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{app.majorProgram}</label>
              <input
                className={`${fieldClass} mt-1.5 w-full`}
                value={uniForm.major_program}
                onChange={(e) =>
                  setUniForm((f) => ({ ...f, major_program: e.target.value }))
                }
                placeholder={app.majorProgramPlaceholder}
              />
            </div>
            <div>
              <label className={labelClass}>{app.howToApply}</label>
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
                <option value="">{app.selectApplicationSystem}</option>
                {APPLICATION_METHOD_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{app.deadlineOptional}</label>
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
          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--border-light)] bg-[var(--cream)] px-[22px] py-3.5 -mx-[22px] -mb-[18px] rounded-b-[14px] sm:flex-row sm:justify-end">
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)]"
              onClick={() => setUniModal(false)}
            >
              {app.cancel}
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[var(--green-dark)]"
              onClick={() => void addUniversity()}
            >
              {app.addToShortlist}
            </button>
          </div>
        </ModalVeil>
      ) : null}

      {moveToShortlistTarget ? (
        <MoveToShortlistModal
          university={moveToShortlistTarget}
          onClose={() => setMoveToShortlistTarget(null)}
          onConfirm={(majorProgram) =>
            moveFavouriteToShortlist(moveToShortlistTarget, majorProgram)
          }
        />
      ) : null}

      {removeFavouriteTarget ? (
        <ModalVeil
          title={app.removeFavoriteTitle}
          onClose={() => {
            if (!removingFavourite) setRemoveFavouriteTarget(null);
          }}
        >
          <div className="flex flex-col gap-5">
            <p className="text-[13.5px] leading-relaxed text-[var(--text)]">
              {app.removeFavoriteConfirm.replace(
                "{name}",
                removeFavouriteTarget.name,
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-[8px] border border-[var(--border)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] disabled:opacity-50"
                onClick={() => setRemoveFavouriteTarget(null)}
                disabled={removingFavourite}
              >
                {app.cancel}
              </button>
              <button
                type="button"
                className="rounded-[8px] border border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[var(--green-dark)] disabled:opacity-50"
                onClick={() => void removeFavourite(removeFavouriteTarget)}
                disabled={removingFavourite}
              >
                {removingFavourite ? app.removing : app.remove}
              </button>
            </div>
          </div>
        </ModalVeil>
      ) : null}

      {essayDeleteTarget ? (
        <ModalVeil
          title={app.deleteEssay}
          onClose={() => {
            if (!deletingEssay) setEssayDeleteTarget(null);
          }}
        >
          <div className="flex flex-col gap-5">
            <p className="text-[13.5px] leading-relaxed text-[var(--text)]">
              {essayDeleteTarget.file_name
                ? app.deleteEssayConfirmWithFile.replace(
                    "{title}",
                    essayDeleteTarget.title,
                  )
                : app.deleteEssayConfirmNoFile.replace(
                    "{title}",
                    essayDeleteTarget.title,
                  )}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-[8px] border border-[var(--border)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] disabled:opacity-50"
                onClick={() => setEssayDeleteTarget(null)}
                disabled={deletingEssay}
              >
                {app.cancel}
              </button>
              <button
                type="button"
                className="rounded-[8px] border border-[#c0392b] bg-[#c0392b] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[#a93226] disabled:opacity-50"
                onClick={() => void deleteEssay(essayDeleteTarget)}
                disabled={deletingEssay}
              >
                {deletingEssay ? app.deleting : app.deleteEssay}
              </button>
            </div>
          </div>
        </ModalVeil>
      ) : null}

      {essayModal ? (
        <ModalVeil
          onClose={closeEssayModal}
          title={
            essayEditingId ? app.editEssay : app.addEssayRequirement
          }
        >
          <div className="flex flex-col gap-3.5">
            <div>
              <label className={`${labelClass} mb-1.5 block uppercase tracking-[0.05em]`}>
                {app.essayTitle} <span className="text-[var(--red)]">*</span>
              </label>
              <input
                className={`${fieldClass} w-full`}
                value={essayForm.title}
                onChange={(e) =>
                  setEssayForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder={app.essayTitlePlaceholder}
              />
            </div>
            <div>
              <label className={`${labelClass} mb-1.5 block uppercase tracking-[0.05em]`}>
                {app.essayUniversity} <span className="text-[var(--red)]">*</span>
              </label>
              <input
                className={`${fieldClass} w-full`}
                value={essayForm.for_application}
                onChange={(e) =>
                  setEssayForm((f) => ({
                    ...f,
                    for_application: e.target.value,
                  }))
                }
                placeholder={app.essayUniversityPlaceholder}
              />
            </div>
            <div>
              <label className={`${labelClass} mb-1.5 block uppercase tracking-[0.05em]`}>
                {app.essayType} <span className="text-[var(--red)]">*</span>
              </label>
              <select
                className={`${fieldClass} w-full`}
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
              <label className={`${labelClass} mb-1.5 block uppercase tracking-[0.05em]`}>
                {app.essayPromptLabel}
              </label>
              <textarea
                className={`${fieldClass} min-h-[80px] w-full resize-y`}
                value={essayForm.essay_prompt}
                onChange={(e) =>
                  setEssayForm((f) => ({ ...f, essay_prompt: e.target.value }))
                }
                placeholder={app.essayPromptPlaceholder}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={`${labelClass} mb-1.5 block uppercase tracking-[0.05em]`}>
                  {app.wordCharCount}
                </label>
                <input
                  className={`${fieldClass} w-full`}
                  value={essayForm.limit_note}
                  onChange={(e) =>
                    setEssayForm((f) => ({ ...f, limit_note: e.target.value }))
                  }
                  placeholder={app.wordCharCountPlaceholder}
                />
              </div>
              <div>
                <label className={`${labelClass} mb-1.5 block uppercase tracking-[0.05em]`}>
                  {app.deadlineLabel}
                </label>
                <input
                  type="date"
                  className={`${fieldClass} w-full`}
                  value={essayForm.deadline}
                  onChange={(e) =>
                    setEssayForm((f) => ({ ...f, deadline: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <label className={`${labelClass} mb-1.5 block uppercase tracking-[0.05em]`}>
                {app.notesInstructions}
              </label>
              <textarea
                className={`${fieldClass} min-h-[60px] w-full resize-y`}
                value={essayForm.instructions_note}
                onChange={(e) =>
                  setEssayForm((f) => ({
                    ...f,
                    instructions_note: e.target.value,
                  }))
                }
                placeholder={app.instructionsPlaceholder}
              />
            </div>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--border-light)] bg-[var(--cream)] px-[22px] py-3.5 -mx-[22px] -mb-[18px] rounded-b-[14px] sm:flex-row sm:justify-end">
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[11.5px] font-semibold"
              onClick={closeEssayModal}
              disabled={savingEssay}
            >
              {app.cancel}
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[var(--green-dark)] disabled:opacity-50"
              onClick={() => void saveEssay()}
              disabled={savingEssay}
            >
              {savingEssay
                ? app.saving
                : essayEditingId
                  ? app.saveEssayChanges
                  : app.saveEssay}
            </button>
          </div>
        </ModalVeil>
      ) : null}

      {detailEssay ? (
        <ModalVeil
          wide
          unpaddedBody
          onClose={() => setEssayDetailId(null)}
          title={detailEssay.title}
        >
          <div className="border-b border-[var(--border-light)] px-[22px] py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[var(--text-light)]">
                  {app.essayUniversity}
                </div>
                <div className="mt-1 text-[13px] font-medium text-[var(--text)]">
                  {detailEssay.for_application ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[var(--text-light)]">
                  {app.essayType}
                </div>
                <div className="mt-1 text-[13px] font-medium text-[var(--text)]">
                  {detailEssay.essay_type ?? "—"}
                </div>
              </div>
              {detailEssay.limit_note?.trim() ? (
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[var(--text-light)]">
                    {app.wordCharCount}
                  </div>
                  <div className="mt-1 text-[13px] font-medium text-[var(--text)]">
                    {detailEssay.limit_note.trim()}
                  </div>
                </div>
              ) : null}
              {detailEssay.deadline ? (
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[var(--text-light)]">
                    {app.deadlineLabel}
                  </div>
                  <div className="mt-1 text-[13px] font-medium text-[var(--text)]">
                    {formatDate(detailEssay.deadline, locale)}
                  </div>
                </div>
              ) : null}
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[var(--text-light)]">
                  {app.status}
                </div>
                <div className="mt-1">
                  <EssayDetailStatusPill
                    status={detailEssay.status as EssayStatusSlug}
                  />
                </div>
              </div>
            </div>
          </div>
          {detailEssay.essay_prompt?.trim() ? (
            <div className="border-b border-[var(--border-light)] px-[22px] py-4">
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                {app.essayPromptLabel}
              </div>
              <div className="rounded-md border-l-[3px] border-[var(--green-light)] bg-[var(--cream)] px-3 py-2.5 text-[13px] italic leading-relaxed text-[var(--text-mid)]">
                {detailEssay.essay_prompt.trim()}
              </div>
            </div>
          ) : null}
          <div className="border-b border-[var(--border-light)] px-[22px] py-4">
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              {app.uploadedFile}
            </div>
            {detailEssay.file_name ? (
              <div className="text-[13px] leading-relaxed text-[var(--text)]">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="mr-1.5 inline-block align-[-2px] text-[var(--text-light)]"
                  aria-hidden
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                </svg>
                <strong>{detailEssay.file_name}</strong>{" "}
                <span className="text-[12px] text-[var(--text-hint)]">
                  ·{" "}
                  {detailEssay.file_uploaded_at
                    ? app.uploadedOn.replace(
                        "{date}",
                        formatDate(detailEssay.file_uploaded_at, locale),
                      )
                    : ""}
                </span>
              </div>
            ) : (
              <div className="text-[13px] italic text-[var(--text-hint)]">
                {app.noFileUploaded}
              </div>
            )}
          </div>
          {detailEssay.instructions_note?.trim() ? (
            <div className="border-b border-[var(--border-light)] px-[22px] py-4">
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                {app.notesInstructions}
              </div>
              <div className="text-[13px] leading-relaxed text-[var(--text)]">
                {detailEssay.instructions_note.trim()}
              </div>
            </div>
          ) : null}
          <div className="border-b border-[var(--border-light)] px-[22px] py-4">
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              {app.counselorFeedback}
            </div>
            {(detailEssay.student_my_application_essay_comments ?? [])
              .length === 0 ? (
              <div className="text-[12px] italic text-[var(--text-hint)]">
                {app.noCounselorComments}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {(detailEssay.student_my_application_essay_comments ?? []).map(
                  (c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border border-[var(--border-light)] bg-[var(--cream)] px-3 py-2.5"
                    >
                      <div className="mb-1 flex justify-between text-[11px] text-[var(--text-light)]">
                        <span className="font-semibold text-[var(--text)]">
                          {c.author_display_name || app.counselor}
                        </span>
                        <span>{formatDate(c.created_at, locale)}</span>
                      </div>
                      <div className="text-[12.5px] leading-relaxed whitespace-pre-wrap text-[var(--text)]">
                        {c.body}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-light)] bg-[var(--cream)] px-[22px] py-3.5">
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)]"
              onClick={() => setEssayDetailId(null)}
            >
              {app.close}
            </button>
          </div>
        </ModalVeil>
      ) : null}

      {recModal ? (
        <ModalVeil
          onClose={() => setRecModal(false)}
          title={app.requestRecTitle}
        >
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>{app.teacherName}</label>
              <input
                className={`${fieldClass} mt-1.5 w-full`}
                value={recForm.teacher_name}
                onChange={(e) =>
                  setRecForm((f) => ({ ...f, teacher_name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClass}>{app.subjectOptional}</label>
              <input
                className={`${fieldClass} mt-1.5 w-full`}
                value={recForm.teacher_subject}
                onChange={(e) =>
                  setRecForm((f) => ({ ...f, teacher_subject: e.target.value }))
                }
                placeholder={app.subjectPlaceholder}
              />
            </div>
            <div>
              <label className={labelClass}>{app.teacherEmail}</label>
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
            <label className={labelClass}>{app.forWhichApplication}</label>
            <input
              className={`${fieldClass} mt-1.5 w-full`}
              value={recForm.for_application}
              onChange={(e) =>
                setRecForm((f) => ({ ...f, for_application: e.target.value }))
              }
            />
          </div>
          <div className="mt-3.5">
            <label className={labelClass}>{app.personalNoteOptional}</label>
            <textarea
              className={`${fieldClass} mt-1.5 min-h-[60px] w-full resize-y`}
              value={recForm.personal_note}
              onChange={(e) =>
                setRecForm((f) => ({ ...f, personal_note: e.target.value }))
              }
            />
          </div>
          <div className="mt-3.5">
            <label className={labelClass}>{app.neededBy}</label>
            <input
              type="date"
              className={`${fieldClass} mt-1.5 w-full`}
              value={recForm.needed_by}
              onChange={(e) =>
                setRecForm((f) => ({ ...f, needed_by: e.target.value }))
              }
            />
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--border-light)] bg-[var(--cream)] px-[22px] py-3.5 -mx-[22px] -mb-[18px] rounded-b-[14px] sm:flex-row sm:justify-end">
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[11.5px] font-semibold"
              onClick={() => setRecModal(false)}
              disabled={sendingRecRequest}
            >
              {app.cancel}
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[var(--green-dark)] disabled:opacity-50"
              onClick={() => void sendRecRequest()}
              disabled={sendingRecRequest}
            >
              {sendingRecRequest ? app.sending : app.sendRequest}
            </button>
          </div>
        </ModalVeil>
      ) : null}

      {toast ? (
        <div className="fixed inset-x-4 bottom-4 z-[200] flex items-center gap-2 rounded-[10px] bg-[var(--green-dark)] px-4 py-3 text-[13px] font-medium text-white shadow-lg sm:inset-x-auto sm:bottom-6 sm:right-6">
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

function PreferredDestinationsMultiSelect({
  labelClass,
  fieldClass,
  values,
  onChange,
}: {
  labelClass: string;
  fieldClass: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const { dict } = useLocale();
  const app = dict.student.applications;
  const [query, setQuery] = useState("");
  const orderedCountries = useMemo(
    () => [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name, "en")),
    [],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orderedCountries;
    return orderedCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.alpha2.toLowerCase().includes(q),
    );
  }, [orderedCountries, query]);

  const selectedUpper = useMemo(
    () => new Set(values.map((v) => v.trim().toUpperCase())),
    [values],
  );

  function toggle(alpha2: string) {
    const u = alpha2.toUpperCase();
    if (selectedUpper.has(u)) {
      onChange(values.filter((x) => x.trim().toUpperCase() !== u));
    } else {
      onChange([...values, u]);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label className={labelClass}>{app.preferredDestinations}</label>
      <p className="text-[11.5px] leading-snug text-[var(--text-hint)]">
        {app.preferredDestinationsSub}
      </p>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--green-pale)] px-2.5 py-1 text-xs font-medium text-[var(--green-dark)]"
            >
              {labelPreferredDestinationEntry(v)}
              <button
                type="button"
                className="text-[var(--green-dark)] opacity-60 hover:opacity-100"
                aria-label={app.removeDestinationAria.replace(
                  "{destination}",
                  labelPreferredDestinationEntry(v),
                )}
                onClick={() => onChange(values.filter((x) => x !== v))}
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
        </div>
      ) : null}
      <input
        type="search"
        className={fieldClass}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={app.preferredDestinationsSearchPlaceholder}
        autoComplete="off"
        aria-label={app.preferredDestinationsFilterAria}
      />
      <div
        className="max-h-[min(280px,45vh)] overflow-y-auto rounded-lg border-[1.5px] border-[var(--border)] bg-white [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-[var(--border)]"
        role="group"
        aria-label={app.preferredDestinationsCountriesAria}
      >
        {filtered.map((c) => {
          const checked = selectedUpper.has(c.alpha2);
          return (
            <label
              key={c.alpha2}
              className="flex cursor-pointer items-center gap-2.5 border-b border-[var(--border-light)] px-3 py-2.5 last:border-b-0 hover:bg-[var(--sand)]"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 shrink-0 rounded border-[var(--border)] accent-[var(--green)]"
                checked={checked}
                onChange={() => toggle(c.alpha2)}
              />
              <span className="min-w-0 flex-1 text-[13px] leading-snug text-[var(--text)]">
                {c.name}
              </span>
              <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wide text-[var(--text-hint)]">
                {c.alpha2}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function TagField({
  label,
  labelTooltip,
  hint,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  labelTooltip?: string;
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
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-mid)]">
          {label}
        </label>
        {labelTooltip ? (
          <span
            className="group relative inline-flex shrink-0 cursor-help"
            tabIndex={0}
            aria-label={labelTooltip}
          >
            <span className="flex size-4 items-center justify-center rounded-full border-[1.5px] border-[var(--border)] text-[9px] font-bold text-[var(--text-hint)] transition group-hover:border-[var(--green-light)] group-hover:bg-[var(--green-bg)] group-hover:text-[var(--green)] group-focus-visible:border-[var(--green-light)] group-focus-visible:bg-[var(--green-bg)] group-focus-visible:text-[var(--green)]">
              i
            </span>
            <span
              role="tooltip"
              className="pointer-events-none invisible absolute bottom-[calc(100%+8px)] left-1/2 z-20 w-[240px] -translate-x-1/2 rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-2.5 text-[11.5px] font-normal normal-case leading-snug tracking-normal text-[var(--text-mid)] shadow-[0_4px_16px_rgba(0,0,0,0.1)] after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-6 after:border-transparent after:border-t-white group-hover:visible group-focus-visible:visible"
            >
              {labelTooltip}
            </span>
          </span>
        ) : null}
      </div>
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
          className="min-w-0 flex-1 border-none bg-transparent py-0.5 text-[13px] outline-none"
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
  locale,
  onPickFile,
  allowDisplayNameEdit,
  onSaveDisplayName,
  allowRemove,
  onRemove,
}: {
  doc: DocRow;
  locale: string;
  onPickFile: (f: File) => void;
  allowDisplayNameEdit?: boolean;
  onSaveDisplayName?: (name: string) => void | Promise<void>;
  allowRemove?: boolean;
  onRemove?: () => void | Promise<void>;
}) {
  const { dict } = useLocale();
  const app = dict.student.applications;
  const nameFieldId = useId();
  const [nameDraft, setNameDraft] = useState(doc.display_name);
  useEffect(() => {
    setNameDraft(doc.display_name);
  }, [doc.display_name, doc.id]);

  const slotLabels = app.documentSlotLabels as Record<string, string>;
  const slotDescriptions = app.documentDescriptions as Record<string, string>;
  const displayLabel =
    allowDisplayNameEdit || isOtherDocumentSlot(doc.slot_key)
      ? doc.display_name
      : (slotLabels[doc.slot_key] ?? doc.display_name);
  const descriptionText =
    slotDescriptions[doc.slot_key] ?? doc.description ?? null;

  const docFieldClass =
    "box-border w-full min-w-0 max-w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2 text-[12px] text-[var(--text)] outline-none focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.07)]";

  if (doc.slot_key === SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY) {
    const text = doc.school_text_value?.trim();
    const has = !!text;
    return (
      <div className="flex flex-col gap-2 rounded-[10px] border border-[var(--border-light)] bg-[#faf9f4] p-3 md:flex-row md:items-center">
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
          <div className="text-[13.5px] font-semibold">{displayLabel}</div>
          <div className="mt-0.5 text-[11.5px] text-[var(--text-light)]">
            {has ? (
              <span className="text-[var(--text)]">{text}</span>
            ) : (
              app.schoolNotEntered
            )}
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center gap-2 border-t border-[var(--border-light)] pt-2 md:w-auto md:justify-end md:border-0 md:pt-0">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
              has
                ? "bg-[rgba(82,183,135,.13)] text-[#1B4332]"
                : "bg-[#ECEAE5] text-[var(--text-mid)]"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
            {has ? app.fromSchool : app.pending}
          </span>
          <span
            className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--cream)] px-2.5 py-1.5 text-[11.5px] font-semibold text-[var(--text-hint)]"
            title={app.readOnlyTitle}
          >
            {app.viewOnly}
          </span>
        </div>
      </div>
    );
  }

  const missing = doc.status === "missing";
  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-[var(--border-light)] bg-white p-3 md:flex-row md:items-center">
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
        {allowDisplayNameEdit ? (
          <div className="flex min-w-0 w-full flex-col gap-1">
            <label
              htmlFor={nameFieldId}
              className="block text-[9.5px] font-semibold uppercase tracking-wide text-[var(--text-hint)]"
            >
              {app.nameForCounselor}
            </label>
            <input
              id={nameFieldId}
              className={`${docFieldClass} block w-full min-w-0 py-1.5`}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={app.docNamePlaceholder}
              maxLength={120}
            />
          </div>
        ) : (
          <div className="text-[13.5px] font-semibold">{displayLabel}</div>
        )}
        <div className="mt-0.5 text-[11.5px] text-[var(--text-light)]">
          {doc.file_name && doc.uploaded_at
            ? app.uploadedFileMeta
                .replace("{fileName}", doc.file_name)
                .replace("{date}", formatDate(doc.uploaded_at, locale))
            : allowDisplayNameEdit
              ? descriptionText || app.documentNotUploadedOther
              : descriptionText || app.documentNotUploaded}
        </div>
      </div>
      <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--border-light)] pt-2 md:w-auto md:border-0 md:pt-0">
        {allowDisplayNameEdit ? (
          <button
            type="button"
            className={btnSmClass(false)}
            onClick={() => void onSaveDisplayName?.(nameDraft.trim())}
          >
            {app.saveName}
          </button>
        ) : null}
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
            missing
              ? "bg-[rgba(231,76,60,0.12)] text-[#8c2d22]"
              : "bg-[rgba(52,152,219,0.12)] text-[#1d4d70]"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
          {missing ? app.missing : app.submitted}
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
            {missing ? app.upload : app.replace}
          </span>
        </label>
        {allowRemove ? (
          <button
            type="button"
            className={`${btnSmClass(false)} border-[rgba(231,76,60,0.35)] text-[#8c2d22] hover:bg-[rgba(231,76,60,0.08)]`}
            onClick={() => void onRemove?.()}
          >
            {app.remove}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function EssayDetailStatusPill({ status }: { status: EssayStatusSlug }) {
  const { dict } = useLocale();
  const labels = dict.student.applications.essayStatusLabels;
  const pillCls =
    status === "ready_for_review"
      ? "bg-[rgba(82,183,135,.13)] text-[#1B4332] [&_.jd]:bg-[var(--green-bright)]"
      : status === "in_progress"
        ? "bg-[rgba(212,162,42,.14)] text-[#7a5d10] [&_.jd]:bg-[#D4A22A]"
        : "bg-[#ECEAE5] text-[var(--text-mid)] [&_.jd]:bg-[#a0a0a0]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold leading-snug ${pillCls}`}
    >
      <span className="jd h-1.5 w-1.5 rounded-full" />
      {labels[status]}
    </span>
  );
}

function ModalVeil({
  title,
  children,
  onClose,
  wide,
  unpaddedBody,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  /** Section-style bodies (bordered blocks like school essay detail) */
  unpaddedBody?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(15,30,20,0.5)] p-4 sm:p-5"
      role="dialog"
      aria-modal
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[14px] bg-white shadow-xl ${wide ? "max-w-[640px]" : "max-w-[480px]"}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-light)] px-[22px] py-4">
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
        <div
          className={
            unpaddedBody
              ? "min-h-0 flex-1 overflow-y-auto"
              : "overflow-y-auto px-[22px] py-[18px]"
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
