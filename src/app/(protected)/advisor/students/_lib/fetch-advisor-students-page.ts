import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import {
  aggregateDestinations,
  deriveStudentManagementStatus,
  resolveDeadlineRisk,
  resolveLatestApplication,
  resolveStudentStage,
  type AdvisorStudentManagementStatus,
  type AdvisorStudentStatusFilter,
  type DestinationPill,
} from "@/lib/advisor-student-derivations";
import { createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type PaymentEmbed = {
  status: string | null;
  payment_request_sent_at: string | null;
  payment_request_token: string | null;
};

type AssignedAppRaw = {
  id: number;
  student_id: string;
  status: string | null;
  updated_at: string | null;
  created_at: string | null;
  package_data: unknown;
  preferred_uni_or_countries: string | null;
  student_name: string | null;
  student_email: string | null;
  school_name: string | null;
  payments: PaymentEmbed | PaymentEmbed[] | null;
  student_profiles:
    | {
        first_name: string;
        last_name: string;
        email?: string | null;
      }
    | {
        first_name: string;
        last_name: string;
        email?: string | null;
      }[]
    | null;
  schools: { name: string } | { name: string }[] | null;
};

export type AdvisorStudentRow = {
  studentId: string;
  studentName: string;
  studentInitials: string;
  studentEmail: string;
  schoolName: string;
  managementStatus: AdvisorStudentManagementStatus;
  destinations: DestinationPill[];
  stage: string;
  lastContact: string | null;
  nextFollowUp: string | null;
  deadlineRiskLevel: "ok" | "soon" | "urgent" | "none";
  deadlineRiskLabel: string;
  latestUpdatedAt: string | null;
};

export type AdvisorStudentsPanelProps = {
  rows: AdvisorStudentRow[];
  totalRows: number;
  page: number;
  limit: number;
  search: string;
  status: AdvisorStudentStatusFilter;
  statusCounts: Record<AdvisorStudentStatusFilter, number>;
};

const EMPTY_STATUS_COUNTS: Record<AdvisorStudentStatusFilter, number> = {
  all: 0,
  submitted: 0,
  active_package: 0,
  awaiting_payment: 0,
  active_advisory: 0,
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

function paymentsList(embed: PaymentEmbed | PaymentEmbed[] | null): PaymentEmbed[] {
  if (!embed) return [];
  return Array.isArray(embed) ? embed : [embed];
}

function maxDate(dates: string[]): string | null {
  if (dates.length === 0) return null;
  return [...dates].sort((a, b) => b.localeCompare(a))[0];
}

function minDate(dates: string[]): string | null {
  if (dates.length === 0) return null;
  return [...dates].sort((a, b) => a.localeCompare(b))[0];
}

export function parseAdvisorStudentsSearch(
  raw: string | string[] | undefined,
): string {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  return value?.trim() ?? "";
}

async function fetchPreferredDestinationsByStudent(
  client: DbClient,
  studentIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (studentIds.length === 0) return map;

  const { data, error } = await client
    .from("student_application_profile")
    .select("student_id, preferred_destinations")
    .in("student_id", studentIds);

  if (error) {
    console.error("[fetchPreferredDestinationsByStudent]", error);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.student_id, row.preferred_destinations ?? []);
  }

  return map;
}

async function fetchShortlistDeadlinesByStudent(
  client: DbClient,
  studentIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (studentIds.length === 0) return map;

  const { data, error } = await client
    .from("student_shortlist_universities")
    .select("student_id, application_deadline")
    .in("student_id", studentIds);

  if (error) {
    console.error("[fetchShortlistDeadlinesByStudent]", error);
    return map;
  }

  for (const row of data ?? []) {
    if (!row.application_deadline) continue;
    const list = map.get(row.student_id) ?? [];
    list.push(row.application_deadline);
    map.set(row.student_id, list);
  }

  return map;
}

async function fetchCallsByApplicationIds(
  client: DbClient,
  applicationIds: number[],
): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();
  if (applicationIds.length === 0) return map;

  const { data, error } = await client
    .from("application_calls")
    .select("application_id, call_date")
    .in("application_id", applicationIds)
    .eq("status", "completed");

  if (error) {
    console.error("[fetchCallsByApplicationIds]", error);
    return map;
  }

  for (const row of data ?? []) {
    const list = map.get(row.application_id) ?? [];
    list.push(row.call_date);
    map.set(row.application_id, list);
  }

  return map;
}

