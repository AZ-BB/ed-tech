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
  pickLatestPaymentRequestApplicationPerStudent,
  type PaymentRequestApplicationRowInput,
} from "@/lib/payment-request-application-option";
import {
  mapPostAdmissionToPaymentRequestOption,
  pickLatestPaymentRequestPostAdmissionPerStudent,
  type PaymentRequestPostAdmissionRowInput,
} from "@/lib/payment-request-post-admission-option";
import type { SendPostAdmissionPaymentRequestOption } from "@/components/post-admission-support/send-post-admission-payment-request-dialog";
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
  kind: "application" | "post_admission";
  referenceId: number;
  referenceLabel: string;
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
  pendingPaymentAmountAed: number | null;
  pendingPaymentDueDate: string | null;
  label: string;
  status?: string;
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
  /** Leads + active packages for Add manual payment (not collapsed per student). */
  manualPaymentApplications: AdvisorPaymentRequestApplicationOption[];
  paymentRequestPostAdmissionCases: SendPostAdmissionPaymentRequestOption[];
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

function paymentRequestSortKey(row: AdvisorPaymentRequestRow): number {
  const sent = row.sentAt ?? row.createdAt;
  if (!sent) return 0;
  const t = new Date(sent).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function paginateMergedRows<T>(rows: T[], page: number, limit: number): T[] {
  const { from } = paginationRange(page, limit);
  return rows.slice(from, from + limit);
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

type PostAdmissionPaymentRequestRowRaw = {
  id: number;
  amount: number;
  status: string | null;
  due_date: string | null;
  created_at: string | null;
  paid_at: string | null;
  payment_request_sent_at: string | null;
  post_admission_case_id: number;
  post_admission_cases:
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

function mapApplicationPaymentRequestRow(
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
    kind: "application",
    referenceId: row.application_id,
    referenceLabel: `#${row.application_id}`,
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

function mapPostAdmissionPaymentRequestRow(
  row: PostAdmissionPaymentRequestRowRaw,
): AdvisorPaymentRequestRow {
  const postAdmissionCase = firstEmbed(row.post_admission_cases);
  const profile = postAdmissionCase
    ? firstEmbed(postAdmissionCase.student_profiles)
    : null;
  const profileName = profile
    ? personName(profile.first_name, profile.last_name)
    : "";
  const studentName =
    profileName || postAdmissionCase?.student_name?.trim() || "Student";
  const studentEmail =
    profile?.email?.trim() || postAdmissionCase?.student_email?.trim() || "—";

  return {
    id: row.id,
    kind: "post_admission",
    referenceId: row.post_admission_case_id,
    referenceLabel: `Post-admission #${row.post_admission_case_id}`,
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

/** Payment requests that were sent, plus paid offline/manual activations. */
function isPaymentRequestListFilter() {
  return "payment_request_sent_at.not.is.null,payment_request_token.not.is.null,status.eq.paid";
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

async function fetchAssignedPostAdmissionCaseIds(
  client: DbClient,
  advisorId: string,
): Promise<number[]> {
  const { data, error } = await client
    .from("post_admission_cases")
    .select("id")
    .eq("assigned_to", advisorId);

  if (error) {
    console.error("[fetchAssignedPostAdmissionCaseIds]", error);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

async function countAdvisorPaymentRequestsForIds(
  client: DbClient,
  column: "application_id" | "post_admission_case_id",
  ids: number[],
  status: AdvisorPaymentRequestStatusFilter,
): Promise<number> {
  if (ids.length === 0) return 0;

  let query = client
    .from("payments")
    .select("id", { count: "exact", head: true })
    .in(column, ids)
    .or(isPaymentRequestListFilter());

  if (status === "pending") {
    query = query.eq("status", "pending");
  } else if (status === "completed") {
    query = query.eq("status", "paid");
  }

  const { count, error } = await query;
  if (error) {
    console.error("[countAdvisorPaymentRequestsForIds]", error);
    return 0;
  }

  return count ?? 0;
}

async function countAdvisorPaymentRequests(
  client: DbClient,
  applicationIds: number[],
  postAdmissionCaseIds: number[],
  status: AdvisorPaymentRequestStatusFilter,
): Promise<number> {
  const [applicationCount, postAdmissionCount] = await Promise.all([
    countAdvisorPaymentRequestsForIds(
      client,
      "application_id",
      applicationIds,
      status,
    ),
    countAdvisorPaymentRequestsForIds(
      client,
      "post_admission_case_id",
      postAdmissionCaseIds,
      status,
    ),
  ]);

  return applicationCount + postAdmissionCount;
}

async function fetchAdvisorPaymentRequestStatusCounts(
  client: DbClient,
  applicationIds: number[],
  postAdmissionCaseIds: number[],
): Promise<Record<AdvisorPaymentRequestStatusFilter, number>> {
  const [all, pending, completed] = await Promise.all([
    countAdvisorPaymentRequests(
      client,
      applicationIds,
      postAdmissionCaseIds,
      "all",
    ),
    countAdvisorPaymentRequests(
      client,
      applicationIds,
      postAdmissionCaseIds,
      "pending",
    ),
    countAdvisorPaymentRequests(
      client,
      applicationIds,
      postAdmissionCaseIds,
      "completed",
    ),
  ]);

  return { all, pending, completed };
}

async function fetchApplicationPaymentRequestRows(
  client: DbClient,
  advisorId: string,
  options: {
    search: string;
    status: AdvisorPaymentRequestStatusFilter;
  },
): Promise<AdvisorPaymentRequestRow[]> {
  const assignedApplicationIds = await fetchAssignedApplicationIds(
    client,
    advisorId,
  );
  if (assignedApplicationIds.length === 0) return [];

  let applicationIds = assignedApplicationIds;

  if (options.search) {
    const e = escapeIlike(options.search);
    const { data: matchingApps, error: appsErr } = await client
      .from("applications")
      .select("id")
      .eq("assigned_to", advisorId)
      .or(`student_name.ilike.%${e}%,student_email.ilike.%${e}%`);

    if (appsErr) {
      console.error(
        "[fetchApplicationPaymentRequestRows] application search",
        appsErr,
      );
      return [];
    }

    const matchingIds = new Set((matchingApps ?? []).map((app) => app.id));
    applicationIds = assignedApplicationIds.filter((id) => matchingIds.has(id));
    if (applicationIds.length === 0) return [];
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
    )
    .in("application_id", applicationIds)
    .or(isPaymentRequestListFilter())
    .order("payment_request_sent_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (options.status === "pending") {
    query = query.eq("status", "pending");
  } else if (options.status === "completed") {
    query = query.eq("status", "paid");
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchApplicationPaymentRequestRows]", error);
    return [];
  }

  return ((data ?? []) as unknown as PaymentRequestRowRaw[]).map(
    mapApplicationPaymentRequestRow,
  );
}

async function fetchPostAdmissionPaymentRequestRows(
  client: DbClient,
  advisorId: string,
  options: {
    search: string;
    status: AdvisorPaymentRequestStatusFilter;
  },
): Promise<AdvisorPaymentRequestRow[]> {
  const assignedCaseIds = await fetchAssignedPostAdmissionCaseIds(
    client,
    advisorId,
  );
  if (assignedCaseIds.length === 0) return [];

  let caseIds = assignedCaseIds;

  if (options.search) {
    const e = escapeIlike(options.search);
    const { data: matchingCases, error: casesErr } = await client
      .from("post_admission_cases")
      .select("id")
      .eq("assigned_to", advisorId)
      .or(`student_name.ilike.%${e}%,student_email.ilike.%${e}%`);

    if (casesErr) {
      console.error(
        "[fetchPostAdmissionPaymentRequestRows] case search",
        casesErr,
      );
      return [];
    }

    const matchingIds = new Set((matchingCases ?? []).map((row) => row.id));
    caseIds = assignedCaseIds.filter((id) => matchingIds.has(id));
    if (caseIds.length === 0) return [];
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
      post_admission_case_id,
      post_admission_cases (
        id,
        student_name,
        student_email,
        student_profiles ( first_name, last_name, email )
      )
    `,
    )
    .in("post_admission_case_id", caseIds)
    .or(isPaymentRequestListFilter())
    .order("payment_request_sent_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (options.status === "pending") {
    query = query.eq("status", "pending");
  } else if (options.status === "completed") {
    query = query.eq("status", "paid");
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchPostAdmissionPaymentRequestRows]", error);
    return [];
  }

  return ((data ?? []) as unknown as PostAdmissionPaymentRequestRowRaw[]).map(
    mapPostAdmissionPaymentRequestRow,
  );
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

  const [applicationRows, postAdmissionRows] = await Promise.all([
    fetchApplicationPaymentRequestRows(client, advisorId, { search, status }),
    fetchPostAdmissionPaymentRequestRows(client, advisorId, { search, status }),
  ]);

  const merged = [...applicationRows, ...postAdmissionRows].sort((a, b) => {
    const bySent = paymentRequestSortKey(b) - paymentRequestSortKey(a);
    if (bySent !== 0) return bySent;
    return b.id - a.id;
  });

  return {
    rows: paginateMergedRows(merged, page, limit),
    totalRows: merged.length,
  };
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
      student_id,
      plan_id,
      status,
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
    .neq("status", "not_suitable")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[fetchAdvisorPaymentRequestApplicationOptions]", error);
    return [];
  }

  const rows = await hydrateApplicationsPlansEmbeds(
    client,
    (data ?? []) as unknown as PaymentRequestApplicationRowRaw[],
  );

  return pickLatestPaymentRequestApplicationPerStudent(rows).map(
    mapApplicationToPaymentRequestOption,
  );
}

const MANUAL_PAYMENT_APPLICATION_STATUSES = [
  "intake_draft",
  "lead",
  "payment_requested",
  "active_package",
] as const;

/**
 * All lead + active applications for Add manual payment.
 * Does not collapse to one row per student so leads stay selectable.
 */
async function fetchAdvisorManualPaymentApplicationOptions(
  client: DbClient,
  advisorId: string,
): Promise<AdvisorPaymentRequestApplicationOption[]> {
  const { data, error } = await client
    .from("applications")
    .select(
      `
      id,
      student_id,
      plan_id,
      status,
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
    .in("status", [...MANUAL_PAYMENT_APPLICATION_STATUSES])
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[fetchAdvisorManualPaymentApplicationOptions]", error);
    return [];
  }

  const rows = await hydrateApplicationsPlansEmbeds(
    client,
    (data ?? []) as unknown as PaymentRequestApplicationRowRaw[],
  );

  const mapped = rows.map(mapApplicationToPaymentRequestOption);

  // Leads / payment-requested first, then paying customers.
  return mapped.sort((a, b) => {
    const aActive = a.status === "active_package" ? 1 : 0;
    const bActive = b.status === "active_package" ? 1 : 0;
    if (aActive !== bActive) return aActive - bActive;
    return a.studentName.localeCompare(b.studentName);
  });
}

async function fetchAdvisorPaymentRequestPostAdmissionOptions(
  client: DbClient,
  advisorId: string,
): Promise<SendPostAdmissionPaymentRequestOption[]> {
  const { data, error } = await client
    .from("post_admission_cases")
    .select(
      `
      id,
      student_id,
      status,
      student_name,
      student_email,
      updated_at,
      student_profiles ( first_name, last_name, email ),
      payments ( status, amount, due_date, payment_request_sent_at, payment_request_token )
    `,
    )
    .eq("assigned_to", advisorId)
    .neq("status", "not_suitable")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[fetchAdvisorPaymentRequestPostAdmissionOptions]", error);
    return [];
  }

  const rows = (data ?? []) as unknown as PaymentRequestPostAdmissionRowInput[];

  return pickLatestPaymentRequestPostAdmissionPerStudent(rows).map(
    mapPostAdmissionToPaymentRequestOption,
  );
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
  const assignedPostAdmissionCaseIds = await fetchAssignedPostAdmissionCaseIds(
    supabase,
    advisorId,
  );

  const [
    paymentRequests,
    paymentRequestStatusCounts,
    payouts,
    payoutPercentage,
    paymentRequestApplications,
    manualPaymentApplications,
    paymentRequestPostAdmissionCases,
    availablePlans,
    advisorProfile,
  ] = await Promise.all([
    fetchAdvisorPaymentRequestsPage(supabase, advisorId, {
      page: options.paymentRequestsPage,
      limit: options.paymentRequestsLimit,
      search: options.paymentRequestsSearch,
      status: options.paymentRequestsStatus,
    }),
    fetchAdvisorPaymentRequestStatusCounts(
      supabase,
      assignedApplicationIds,
      assignedPostAdmissionCaseIds,
    ),
    fetchAdvisorPayoutsPage(supabase, advisorId, {
      page: options.payoutsPage,
      pageSize: options.payoutsLimit,
      status: options.payoutsStatus,
    }),
    fetchAdvisorPayoutPercentage(supabase, advisorId),
    fetchAdvisorPaymentRequestApplicationOptions(supabase, advisorId),
    fetchAdvisorManualPaymentApplicationOptions(supabase, advisorId),
    fetchAdvisorPaymentRequestPostAdmissionOptions(supabase, advisorId),
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
    manualPaymentApplications,
    paymentRequestPostAdmissionCases,
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
