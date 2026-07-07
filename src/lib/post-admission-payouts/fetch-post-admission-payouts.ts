import "server-only";

import type {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

import type { ApplicationPayoutRow, ApplicationPayoutSummary, PayoutStatus } from "../advisor-payouts/types";

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
  post_admission_case_id: number | null;
  percentage: number;
  amount: number;
  status: string | null;
  paid_at: string | null;
  created_at: string | null;
  payments:
    | { amount: number; paid_at: string | null }
    | { amount: number; paid_at: string | null }[]
    | null;
  advisors:
    | { first_name: string; last_name: string; email: string | null }
    | { first_name: string; last_name: string; email: string | null }[]
    | null;
};

const PAYOUT_SELECT = `
  id,
  advisor_id,
  payment_id,
  post_admission_case_id,
  percentage,
  amount,
  status,
  paid_at,
  created_at,
  payments ( amount, paid_at ),
  advisors ( first_name, last_name, email )
`;

function mapPostAdmissionPayoutRow(row: PayoutRowRaw): ApplicationPayoutRow {
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
    paymentPaidAt: payment?.paid_at ?? null,
    applicationId: row.post_admission_case_id ?? 0,
    percentage: row.percentage,
    amount: row.amount,
    status: mapPayoutStatus(row.status),
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

export async function fetchPostAdmissionPayouts(
  client: PayoutsDbClient,
  caseId: number,
): Promise<ApplicationPayoutRow[]> {
  const { data, error } = await client
    .from("advisor_payouts")
    .select(PAYOUT_SELECT)
    .eq("post_admission_case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchPostAdmissionPayouts]", error);
    return [];
  }

  return (data ?? []).map((row: PayoutRowRaw) => mapPostAdmissionPayoutRow(row));
}

export async function fetchPostAdmissionPayoutSummary(
  client: PayoutsDbClient,
  caseId: number,
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
    .eq("post_admission_case_id", caseId);

  if (error) {
    console.error("[fetchPostAdmissionPayoutSummary]", error);
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
