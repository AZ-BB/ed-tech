import { formatDistanceToNow } from "date-fns";

import type { Database } from "@/database.types";
import { getPlatformCompletionStats } from "@/lib/student-platform-completion";
import { createSupabaseServerClient } from "@/utils/supabase-server";

type SchoolCreditsEmbed = {
  name?: string;
  default_advisor_credit_limit: number | null;
  default_ambasador_credit_limit: number | null;
};

function pickLatestActivityIso(
  actAt: string | null | undefined,
  aiAt: string | null | undefined,
): string | null {
  if (!actAt && !aiAt) return null;
  if (!actAt) return aiAt!;
  if (!aiAt) return actAt;
  return new Date(aiAt).getTime() > new Date(actAt).getTime() ? aiAt : actAt;
}

function formatActivityAgo(iso: string): string {
  try {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return "—";
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

export type SchoolStudentDetailPayload = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    gradeDisplay: string | null;
    schoolName: string;
    nationalityName: string | null;
    profilePercent: number;
    counselorLabel: string;
    curriculumDisplay: string | null;
    targetIntakeDisplay: string | null;
    stageLabel: string;
    lastActiveLabel: string;
    /** Matches Teacher Portal risk pill: green | amber | red */
    riskClass: "green" | "amber" | "red";
    riskLabel: string;
    /** Net advisor credits used (used − refunded) from `student_credits_history`. */
    advisorCreditsUsedNet: number;
    /** Net ambassador credits used (used − refunded) from `student_credits_history`. */
    ambassadorCreditsUsedNet: number;
    /** Net total credits used (advisor + ambassador, used − refunded). */
    creditsUsedTotal: number;
    /** Per-student `advisor_credit_limit`, else school `default_advisor_credit_limit`. */
    advisorCreditLimit: number | null;
    /** Per-student `ambassador_credit_limit`, else school `default_ambasador_credit_limit`. */
    ambassadorCreditLimit: number | null;
    /** Stored `student_profiles.advisor_credit_limit` only (null → use school default). */
    advisorCreditLimitOverride: number | null;
    /** Stored `student_profiles.ambassador_credit_limit` only. */
    ambassadorCreditLimitOverride: number | null;
    schoolDefaultAdvisorCreditLimit: number | null;
    schoolDefaultAmbassadorCreditLimit: number | null;
  };
  applicationProfile:
    | Database["public"]["Tables"]["student_application_profile"]["Row"]
    | null;
  quickStats: {
    universitiesCount: number;
    documentsInCount: number;
    openTasksCount: number;
    supportSessionsCount: number;
  };
  /** Counts for the school “Activity” tab (aligned with student dashboard queries). */
  platformActivity: {
    programsViewed: number;
    universitiesSaved: number;
    scholarshipsSaved: number;
    aiMatches: number;
    essaysReviewed: number;
    advisorSessions: number;
    ambassadorSessions: number;
    /** No webinar-attendance table in schema yet; keep UI slot at 0. */
    webinarsAttended: number;
    totalLogins: number;
    /** Relative time of latest student_activities vs ai_usage (e.g. “3 days ago”); else profile `updated_at`. */
    lastActivityDateLabel: string | null;
  };
  /** Manual application shortlist (`student_shortlist_universities`). */
  shortlist: Database["public"]["Tables"]["student_shortlist_universities"]["Row"][];
  /** For add-university modal country `<select>`. */
  countries: { id: string; name: string }[];
  /** Internal notes for school admins only (`student_notes`). */
  studentNotes: {
    id: string;
    noteType: string;
    content: string;
    createdAt: string;
    authorLabel: string;
  }[];
};

function stageFromProfilePercent(pct: number): string {
  if (pct >= 85) return "Ready to submit applications";
  if (pct >= 55) return "Shortlist & essay prep";
  if (pct >= 30) return "Exploring universities & building profile";
  return "Getting started on the platform";
}

function riskFromSignals(
  profilePercent: number,
  inactiveWeek: boolean,
): { riskClass: "green" | "amber" | "red"; riskLabel: string } {
  if (profilePercent < 28) return { riskClass: "red", riskLabel: "Urgent" };
  if (inactiveWeek || profilePercent < 55)
    return { riskClass: "amber", riskLabel: "Follow-up" };
  return { riskClass: "green", riskLabel: "On track" };
}

