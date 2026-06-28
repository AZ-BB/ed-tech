import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import { fetchAdvisorPayoutsPage } from "@/lib/advisor-payouts/fetch-application-payouts";
import type { AdvisorPayoutStatusFilter } from "@/lib/advisor-payouts/fetch-application-payouts";
import type {
  AdvisorPayoutsSummary,
  AdvisorPayoutTableRow,
} from "@/lib/advisor-payouts/types";
import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import {
  fetchActiveApplicationPlans,
  hydrateApplicationsPlansEmbeds,
} from "@/lib/applications-plans";
import type { ApplicationPlanCatalogRow } from "@/lib/applications-plans";
import { resolvePaymentFromEmailDisplay } from "@/lib/resend/application-payment-request-email";
import {
  mapApplicationToPaymentRequestOption,
  type PaymentRequestApplicationRowInput,
} from "@/lib/payment-request-application-option";
import {
  expireOverduePendingPayments,
  resolvePaymentDisplayStatus,
} from "@/lib/payment-request-utils";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type AdvisorPaymentRequestRow = {
  id: number;
  applicationId: number;
  studentName: string;
  studentInitials: string;
  studentEmail: string;
  amount: number;
  status: string;
  dueDate: string | null;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string | null;
};

export type AdvisorPaymentRequestApplicationOption = {
  applicationId: number;
  planId: number;
  studentName: string;
  studentFirstName: string;
  studentEmail: string;
  planPrice: number;
  universitiesTotal: number;
  totalPaid: number;
  totalPaymentsAed: number;
  hasPendingPaymentRequest: boolean;
  label: string;
};

export type AdvisorPaymentsTab = "requests" | "payouts";

export type AdvisorPaymentRequestStatusFilter = "all" | "pending" | "completed";

export type { AdvisorPayoutStatusFilter };

