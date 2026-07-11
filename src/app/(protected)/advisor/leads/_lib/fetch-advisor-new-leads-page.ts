import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import { type ApplicationStatus } from "@/app/(protected)/admin/applications/_lib/application-status-labels";
import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import {
  fetchActiveApplicationPlans,
  hydrateApplicationsPlansEmbeds,
  type ApplicationPlanCatalogRow,
} from "@/lib/applications-plans";
import { mapApplicationToPaymentRequestOption } from "@/lib/payment-request-application-option";
import { mapPostAdmissionToPaymentRequestOption } from "@/lib/payment-request-post-admission-option";
import { formatPostAdmissionServiceLabel } from "@/lib/post-admission-services";
import type { SendPaymentRequestApplicationOption } from "@/components/application-support/send-payment-request-dialog";
import type { SendPostAdmissionPaymentRequestOption } from "@/components/post-admission-support/send-post-admission-payment-request-dialog";
import { resolvePaymentFromEmailDisplay } from "@/lib/resend/application-payment-request-email";
import { expireOverduePendingPayments } from "@/lib/payment-request-utils";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const NON_ACTIVE_APPLICATION_STATUSES: ApplicationStatus[] = ["lead"];

type ApplicationLeadRowRaw = {
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

type PostAdmissionLeadRowRaw = {
  id: number;
  student_id: string;
  student_name: string | null;
  student_email: string | null;
  school_name: string | null;
  selected_service: string | null;
  service_other_detail: string | null;
  created_at: string | null;
  scheduled_at: string | null;
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

export type AdvisorNewLeadRow =
  | {
      kind: "application";
      id: number;
      studentId: string;
      studentName: string;
      studentInitials: string;
      studentEmail: string;
      schoolName: string;
      dateBooked: string | null;
      meetingDate: string | null;
      paymentRequestOption: SendPaymentRequestApplicationOption;
    }
  | {
      kind: "post_admission";
      id: number;
      studentId: string;
      studentName: string;
      studentInitials: string;
      studentEmail: string;
      schoolName: string;
      serviceLabel: string;
      dateBooked: string | null;
      meetingDate: string | null;
      paymentRequestOption: SendPostAdmissionPaymentRequestOption;
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

function mapApplicationLeadRow(row: ApplicationLeadRowRaw): AdvisorNewLeadRow {
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
    kind: "application",
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

function mapPostAdmissionLeadRow(row: PostAdmissionLeadRowRaw): AdvisorNewLeadRow {
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
    kind: "post_admission",
    id: row.id,
    studentId: row.student_id,
    studentName,
    studentInitials: studentInitials(studentName),
    studentEmail,
    schoolName,
    serviceLabel: formatPostAdmissionServiceLabel(
      row.selected_service,
      row.service_other_detail,
    ),
    dateBooked: row.created_at,
    meetingDate: row.scheduled_at,
    paymentRequestOption: mapPostAdmissionToPaymentRequestOption(row),
  };
}

function matchesSearch(row: AdvisorNewLeadRow, search: string): boolean {
  if (!search) return true;
  const needle = search.toLowerCase();
  return (
    row.studentName.toLowerCase().includes(needle) ||
    row.studentEmail.toLowerCase().includes(needle)
  );
}

async function fetchApplicationLeads(
  advisorId: string,
  search: string,
  client: DbClient,
): Promise<AdvisorNewLeadRow[]> {
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
    )
    .eq("assigned_to", advisorId)
    .in("status", NON_ACTIVE_APPLICATION_STATUSES)
    .order("created_at", { ascending: false });

  if (search) {
    const e = escapeIlike(search);
    query = query.or(`student_name.ilike.%${e}%,student_email.ilike.%${e}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchApplicationLeads]", error);
    return [];
  }

  const hydratedRows = await hydrateApplicationsPlansEmbeds(
    client,
    (data ?? []) as unknown as ApplicationLeadRowRaw[],
  );
  return hydratedRows.map(mapApplicationLeadRow);
}

async function fetchPostAdmissionLeads(
  advisorId: string,
  search: string,
  client: DbClient,
): Promise<AdvisorNewLeadRow[]> {
  let query = client
    .from("post_admission_cases")
    .select(
      `
      id,
      student_id,
      student_name,
      student_email,
      school_name,
      selected_service,
      service_other_detail,
      created_at,
      scheduled_at,
      schools ( name ),
      student_profiles ( first_name, last_name, email ),
      payments ( status, amount, due_date, payment_request_sent_at, payment_request_token )
    `,
    )
    .eq("assigned_to", advisorId)
    .eq("status", "lead")
    .order("created_at", { ascending: false });

  if (search) {
    const e = escapeIlike(search);
    query = query.or(`student_name.ilike.%${e}%,student_email.ilike.%${e}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchPostAdmissionLeads]", error);
    return [];
  }

  return (data ?? []).map((row) =>
    mapPostAdmissionLeadRow(row as PostAdmissionLeadRowRaw),
  );
}

export function parseAdvisorNewLeadsSearch(
  raw: string | string[] | undefined,
): string {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  return value?.trim() ?? "";
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

  const [applicationRows, postAdmissionRows, availablePlans, advisorProfile] =
    await Promise.all([
      fetchApplicationLeads(advisorId, options.search, supabase),
      fetchPostAdmissionLeads(advisorId, options.search, supabase),
      fetchActiveApplicationPlans(supabase),
      supabase
        .from("advisors")
        .select("first_name, last_name, email")
        .eq("id", advisorId)
        .maybeSingle(),
    ]);

  const merged = [...applicationRows, ...postAdmissionRows]
    .filter((row) => matchesSearch(row, options.search))
    .sort((a, b) => {
      const aTime = a.dateBooked ? new Date(a.dateBooked).getTime() : 0;
      const bTime = b.dateBooked ? new Date(b.dateBooked).getTime() : 0;
      return bTime - aTime;
    });

  const totalRows = merged.length;
  const { from, to } = paginationRange(options.page, options.limit);
  const rows = merged.slice(from, to + 1);

  const advisorName =
    [advisorProfile.data?.first_name, advisorProfile.data?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Advisor";
  const advisorEmail = advisorProfile.data?.email?.trim() || "";

  return {
    rows,
    totalRows,
    page: options.page,
    limit: options.limit,
    search: options.search,
    availablePlans,
    advisorName,
    advisorEmail,
    fromEmailDisplay: resolvePaymentFromEmailDisplay(),
  };
}
