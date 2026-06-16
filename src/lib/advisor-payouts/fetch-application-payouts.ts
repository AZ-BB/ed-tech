import "server-only";

import type {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

import type {
  ApplicationPaymentPayout,
  ApplicationPayoutRow,
  ApplicationPayoutSummary,
  AdvisorPayoutsSummary,
  AdvisorPayoutTableRow,
  PayoutStatus,
} from "./types";

type PayoutsDbClient =
  | Awaited<ReturnType<typeof createSupabaseSecretClient>>
  | Awaited<ReturnType<typeof createSupabaseServerClient>>;

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function personName(first: string | null | undefined, last: string | null | undefined): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(" ").trim();
}

function mapPayoutStatus(raw: string | null | undefined): PayoutStatus {
  if (raw === "paid" || raw === "canceled") return raw;
  return "pending";
}

type PayoutRowRaw = {
  id: number;
  advisor_id: string;
  payment_id: number;
  application_id: number;
  percentage: number;
  amount: number;
  status: string | null;
  paid_at: string | null;
  created_at: string | null;
  payments: { amount: number } | { amount: number }[] | null;
  advisors:
    | { first_name: string; last_name: string; email: string | null }
    | { first_name: string; last_name: string; email: string | null }[]
    | null;
};

function mapApplicationPayoutRow(row: PayoutRowRaw): ApplicationPayoutRow {
  const advisor = firstEmbed(row.advisors);
  const payment = firstEmbed(row.payments);
  const advisorName =
    personName(advisor?.first_name, advisor?.last_name) ||
    advisor?.email?.trim() ||
    "Advisor";

  return {
    id: row.id,
    advisorId: row.advisor_id,
    advisorName,
    paymentId: row.payment_id,
    paymentAmount: payment?.amount ?? 0,
    applicationId: row.application_id,
    percentage: row.percentage,
    amount: row.amount,
    status: mapPayoutStatus(row.status),
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

const PAYOUT_SELECT = `
  id,
  advisor_id,
  payment_id,
  application_id,
  percentage,
  amount,
  status,
  paid_at,
  created_at,
  payments ( amount ),
  advisors ( first_name, last_name, email )
`;

export async function fetchApplicationPayouts(
  client: PayoutsDbClient,
  applicationId: number,
): Promise<ApplicationPayoutRow[]> {
  const { data, error } = await client
    .from("advisor_payouts")
    .select(PAYOUT_SELECT)
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchApplicationPayouts]", error);
    return [];
  }

  return (data ?? []).map((row: PayoutRowRaw) => mapApplicationPayoutRow(row));
}

export async function fetchPayoutsByPaymentIds(
  client: PayoutsDbClient,
  paymentIds: number[],
): Promise<Map<number, ApplicationPaymentPayout>> {
  const map = new Map<number, ApplicationPaymentPayout>();
  if (paymentIds.length === 0) return map;

  const { data, error } = await client
    .from("advisor_payouts")
    .select("payment_id, percentage, amount, status")
    .in("payment_id", paymentIds);

  if (error) {
    console.error("[fetchPayoutsByPaymentIds]", error);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.payment_id, {
      percentage: row.percentage,
      amount: row.amount,
      status: mapPayoutStatus(row.status),
    });
  }

  return map;
}

export async function fetchApplicationPayoutSummary(
  client: PayoutsDbClient,
  applicationId: number,
  advisorId: string | null,
): Promise<ApplicationPayoutSummary> {
  let payoutPercentage = 0;

  if (advisorId) {
    const { data: advisor } = await client
      .from("advisors")
      .select("payout_percentage")
      .eq("id", advisorId)
      .maybeSingle();

    payoutPercentage = advisor?.payout_percentage ?? 0;
  }

  const { data, error } = await client
    .from("advisor_payouts")
    .select("amount, status")
    .eq("application_id", applicationId);

  if (error) {
    console.error("[fetchApplicationPayoutSummary]", error);
    return {
      payoutPercentage,
      pendingAmount: 0,
      pendingCount: 0,
      paidAmount: 0,
      paidCount: 0,
    };
  }

  let pendingAmount = 0;
  let pendingCount = 0;
  let paidAmount = 0;
  let paidCount = 0;

  for (const row of data ?? []) {
    const status = mapPayoutStatus(row.status);
    if (status === "pending") {
      pendingAmount += row.amount;
      pendingCount += 1;
    } else if (status === "paid") {
      paidAmount += row.amount;
      paidCount += 1;
    }
  }

  return {
    payoutPercentage,
    pendingAmount,
    pendingCount,
    paidAmount,
    paidCount,
  };
}