async function fetchOpenTasksByApplicationIds(
  client: DbClient,
  applicationIds: number[],
): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();
  if (applicationIds.length === 0) return map;

  const { data, error } = await client
    .from("application_tasks")
    .select("application_id, due_date")
    .in("application_id", applicationIds)
    .eq("completed", false)
    .not("due_date", "is", null);

  if (error) {
    console.error("[fetchOpenTasksByApplicationIds]", error);
    return map;
  }

  for (const row of data ?? []) {
    if (!row.due_date) continue;
    const list = map.get(row.application_id) ?? [];
    list.push(row.due_date);
    map.set(row.application_id, list);
  }

  return map;
}

async function fetchUniversityDataByApplicationIds(
  client: DbClient,
  applicationIds: number[],
): Promise<{
  countriesByApp: Map<number, string[]>;
  deadlinesByApp: Map<number, string[]>;
}> {
  const countriesByApp = new Map<number, string[]>();
  const deadlinesByApp = new Map<number, string[]>();
  if (applicationIds.length === 0) {
    return { countriesByApp, deadlinesByApp };
  }

  const { data, error } = await client
    .from("application_university_targets")
    .select("application_id, country_code, deadline")
    .in("application_id", applicationIds);

  if (error) {
    console.error("[fetchUniversityDataByApplicationIds]", error);
    return { countriesByApp, deadlinesByApp };
  }

  for (const row of data ?? []) {
    if (row.country_code?.trim()) {
      const countries = countriesByApp.get(row.application_id) ?? [];
      countries.push(row.country_code.trim());
      countriesByApp.set(row.application_id, countries);
    }
    if (row.deadline) {
      const deadlines = deadlinesByApp.get(row.application_id) ?? [];
      deadlines.push(row.deadline);
      deadlinesByApp.set(row.application_id, deadlines);
    }
  }

  return { countriesByApp, deadlinesByApp };
}