export type AdvisorPaymentsPanelProps = {
  tab: AdvisorPaymentsTab;
  payoutPercentage: number;
  advisorName: string;
  advisorEmail: string;
  fromEmailDisplay: string;
  availablePlans: ApplicationPlanCatalogRow[];
  paymentRequestApplications: AdvisorPaymentRequestApplicationOption[];
  paymentRequests: {
    rows: AdvisorPaymentRequestRow[];
    totalRows: number;
    page: number;
    limit: number;
    search: string;
    status: AdvisorPaymentRequestStatusFilter;
    statusCounts: Record<AdvisorPaymentRequestStatusFilter, number>;
  };
  payouts: {
    rows: AdvisorPayoutTableRow[];
    summary: AdvisorPayoutsSummary;
    totalRows: number;
    page: number;
    limit: number;
    status: AdvisorPayoutStatusFilter;
    statusCounts: Record<AdvisorPayoutStatusFilter, number>;
  };
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

type PaymentRequestRowRaw = {
  id: number;
  amount: number;
  status: string | null;
  due_date: string | null;
  created_at: string | null;
  paid_at: string | null;
  payment_request_sent_at: string | null;
  application_id: number;
  applications:
    | {
        id: number;
        student_name: string | null;
        student_email: string | null;
        student_profiles:
          | { first_name: string; last_name: string; email?: string | null }
          | { first_name: string; last_name: string; email?: string | null }[]
          | null;
      }
    | {
        id: number;
        student_name: string | null;
        student_email: string | null;
        student_profiles:
          | { first_name: string; last_name: string; email?: string | null }
          | { first_name: string; last_name: string; email?: string | null }[]
          | null;
      }[];
};

function mapPaymentRequestRow(
  row: PaymentRequestRowRaw,
): AdvisorPaymentRequestRow {
  const application = firstEmbed(row.applications);
  const profile = application ? firstEmbed(application.student_profiles) : null;
  const profileName = profile
    ? personName(profile.first_name, profile.last_name)
    : "";
  const studentName =
    profileName || application?.student_name?.trim() || "Student";
  const studentEmail =
    profile?.email?.trim() || application?.student_email?.trim() || "—";

  return {
    id: row.id,
    applicationId: row.application_id,
    studentName,
    studentInitials: studentInitials(studentName),
    studentEmail,
    amount: row.amount,
    status: resolvePaymentDisplayStatus({
      status: row.status,
      due_date: row.due_date,
    }),
    dueDate: row.due_date,
    sentAt: row.payment_request_sent_at,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

export function parseAdvisorPaymentsTab(
  raw: string | string[] | undefined,
): AdvisorPaymentsTab {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  return value === "payouts" ? "payouts" : "requests";
}

export function parseAdvisorPaymentsSearch(
  raw: string | string[] | undefined,
): string {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  return value?.trim() ?? "";
}

export function parseAdvisorPaymentRequestStatusFilter(
  raw: string | string[] | undefined,
): AdvisorPaymentRequestStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (value === "pending" || value === "completed") return value;
  return "all";
}

export function parseAdvisorPayoutStatusFilter(
  raw: string | string[] | undefined,
): AdvisorPayoutStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (value === "pending" || value === "completed") return value;
  return "all";
}

function isPaymentRequestSentFilter() {
  return "payment_request_sent_at.not.is.null,payment_request_token.not.is.null";
}

async function fetchAssignedApplicationIds(
  client: DbClient,
  advisorId: string,
): Promise<number[]> {
  const { data, error } = await client
    .from("applications")
    .select("id")
    .eq("assigned_to", advisorId);

  if (error) {
    console.error("[fetchAssignedApplicationIds]", error);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

async function countAdvisorPaymentRequests(
  client: DbClient,
  applicationIds: number[],
  status: AdvisorPaymentRequestStatusFilter,
): Promise<number> {
  if (applicationIds.length === 0) return 0;

  let query = client
    .from("payments")
    .select("id", { count: "exact", head: true })
    .in("application_id", applicationIds)
    .or(isPaymentRequestSentFilter());

  if (status === "pending") {
    query = query.eq("status", "pending");
  } else if (status === "completed") {
    query = query.eq("status", "paid");
  }

  const { count, error } = await query;
  if (error) {
    console.error("[countAdvisorPaymentRequests]", error);
    return 0;
  }

  return count ?? 0;
}

async function fetchAdvisorPaymentRequestStatusCounts(
  client: DbClient,
  applicationIds: number[],
): Promise<Record<AdvisorPaymentRequestStatusFilter, number>> {
  const [all, pending, completed] = await Promise.all([
    countAdvisorPaymentRequests(client, applicationIds, "all"),
    countAdvisorPaymentRequests(client, applicationIds, "pending"),
    countAdvisorPaymentRequests(client, applicationIds, "completed"),
  ]);

  return { all, pending, completed };
}

async function fetchAdvisorPaymentRequestsPage(
  client: DbClient,
  advisorId: string,
  options: {
    page: number;
    limit: number;
    search: string;
    status: AdvisorPaymentRequestStatusFilter;
  },
): Promise<{ rows: AdvisorPaymentRequestRow[]; totalRows: number }> {
  const { page, limit, search, status } = options;
  const { from, to } = paginationRange(page, limit);

  const assignedApplicationIds = await fetchAssignedApplicationIds(
    client,
    advisorId,
  );
  if (assignedApplicationIds.length === 0) {
    return { rows: [], totalRows: 0 };
  }

  let applicationIds = assignedApplicationIds;

  if (search) {
    const e = escapeIlike(search);
    const { data: matchingApps, error: appsErr } = await client
      .from("applications")
      .select("id")
      .eq("assigned_to", advisorId)
      .or(`student_name.ilike.%${e}%,student_email.ilike.%${e}%`);

    if (appsErr) {
      console.error(
        "[fetchAdvisorPaymentRequestsPage] application search",
        appsErr,
      );
      return { rows: [], totalRows: 0 };
    }

    const matchingIds = new Set((matchingApps ?? []).map((app) => app.id));
    applicationIds = assignedApplicationIds.filter((id) => matchingIds.has(id));
    if (applicationIds.length === 0) {
      return { rows: [], totalRows: 0 };
    }
  }

  let query = client
    .from("payments")
    .select(
      `
      id,
      amount,
      status,
      due_date,
      created_at,
      paid_at,
      payment_request_sent_at,
      application_id,
      applications (
        id,
        student_name,
        student_email,
        student_profiles ( first_name, last_name, email )
      )
    `,
      { count: "exact" },
    )
    .in("application_id", applicationIds)
    .or(isPaymentRequestSentFilter())
    .order("payment_request_sent_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (status === "pending") {
    query = query.eq("status", "pending");
  } else if (status === "completed") {
    query = query.eq("status", "paid");
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("[fetchAdvisorPaymentRequestsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const rows = ((data ?? []) as unknown as PaymentRequestRowRaw[]).map(
    mapPaymentRequestRow,
  );

  return { rows, totalRows: count ?? 0 };
}

async function fetchAdvisorPayoutPercentage(
  client: DbClient,
  advisorId: string,
): Promise<number> {
  const { data, error } = await client
    .from("advisors")
    .select("payout_percentage")
    .eq("id", advisorId)
    .maybeSingle();

  if (error) {
    console.error("[fetchAdvisorPayoutPercentage]", error);
    return 0;
  }

  return data?.payout_percentage ?? 0;
}

type PaymentRequestApplicationRowRaw = PaymentRequestApplicationRowInput;

async function fetchAdvisorPaymentRequestApplicationOptions(
  client: DbClient,
  advisorId: string,
): Promise<AdvisorPaymentRequestApplicationOption[]> {
  const { data, error } = await client
    .from("applications")
    .select(
      `
      id,
      plan_id,
      student_name,
      student_email,
      package_data,
      updated_at,
      applications_plans!applications_plan_id_fkey ( name, price, universities_count ),
      student_profiles ( first_name, last_name, email ),
      payments ( status, amount, due_date, payment_request_sent_at, payment_request_token )
    `,
    )
    .eq("assigned_to", advisorId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[fetchAdvisorPaymentRequestApplicationOptions]", error);
    return [];
  }

  const rows = await hydrateApplicationsPlansEmbeds(
    client,
    (data ?? []) as unknown as PaymentRequestApplicationRowRaw[],
  );

  return rows.map(mapApplicationToPaymentRequestOption);
}

export async function fetchAdvisorPaymentsPanel(options: {
  tab: AdvisorPaymentsTab;
  paymentRequestsPage: number;
  paymentRequestsLimit: number;
  paymentRequestsSearch: string;
  paymentRequestsStatus: AdvisorPaymentRequestStatusFilter;
  payoutsPage: number;
  payoutsLimit: number;
  payoutsStatus: AdvisorPayoutStatusFilter;
}): Promise<AdvisorPaymentsPanelProps | null> {
  const supabase = await createSupabaseServerClient();
  const advisorId = await resolveCurrentAdvisorId(supabase);
  if (!advisorId) return null;

  await expireOverduePendingPayments(await createSupabaseSecretClient());

  const assignedApplicationIds = await fetchAssignedApplicationIds(
    supabase,
    advisorId,
  );

  const [
    paymentRequests,
    paymentRequestStatusCounts,
    payouts,
    payoutPercentage,
    paymentRequestApplications,
    availablePlans,
    advisorProfile,
  ] = await Promise.all([
    fetchAdvisorPaymentRequestsPage(supabase, advisorId, {
      page: options.paymentRequestsPage,
      limit: options.paymentRequestsLimit,
      search: options.paymentRequestsSearch,
      status: options.paymentRequestsStatus,
    }),
    fetchAdvisorPaymentRequestStatusCounts(supabase, assignedApplicationIds),
    fetchAdvisorPayoutsPage(supabase, advisorId, {
      page: options.payoutsPage,
      pageSize: options.payoutsLimit,
      status: options.payoutsStatus,
    }),
    fetchAdvisorPayoutPercentage(supabase, advisorId),
    fetchAdvisorPaymentRequestApplicationOptions(supabase, advisorId),
    fetchActiveApplicationPlans(supabase),
    supabase
      .from("advisors")
      .select("first_name, last_name, email")
      .eq("id", advisorId)
      .maybeSingle(),
  ]);

  const advisorName =
    [advisorProfile.data?.first_name, advisorProfile.data?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Advisor";
  const advisorEmail = advisorProfile.data?.email?.trim() || "";

  return {
    tab: options.tab,
    payoutPercentage,
    advisorName,
    advisorEmail,
    fromEmailDisplay: resolvePaymentFromEmailDisplay(),
    availablePlans,
    paymentRequestApplications,
    paymentRequests: {
      ...paymentRequests,
      page: options.paymentRequestsPage,
      limit: options.paymentRequestsLimit,
      search: options.paymentRequestsSearch,
      status: options.paymentRequestsStatus,
      statusCounts: paymentRequestStatusCounts,
    },
    payouts: {
      rows: payouts.rows,
      summary: payouts.summary,
      totalRows: payouts.total,
      page: payouts.page,
      limit: payouts.pageSize,
      status: options.payoutsStatus,
      statusCounts: payouts.statusCounts,
    },
  };
}
