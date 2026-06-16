import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import {
  deriveStudentManagementStatus,
  resolveStudentStage,
  type AdvisorStudentManagementStatus,
} from "@/lib/advisor-student-derivations";
import {
  ADMIN_APPLICATION_STATUS_LABEL,
  type ApplicationStatus,
} from "@/app/(protected)/admin/applications/_lib/application-status-labels";
import {
  buildApplicationPackageView,
  parseApplicationPackageData,
  resolveApplicationUniversitiesTotal,
} from "@/lib/application-package-data";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { getPlatformCompletionStats } from "@/lib/student-platform-completion";
import { createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type AdvisorStudentApplicationRow = {
  id: number;
  status: string;
  statusLabel: string;
  packageLabel: string;
  progressPercent: number;
  assignedAt: string | null;
  createdAt: string | null;
};

export type AdvisorStudentDetailPayload = {
  studentId: string;
  studentName: string;
  studentInitials: string;
  studentEmail: string;
  studentPhone: string | null;
  grade: string | null;
  nationalityLabel: string;
  managementStatus: AdvisorStudentManagementStatus;
  stage: string;
  school: {
    id: string;
    name: string;
    city: string | null;
    countryLabel: string;
    contactEmail: string | null;
  } | null;
  overview: {
    curriculum: string | null;
    predictedGrades: string | null;
    englishTest: string | null;
    satAct: string | null;
    interestedPrograms: string;
    preferredDestinations: string;
    budgetRange: string | null;
    targetIntake: string | null;
    gpa: string | null;
    intendedFields: string | null;
    preferredUniOrCountries: string | null;
    extracurricularActivities: string | null;
    additionalNotes: string | null;
  };
  platformEngagement: {
    completedFeatures: number;
    totalFeatures: number;
    percent: number;
    shortlistCount: number;
    totalLogins: number | null;
  };
  applications: AdvisorStudentApplicationRow[];
};

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function personName(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(" ").trim();
}

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  const pair = `${a}${b}`.toUpperCase();
  return pair || "?";
}

function joinList(values: string[] | null | undefined): string {
  const items = (values ?? []).map((v) => v.trim()).filter(Boolean);
  return items.length > 0 ? items.join(", ") : "—";
}

