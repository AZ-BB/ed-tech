import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import {
  fetchAdvisorStudentApplicationGroups,
  studentApplicationOptionsByStudentId,
  type AdvisorStudentApplicationOption,
} from "@/lib/advisor-student-application-options";
import { type ApplicationStatus } from "@/app/(protected)/admin/applications/_lib/application-status-labels";
import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import {
  fetchActiveApplicationPlans,
  hydrateApplicationsPlansEmbeds,
  type ApplicationPlanCatalogRow,
} from "@/lib/applications-plans";
import { mapApplicationToPaymentRequestOption } from "@/lib/payment-request-application-option";
import type { SendPaymentRequestApplicationOption } from "@/components/application-support/send-payment-request-dialog";
import { resolvePaymentFromEmailDisplay } from "@/lib/resend/application-payment-request-email";
import { expireOverduePendingPayments } from "@/lib/payment-request-utils";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const NON_ACTIVE_APPLICATION_STATUSES: ApplicationStatus[] = [
  "new",
  "scheduled",
  "payment_in_progress",
  "blocked",
];

type LeadRowRaw = {
  id: number;
  plan_id: number;
  student_id: string;
  student_name: string | null;
  student_email: string | null;
  school_name: string | null;
  package_data: unknown;
  created_at: string | null;
  scheduled_at: string | null;
  applications_plans:
    | { name: string; price: number; universities_count: number }
    | { name: string; price: number; universities_count: number }[]
    | null;
  schools: { name: string } | { name: string }[] | null;
  student_profiles:
    | { first_name: string; last_name: string; email?: string | null }
    | { first_name: string; last_name: string; email?: string | null }[]
    | null;
  payments:
    | {
        status: string | null;
        amount: number;
        due_date: string | null;
        payment_request_sent_at: string | null;
        payment_request_token: string | null;
      }
    | {
        status: string | null;
        amount: number;
        due_date: string | null;
        payment_request_sent_at: string | null;
        payment_request_token: string | null;
      }[]
    | null;
};

export type AdvisorNewLeadRow = {
  id: number;
  studentId: string;
  studentName: string;
  studentInitials: string;
  studentEmail: string;
  schoolName: string;
  dateBooked: string | null;
  meetingDate: string | null;
  paymentRequestOption: SendPaymentRequestApplicationOption;
};

export type AdvisorNewLeadsPanelProps = {
  rows: AdvisorNewLeadRow[];
  totalRows: number;
  page: number;
  limit: number;
  search: string;
  availablePlans: ApplicationPlanCatalogRow[];
  advisorName: string;
  advisorEmail: string;
  fromEmailDisplay: string;
  studentApplicationOptions: Record<string, AdvisorStudentApplicationOption[]>;
};

function paginationRange(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const from = (safePage - 1) * safeLimit;
  return { from, to: from + safeLimit - 1 };
}

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

function mapNewLeadRow(row: LeadRowRaw): AdvisorNewLeadRow {
  const profile = firstEmbed(row.student_profiles);
  const profileName = profile
    ? personName(profile.first_name, profile.last_name)
    : "";
  const studentName = profileName || row.student_name?.trim() || "Student";
  const studentEmail =
    profile?.email?.trim() || row.student_email?.trim() || "—";

  const school = firstEmbed(row.schools);
  const schoolName = school?.name?.trim() || row.school_name?.trim() || "—";

  return {
    id: row.id,
    studentId: row.student_id,
    studentName,
    studentInitials: studentInitials(studentName),
    studentEmail,
    schoolName,
    dateBooked: row.created_at,
    meetingDate: row.scheduled_at,
    paymentRequestOption: mapApplicationToPaymentRequestOption(row),
  };
}

export function parseAdvisorNewLeadsSearch(
  raw: string | string[] | undefined,
): string {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  return value?.trim() ?? "";
}