export async function fetchAdvisorStudentsPanel(options: {
  page: number;
  limit: number;
  search: string;
  status: AdvisorStudentStatusFilter;
}): Promise<AdvisorStudentsPanelProps | null> {
  const supabase = await createSupabaseServerClient();
  const advisorId = await resolveCurrentAdvisorId(supabase);
  if (!advisorId) return null;

  const emptyPanel = {
    rows: [],
    totalRows: 0,
    page: options.page,
    limit: options.limit,
    search: options.search,
    status: options.status,
    statusCounts: { ...EMPTY_STATUS_COUNTS },
  };

  const { data: appsRaw, error } = await supabase
    .from("applications")
    .select(
      `
      id,
      student_id,
      status,
      updated_at,
      created_at,
      package_data,
      preferred_uni_or_countries,
      student_name,
      student_email,
      school_name,
      payments ( status, payment_request_sent_at, payment_request_token ),
      student_profiles ( first_name, last_name, email ),
      schools ( name )
    `,
    )
    .eq("assigned_to", advisorId);

  if (error) {
    console.error("[fetchAdvisorStudentsPanel]", error);
    return emptyPanel;
  }

  const apps = (appsRaw ?? []) as unknown as AssignedAppRaw[];
  if (apps.length === 0) return emptyPanel;

  const applicationIds = apps.map((app) => app.id);
  const studentIds = [...new Set(apps.map((app) => app.student_id))];

  const [
    preferredByStudent,
    shortlistDeadlinesByStudent,
    callsByApp,
    tasksByApp,
    universityData,
  ] = await Promise.all([
    fetchPreferredDestinationsByStudent(supabase, studentIds),
    fetchShortlistDeadlinesByStudent(supabase, studentIds),
    fetchCallsByApplicationIds(supabase, applicationIds),
    fetchOpenTasksByApplicationIds(supabase, applicationIds),
    fetchUniversityDataByApplicationIds(supabase, applicationIds),
  ]);

  const { countriesByApp, deadlinesByApp } = universityData;

  const appsByStudent = new Map<string, AssignedAppRaw[]>();
  for (const app of apps) {
    const list = appsByStudent.get(app.student_id) ?? [];
    list.push(app);
    appsByStudent.set(app.student_id, list);
  }

  const allRows: AdvisorStudentRow[] = [];

  for (const [studentId, studentApps] of appsByStudent) {
    const profile = firstEmbed(studentApps[0]?.student_profiles);
    const school = firstEmbed(studentApps[0]?.schools);
    const profileName = profile
      ? personName(profile.first_name, profile.last_name)
      : "";
    const studentName =
      profileName || studentApps[0]?.student_name?.trim() || "Student";
    const studentEmail =
      profile?.email?.trim() ||
      studentApps[0]?.student_email?.trim() ||
      "—";
    const schoolName =
      school?.name?.trim() || studentApps[0]?.school_name?.trim() || "—";

    const snapshots = studentApps.map((app) => ({
      id: app.id,
      studentId: app.student_id,
      status: app.status?.trim() || "new",
      updatedAt: app.updated_at,
      createdAt: app.created_at,
      packageDataRaw: app.package_data,
      preferredUniOrCountries: app.preferred_uni_or_countries,
      payments: paymentsList(app.payments).map((payment) => ({
        status: payment.status,
        paymentRequestSentAt: payment.payment_request_sent_at,
        paymentRequestToken: payment.payment_request_token,
      })),
    }));

    const managementStatus = deriveStudentManagementStatus(snapshots);
    const stage = resolveStudentStage(snapshots);
    const latest = resolveLatestApplication(
      snapshots.map((s) => ({ id: s.id, updatedAt: s.updatedAt })),
    );

    const universityTargetCountries: string[] = [];
    const allDeadlines: string[] = [
      ...(shortlistDeadlinesByStudent.get(studentId) ?? []),
    ];
    const callDates: string[] = [];
    const taskDueDates: string[] = [];

    for (const app of studentApps) {
      universityTargetCountries.push(...(countriesByApp.get(app.id) ?? []));
      allDeadlines.push(...(deadlinesByApp.get(app.id) ?? []));
      callDates.push(...(callsByApp.get(app.id) ?? []));
      taskDueDates.push(...(tasksByApp.get(app.id) ?? []));
    }

    const destinations = aggregateDestinations({
      universityTargetCountries,
      preferredDestinations: preferredByStudent.get(studentId) ?? [],
      preferredUniOrCountries: latest
        ? snapshots.find((s) => s.id === latest.id)?.preferredUniOrCountries ??
          null
        : null,
    });

    const deadlineRisk = resolveDeadlineRisk(allDeadlines);

    allRows.push({
      studentId,
      studentName,
      studentInitials: studentInitials(studentName),
      studentEmail,
      schoolName,
      managementStatus,
      destinations,
      stage,
      lastContact: maxDate(callDates),
      nextFollowUp: minDate(taskDueDates),
      deadlineRiskLevel: deadlineRisk.level,
      deadlineRiskLabel: deadlineRisk.label,
      latestUpdatedAt: maxDate(
        studentApps
          .map((app) => app.updated_at)
          .filter((value): value is string => Boolean(value)),
      ),
    });
  }

  allRows.sort((a, b) => {
    const aTime = a.latestUpdatedAt ? Date.parse(a.latestUpdatedAt) : 0;
    const bTime = b.latestUpdatedAt ? Date.parse(b.latestUpdatedAt) : 0;
    return bTime - aTime;
  });

  const statusCounts: Record<AdvisorStudentStatusFilter, number> = {
    ...EMPTY_STATUS_COUNTS,
    all: allRows.length,
  };

  for (const row of allRows) {
    statusCounts[row.managementStatus] += 1;
  }

  let filtered = allRows;
  if (options.status !== "all") {
    filtered = filtered.filter(
      (row) => row.managementStatus === options.status,
    );
  }

  const search = options.search.trim().toLowerCase();
  if (search) {
    filtered = filtered.filter((row) => {
      const haystack = [row.studentName, row.studentEmail, row.schoolName]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  const totalRows = filtered.length;
  const page = Math.max(1, options.page);
  const limit = Math.max(1, options.limit);
  const from = (page - 1) * limit;

  return {
    rows: filtered.slice(from, from + limit),
    totalRows,
    page,
    limit,
    search: options.search,
    status: options.status,
    statusCounts,
  };
}