function formatEnglishTest(profile: {
  ielts_score: string | null;
  toefl_score: string | null;
  english_test_scores: string | null;
} | null): string | null {
  if (!profile) return null;
  const parts = [
    profile.ielts_score?.trim() ? `IELTS ${profile.ielts_score.trim()}` : "",
    profile.toefl_score?.trim() ? `TOEFL ${profile.toefl_score.trim()}` : "",
    profile.english_test_scores?.trim() ?? "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatSatAct(profile: {
  sat_score: string | null;
  act_score: string | null;
  sat_act_scores: string | null;
} | null): string | null {
  if (!profile) return null;
  const parts = [
    profile.sat_score?.trim() ? `SAT ${profile.sat_score.trim()}` : "",
    profile.act_score?.trim() ? `ACT ${profile.act_score.trim()}` : "",
    profile.sat_act_scores?.trim() ?? "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

type PaymentEmbed = {
  status: string | null;
  amount?: number;
  payment_request_sent_at?: string | null;
  payment_request_token?: string | null;
};

type AssignedAppRaw = {
  id: number;
  status: string | null;
  assigned_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  package_data: unknown;
  gpa: number | null;
  inteended_fields: string;
  preferred_uni_or_countries: string;
  extracurricular_activities: string | null;
  additional_notes: string | null;
  payments: PaymentEmbed | PaymentEmbed[] | null;
  applications_plans:
    | { name: string; universities_count: number }
    | { name: string; universities_count: number }[]
    | null;
};

export async function fetchAdvisorStudentDetail(
  studentIdRaw: string,
): Promise<AdvisorStudentDetailPayload | null> {
  const studentId = studentIdRaw.trim();
  if (!studentId) return null;

  const supabase = await createSupabaseServerClient();
  const advisorId = await resolveCurrentAdvisorId(supabase);
  if (!advisorId) return null;

  const { data: studentProfile, error: profileErr } = await supabase
    .from("student_profiles")
    .select(
      `
      id,
      first_name,
      last_name,
      email,
      phone,
      grade,
      nationality_country_code,
      platform_completion,
      total_logins,
      school_id,
      schools (
        id,
        name,
        city,
        country_code,
        contact_email
      )
    `,
    )
    .eq("id", studentId)
    .maybeSingle();

  if (profileErr) {
    console.error("[fetchAdvisorStudentDetail] profile", profileErr);
    return null;
  }

  if (!studentProfile) return null;

  const { data: assignedApps, error: appsErr } = await supabase
    .from("applications")
    .select(
      `
      id,
      status,
      assigned_at,
      created_at,
      updated_at,
      package_data,
      gpa,
      inteended_fields,
      preferred_uni_or_countries,
      extracurricular_activities,
      additional_notes,
      payments ( status, amount, payment_request_sent_at, payment_request_token ),
      applications_plans ( name, universities_count )
    `,
    )
    .eq("assigned_to", advisorId)
    .eq("student_id", studentId)
    .order("updated_at", { ascending: false });

  if (appsErr) {
    console.error("[fetchAdvisorStudentDetail] apps", appsErr);
    return null;
  }

  const apps = (assignedApps ?? []) as unknown as AssignedAppRaw[];
  if (apps.length === 0) return null;

  const [{ data: appProfile }, { count: shortlistCount }] = await Promise.all([
    supabase
      .from("student_application_profile")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle(),
    supabase
      .from("student_shortlist_universities")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId),
  ]);

  const school = firstEmbed(studentProfile.schools);
  const studentName =
    personName(studentProfile.first_name, studentProfile.last_name) || "Student";
  const nationalityLabel =
    getCountryNameByAlpha2(studentProfile.nationality_country_code) ??
    studentProfile.nationality_country_code ??
    "—";

  const snapshots = apps.map((app) => ({
    id: app.id,
    studentId,
    status: app.status?.trim() || "new",
    updatedAt: app.updated_at,
    createdAt: app.created_at,
    packageDataRaw: app.package_data,
    preferredUniOrCountries: app.preferred_uni_or_countries,
    payments: (Array.isArray(app.payments)
      ? app.payments
      : app.payments
        ? [app.payments]
        : []
    ).map((p) => ({
      status: p.status,
      paymentRequestSentAt: p.payment_request_sent_at ?? null,
      paymentRequestToken: p.payment_request_token ?? null,
    })),
  }));

  const managementStatus = deriveStudentManagementStatus(snapshots);
  const stage = resolveStudentStage(snapshots);

  const latestApp = apps[0];
  const platformStats = getPlatformCompletionStats(
    studentProfile.platform_completion,
  );

  const applicationRows: AdvisorStudentApplicationRow[] = apps.map((app) => {
    const plan = firstEmbed(app.applications_plans);
    const packageData = parseApplicationPackageData(app.package_data);
    const universitiesTotal = resolveApplicationUniversitiesTotal(
      packageData,
      plan?.universities_count ?? 0,
    );
    const paidTotal = (Array.isArray(app.payments)
      ? app.payments
      : app.payments
        ? [app.payments]
        : []
    )
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);

    const packageView = buildApplicationPackageView({
      packageData,
      planName: plan?.name ?? null,
      universitiesTotal,
      totalPaidAed: paidTotal,
      fallbackStartedAt: app.assigned_at,
    });

    const status = app.status?.trim() || "new";

    return {
      id: app.id,
      status,
      statusLabel:
        ADMIN_APPLICATION_STATUS_LABEL[status as ApplicationStatus] ?? status,
      packageLabel: packageView.packageLabel,
      progressPercent: packageView.progressPercent,
      assignedAt: app.assigned_at,
      createdAt: app.created_at,
    };
  });

  return {
    studentId,
    studentName,
    studentInitials: studentInitials(studentName),
    studentEmail: studentProfile.email?.trim() || "—",
    studentPhone: studentProfile.phone?.trim() || null,
    grade: appProfile?.grade?.trim() || studentProfile.grade?.trim() || null,
    nationalityLabel,
    managementStatus,
    stage,
    school: school
      ? {
          id: school.id,
          name: school.name?.trim() || "—",
          city: school.city?.trim() || null,
          countryLabel:
            getCountryNameByAlpha2(school.country_code) ??
            school.country_code ??
            "—",
          contactEmail: school.contact_email?.trim() || null,
        }
      : null,
    overview: {
      curriculum: appProfile?.curriculum?.trim() || null,
      predictedGrades: appProfile?.predicted_grades?.trim() || null,
      englishTest: formatEnglishTest(appProfile),
      satAct: formatSatAct(appProfile),
      interestedPrograms: joinList(appProfile?.interested_programs),
      preferredDestinations: joinList(appProfile?.preferred_destinations),
      budgetRange: appProfile?.budget_range?.trim() || null,
      targetIntake: appProfile?.target_intake?.trim() || null,
      gpa: latestApp.gpa != null ? String(latestApp.gpa) : null,
      intendedFields: latestApp.inteended_fields?.trim() || null,
      preferredUniOrCountries:
        latestApp.preferred_uni_or_countries?.trim() || null,
      extracurricularActivities:
        latestApp.extracurricular_activities?.trim() || null,
      additionalNotes: latestApp.additional_notes?.trim() || null,
    },
    platformEngagement: {
      completedFeatures: platformStats.completed,
      totalFeatures: platformStats.total,
      percent: platformStats.percent,
      shortlistCount: shortlistCount ?? 0,
      totalLogins: studentProfile.total_logins,
    },
    applications: applicationRows,
  };
}