export async function fetchSchoolStudentDetail(
  studentId: string,
): Promise<SchoolStudentDetailPayload | null> {
  const supabase = await createSupabaseServerClient();

  const { data: profile, error } = await supabase
    .from("student_profiles")
    .select(
      `
      id,
      first_name,
      last_name,
      email,
      grade,
      created_at,
      updated_at,
      platform_completion,
      counselor_school_admin_id,
      advisor_credit_limit,
      ambassador_credit_limit,
      total_logins,
      schools (
        name,
        default_advisor_credit_limit,
        default_ambasador_credit_limit
      ),
      countries!student_profiles_nationality_country_code_fkey(name)
    `,
    )
    .eq("id", studentId)
    .maybeSingle();

  if (error || !profile) {
    if (error) console.error(error);
    return null;
  }

  const schoolsEmbedRaw = profile.schools as
    | SchoolCreditsEmbed
    | SchoolCreditsEmbed[]
    | null;
  const schoolsEmbed = Array.isArray(schoolsEmbedRaw)
    ? schoolsEmbedRaw[0] ?? null
    : schoolsEmbedRaw;
  const countriesEmbed = profile.countries as { name?: string } | null;
  const schoolName = schoolsEmbed?.name?.trim() || "School";
  const nationalityName =
    typeof countriesEmbed?.name === "string"
      ? countriesEmbed.name.trim() || null
      : null;

  const profilePercent = getPlatformCompletionStats(
    profile.platform_completion,
  ).percent;

  const counselorId = profile.counselor_school_admin_id;

  const [
    { data: latestActRow, error: latestActErr },
    { data: latestAiRow, error: latestAiErr },
    { data: appProf },
    counselorRes,
    shortlistRowsRes,
    countriesRes,
    docsRes,
    tasksRes,
    advisorSessRes,
    ambRes,
    creditRowsRes,
    uniViewedRes,
    uniSavedRes,
    scholarSavedRes,
    essayReviewRes,
    matchingRes,
    notesRes,
  ] = await Promise.all([
    supabase
      .from("student_activities")
      .select("created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ai_usage")
      .select("created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("student_application_profile")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle(),
    counselorId
      ? supabase
          .from("school_admin_profiles")
          .select("first_name,last_name")
          .eq("id", counselorId)
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null,
        } as {
          data: {
            first_name: string;
            last_name: string;
          } | null;
          error: null;
        }),
    supabase
      .from("student_shortlist_universities")
      .select("*")
      .eq("student_id", studentId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("countries").select("id, name").order("name", { ascending: true }),
    supabase
      .from("student_my_application_documents")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .not("storage_path", "is", null),
    supabase
      .from("student_my_application_tasks")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("completed", false),
    supabase
      .from("advisor_sessions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId),
    supabase
      .from("ambassador_session_requests")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId),
    supabase
      .from("student_credits_history")
      .select("amount, status, type")
      .eq("student_id", studentId),
    supabase
      .from("student_activities")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("entity_type", "university")
      .eq("type", "viewed"),
    supabase
      .from("student_activities")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("entity_type", "university")
      .eq("type", "save"),
    supabase
      .from("student_activities")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("entity_type", "scholarship")
      .eq("type", "save"),
    supabase
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("type", "essay_review"),
    supabase
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("type", "matching"),
    supabase
      .from("student_notes")
      .select(
        `
      id,
      note_type,
      content,
      created_at,
      school_admin_profiles!student_notes_author_id_fkey (
        first_name,
        last_name
      )
    `,
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (latestActErr) {
    console.error("[fetchSchoolStudentDetail] latest student_activities:", latestActErr.message);
  }
  if (latestAiErr) {
    console.error("[fetchSchoolStudentDetail] latest ai_usage:", latestAiErr.message);
  }
  if (shortlistRowsRes.error) {
    console.error(
      "[fetchSchoolStudentDetail] student_shortlist_universities:",
      shortlistRowsRes.error.message,
    );
  }
  if (countriesRes.error) {
    console.error("[fetchSchoolStudentDetail] countries:", countriesRes.error.message);
  }
  if (notesRes.error) {
    console.error(
      "[fetchSchoolStudentDetail] student_notes:",
      notesRes.error.message,
    );
  }

  const platformAt = pickLatestActivityIso(
    latestActRow?.created_at,
    latestAiRow?.created_at,
  );

  let lastActivityDateLabel: string | null = null;
  if (platformAt) {
    const formatted = formatActivityAgo(platformAt);
    lastActivityDateLabel = formatted === "—" ? null : formatted;
  } else if (profile.updated_at) {
    const formatted = formatActivityAgo(profile.updated_at);
    lastActivityDateLabel = formatted === "—" ? null : formatted;
  }

  const activityIso =
    platformAt ?? profile.updated_at ?? profile.created_at ?? null;
  let inactiveWeek = false;
  let lastActiveLabel = "—";
  if (activityIso) {
    try {
      const t = new Date(activityIso);
      lastActiveLabel = formatDistanceToNow(t, { addSuffix: true });
      inactiveWeek =
        (Date.now() - t.getTime()) / (1000 * 60 * 60 * 24) >= 7;
    } catch {
      lastActiveLabel = "—";
    }
  }

  let counselorLabel = "—";
  if (counselorRes.data) {
    const c = counselorRes.data;
    const label =
      `${c.first_name?.trim() ?? ""} ${c.last_name?.trim() ?? ""}`.trim();
    if (label) counselorLabel = label;
  }

  const app = appProf ?? null;
  const curriculumDisplay = app?.curriculum?.trim() || null;
  const targetIntakeDisplay = app?.target_intake?.trim() || null;

  let advisorCreditsUsedNet = 0;
  let ambassadorCreditsUsedNet = 0;
  if (creditRowsRes.error) {
    console.error(
      "[fetchSchoolStudentDetail] student_credits_history:",
      creditRowsRes.error.message,
    );
  } else if (creditRowsRes.data?.length) {
    let advUsed = 0;
    let advRefunded = 0;
    let ambUsed = 0;
    let ambRefunded = 0;
    for (const r of creditRowsRes.data) {
      const amt =
        typeof r.amount === "number" && Number.isFinite(r.amount)
          ? r.amount
          : 0;
      const isRefund = r.status === "refunded";
      if (r.type === "advisor") {
        if (isRefund) advRefunded += amt;
        else advUsed += amt;
      } else if (r.type === "ambassador") {
        if (isRefund) ambRefunded += amt;
        else ambUsed += amt;
      }
    }
    advisorCreditsUsedNet = Math.max(0, advUsed - advRefunded);
    ambassadorCreditsUsedNet = Math.max(0, ambUsed - ambRefunded);
  }

  const creditsUsedTotal =
    advisorCreditsUsedNet + ambassadorCreditsUsedNet;

  const countOr0 = (err: { message?: string } | null, count: number | null) => {
    if (err) {
      console.error("[fetchSchoolStudentDetail] count:", err.message);
      return 0;
    }
    return count ?? 0;
  };

  const platformActivity = {
    programsViewed: countOr0(uniViewedRes.error, uniViewedRes.count),
    universitiesSaved: countOr0(uniSavedRes.error, uniSavedRes.count),
    scholarshipsSaved: countOr0(scholarSavedRes.error, scholarSavedRes.count),
    aiMatches: countOr0(matchingRes.error, matchingRes.count),
    essaysReviewed: countOr0(essayReviewRes.error, essayReviewRes.count),
    advisorSessions: countOr0(advisorSessRes.error, advisorSessRes.count),
    ambassadorSessions: countOr0(ambRes.error, ambRes.count),
    webinarsAttended: 0,
    totalLogins:
      typeof profile.total_logins === "number" &&
      Number.isFinite(profile.total_logins)
        ? Math.max(0, Math.trunc(profile.total_logins))
        : 0,
    lastActivityDateLabel,
  };

  const advisorCreditLimit =
    profile.advisor_credit_limit ??
    schoolsEmbed?.default_advisor_credit_limit ??
    null;
  const ambassadorCreditLimit =
    profile.ambassador_credit_limit ??
    schoolsEmbed?.default_ambasador_credit_limit ??
    null;

  const { riskClass, riskLabel } = riskFromSignals(
    profilePercent,
    inactiveWeek,
  );

  const shortlist = shortlistRowsRes.data ?? [];

  const rawNotes = notesRes.data ?? [];
  const studentNotes = rawNotes.map((row) => {
    const embed = row.school_admin_profiles as
      | { first_name: string; last_name: string }
      | { first_name: string; last_name: string }[]
      | null;
    const sap = Array.isArray(embed) ? embed[0] : embed;
    const authorLabel =
      `${sap?.first_name?.trim() ?? ""} ${sap?.last_name?.trim() ?? ""}`.trim() ||
      "School admin";
    return {
      id: row.id,
      noteType: row.note_type,
      content: row.content,
      createdAt: row.created_at,
      authorLabel,
    };
  });

  return {
    student: {
      id: profile.id,
      firstName: profile.first_name?.trim() ?? "",
      lastName: profile.last_name?.trim() ?? "",
      email: profile.email?.trim() ?? "",
      gradeDisplay: profile.grade?.trim() ?? null,
      schoolName,
      nationalityName,
      profilePercent,
      counselorLabel,
      curriculumDisplay,
      targetIntakeDisplay,
      stageLabel: stageFromProfilePercent(profilePercent),
      lastActiveLabel,
      riskClass,
      riskLabel,
      advisorCreditsUsedNet,
      ambassadorCreditsUsedNet,
      creditsUsedTotal,
      advisorCreditLimit,
      ambassadorCreditLimit,
      advisorCreditLimitOverride: profile.advisor_credit_limit ?? null,
      ambassadorCreditLimitOverride: profile.ambassador_credit_limit ?? null,
      schoolDefaultAdvisorCreditLimit:
        schoolsEmbed?.default_advisor_credit_limit ?? null,
      schoolDefaultAmbassadorCreditLimit:
        schoolsEmbed?.default_ambasador_credit_limit ?? null,
    },
    applicationProfile: app,
    quickStats: {
      universitiesCount: shortlist.length,
      documentsInCount: docsRes.count ?? 0,
      openTasksCount: tasksRes.count ?? 0,
      supportSessionsCount:
        (advisorSessRes.count ?? 0) + (ambRes.count ?? 0),
    },
    platformActivity,
    shortlist,
    countries: countriesRes.data ?? [],
    studentNotes,
  };
}