async function fetchPaidApplicationIds(
  client: DbClient,
  applicationIds: number[],
): Promise<number[]> {
  if (applicationIds.length === 0) return [];

  const { data, error } = await client
    .from("payments")
    .select("application_id")
    .eq("status", "paid")
    .in("application_id", applicationIds);

  if (error) {
    console.error("[fetchPaidApplicationIds]", error);
    return [];
  }

  return [...new Set((data ?? []).map((row) => row.application_id))];
}

async function fetchAdvisorNewLeadsPage(
  advisorId: string,
  options: { page: number; limit: number; search: string; client: DbClient },
): Promise<{ rows: AdvisorNewLeadRow[]; totalRows: number }> {
  const { page, limit, search, client } = options;
  const { from, to } = paginationRange(page, limit);

  const { data: assignedApps, error: assignedErr } = await client
    .from("applications")
    .select("id")
    .eq("assigned_to", advisorId);

  if (assignedErr) {
    console.error("[fetchAdvisorNewLeadsPage] assigned", assignedErr);
    return { rows: [], totalRows: 0 };
  }

  const assignedIds = (assignedApps ?? []).map((row) => row.id);
  if (assignedIds.length === 0) {
    return { rows: [], totalRows: 0 };
  }

  const paidApplicationIds = await fetchPaidApplicationIds(client, assignedIds);

  let query = client
    .from("applications")
    .select(
      `
      id,
      plan_id,
      student_id,
      student_name,
      student_email,
      school_name,
      package_data,
      created_at,
      scheduled_at,
      applications_plans!applications_plan_id_fkey ( name, price, universities_count ),
      schools ( name ),
      student_profiles ( first_name, last_name, email ),
      payments ( status, amount, due_date, payment_request_sent_at, payment_request_token )
    `,
      { count: "exact" },
    )
    .eq("assigned_to", advisorId)
    .in("status", NON_ACTIVE_APPLICATION_STATUSES)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (paidApplicationIds.length > 0) {
    query = query.not("id", "in", `(${paidApplicationIds.join(",")})`);
  }

  if (search) {
    const e = escapeIlike(search);
    query = query.or(`student_name.ilike.%${e}%,student_email.ilike.%${e}%`);
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("[fetchAdvisorNewLeadsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const hydratedRows = await hydrateApplicationsPlansEmbeds(
    client,
    (data ?? []) as unknown as LeadRowRaw[],
  );
  const rows = hydratedRows.map(mapNewLeadRow);

  return { rows, totalRows: count ?? 0 };
}

export async function fetchAdvisorNewLeadsPanel(options: {
  page: number;
  limit: number;
  search: string;
}): Promise<AdvisorNewLeadsPanelProps | null> {
  const supabase = await createSupabaseServerClient();
  const advisorId = await resolveCurrentAdvisorId(supabase);
  if (!advisorId) return null;

  await expireOverduePendingPayments(await createSupabaseSecretClient());

  const [pageResult, availablePlans, advisorProfile, applicationGroups] =
    await Promise.all([
    fetchAdvisorNewLeadsPage(advisorId, {
      ...options,
      client: supabase,
    }),
    fetchActiveApplicationPlans(supabase),
    supabase
      .from("advisors")
      .select("first_name, last_name, email")
      .eq("id", advisorId)
      .maybeSingle(),
    fetchAdvisorStudentApplicationGroups(supabase, advisorId),
  ]);

  const advisorName =
    [advisorProfile.data?.first_name, advisorProfile.data?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Advisor";
  const advisorEmail = advisorProfile.data?.email?.trim() || "";

  return {
    ...pageResult,
    page: options.page,
    limit: options.limit,
    search: options.search,
    availablePlans,
    advisorName,
    advisorEmail,
    fromEmailDisplay: resolvePaymentFromEmailDisplay(),
    studentApplicationOptions:
      studentApplicationOptionsByStudentId(applicationGroups),
  };
}