type AdvisorPayoutListRowRaw = PayoutRowRaw & {
  applications: { student_name: string | null } | { student_name: string | null }[] | null;
};

export type AdvisorPayoutStatusFilter = "all" | "pending" | "completed";

async function countAdvisorPayouts(
  client: PayoutsDbClient,
  advisorId: string,
  status: AdvisorPayoutStatusFilter,
): Promise<number> {
  let query = client
    .from("advisor_payouts")
    .select("id", { count: "exact", head: true })
    .eq("advisor_id", advisorId);

  if (status === "pending") {
    query = query.eq("status", "pending");
  } else if (status === "completed") {
    query = query.eq("status", "paid");
  }

  const { count, error } = await query;
  if (error) {
    console.error("[countAdvisorPayouts]", error);
    return 0;
  }

  return count ?? 0;
}

export async function fetchAdvisorPayoutsPage(
  client: PayoutsDbClient,
  advisorId: string,
  options?: {
    page?: number;
    pageSize?: number;
    status?: AdvisorPayoutStatusFilter;
  },
): Promise<{
  rows: AdvisorPayoutTableRow[];
  summary: AdvisorPayoutsSummary;
  statusCounts: Record<AdvisorPayoutStatusFilter, number>;
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 20));
  const status = options?.status ?? "all";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [statusCounts, countResult] = await Promise.all([
    Promise.all([
      countAdvisorPayouts(client, advisorId, "all"),
      countAdvisorPayouts(client, advisorId, "pending"),
      countAdvisorPayouts(client, advisorId, "completed"),
    ]).then(([all, pending, completed]) => ({ all, pending, completed })),
    (async () => {
      let countQuery = client
        .from("advisor_payouts")
        .select("id", { count: "exact", head: true })
        .eq("advisor_id", advisorId);

      if (status === "pending") {
        countQuery = countQuery.eq("status", "pending");
      } else if (status === "completed") {
        countQuery = countQuery.eq("status", "paid");
      }

      return countQuery;
    })(),
  ]);

  const { count, error: countErr } = await countResult;

  if (countErr) {
    console.error("[fetchAdvisorPayoutsPage] count", countErr);
  }

  let dataQuery = client
    .from("advisor_payouts")
    .select(
      `
      ${PAYOUT_SELECT},
      applications ( student_name )
    `,
    )
    .eq("advisor_id", advisorId)
    .order("created_at", { ascending: false });

  if (status === "pending") {
    dataQuery = dataQuery.eq("status", "pending");
  } else if (status === "completed") {
    dataQuery = dataQuery.eq("status", "paid");
  }

  const { data, error } = await dataQuery.range(from, to);

  if (error) {
    console.error("[fetchAdvisorPayoutsPage]", error);
    return {
      rows: [],
      summary: {
        totalPaidToAdvisor: 0,
        totalPending: 0,
        totalRevenueToApp: 0,
        paidCount: 0,
        pendingCount: 0,
      },
      statusCounts,
      total: 0,
      page,
      pageSize,
    };
  }

  const rows: AdvisorPayoutTableRow[] = (data ?? []).map((row: AdvisorPayoutListRowRaw) => {
    const base = mapApplicationPayoutRow(row);
    const application = firstEmbed(row.applications);
    return {
      ...base,
      studentName: application?.student_name?.trim() || null,
    };
  });

  const { data: allPayouts, error: summaryErr } = await client
    .from("advisor_payouts")
    .select("amount, status, payment_id, payments ( amount )")
    .eq("advisor_id", advisorId);

  if (summaryErr) {
    console.error("[fetchAdvisorPayoutsPage] summary", summaryErr);
  }

  let totalPaidToAdvisor = 0;
  let totalPending = 0;
  let totalRevenueToApp = 0;
  let paidCount = 0;
  let pendingCount = 0;

  for (const row of allPayouts ?? []) {
    const status = mapPayoutStatus(row.status);
    const payment = firstEmbed(row.payments as { amount: number } | { amount: number }[] | null);

    if (status === "paid") {
      totalPaidToAdvisor += row.amount;
      paidCount += 1;
    } else if (status === "pending") {
      totalPending += row.amount;
      pendingCount += 1;
    }

    if (payment?.amount) {
      totalRevenueToApp += payment.amount;
    }
  }

  return {
    rows,
    summary: {
      totalPaidToAdvisor,
      totalPending,
      totalRevenueToApp,
      paidCount,
      pendingCount,
    },
    statusCounts,
    total: count ?? 0,
    page,
    pageSize,
  };
}

// Re-export type used by application-detail-mapper
export type { ApplicationPaymentPayout } from "./types";
