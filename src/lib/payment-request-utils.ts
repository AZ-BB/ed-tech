import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type PaymentRequestSentFields =
  | {
      payment_request_sent_at?: string | null;
      payment_request_token?: string | null;
    }
  | {
      paymentRequestSentAt?: string | null;
      paymentRequestToken?: string | null;
    }
  | {
      requestedAt?: string | null;
    };

export type PaymentDueDateFields = {
  status?: string | null;
  due_date?: string | null;
  dueDate?: string | null;
};

export function isPaymentRequestSent(payment: PaymentRequestSentFields): boolean {
  if ("payment_request_sent_at" in payment || "payment_request_token" in payment) {
    return Boolean(
      payment.payment_request_sent_at?.trim() || payment.payment_request_token?.trim(),
    );
  }
  if ("paymentRequestSentAt" in payment || "paymentRequestToken" in payment) {
    return Boolean(
      payment.paymentRequestSentAt?.trim() || payment.paymentRequestToken?.trim(),
    );
  }
  if ("requestedAt" in payment) {
    return Boolean(payment.requestedAt?.trim());
  }
  return false;
}

function resolveDueDate(payment: PaymentDueDateFields): string | null {
  const raw = payment.due_date ?? payment.dueDate ?? null;
  if (!raw?.trim()) return null;
  return raw.trim().slice(0, 10);
}

/** Returns today's date as YYYY-MM-DD in local time. */
export function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Default due date: 7 days from today (local). */
export function defaultPaymentDueDateString(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isPaymentOverdue(
  payment: PaymentDueDateFields & { status?: string | null },
  referenceDate = todayDateString(),
): boolean {
  if (payment.status !== "pending") return false;
  const dueDate = resolveDueDate(payment);
  if (!dueDate) return false;
  return referenceDate > dueDate;
}

export function resolvePaymentDisplayStatus(
  payment: PaymentDueDateFields & { status?: string | null },
  referenceDate = todayDateString(),
): string {
  const status = payment.status?.trim() || "pending";
  if (status === "pending" && isPaymentOverdue(payment, referenceDate)) {
    return "failed";
  }
  return status;
}

export function hasActivePendingPaymentRequest(
  payments: { status: string | null; [key: string]: unknown }[],
  referenceDate = todayDateString(),
): boolean {
  return payments.some((payment) => {
    if (payment.status !== "pending") return false;
    if (!isPaymentRequestSent(payment as PaymentRequestSentFields)) return false;
    return !isPaymentOverdue(payment as PaymentDueDateFields, referenceDate);
  });
}

export async function expireOverduePendingPayments(
  secret: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  options: { applicationId?: number } = {},
): Promise<number> {
  const referenceDate = todayDateString();

  let fetchQuery = secret.from("payments").select("id, status, due_date").eq("status", "pending");

  if (options.applicationId != null) {
    fetchQuery = fetchQuery.eq("application_id", options.applicationId);
  }

  const { data, error } = await fetchQuery;

  if (error) {
    console.error("[expireOverduePendingPayments] fetch", error);
    return 0;
  }

  const overdueIds = (data ?? [])
    .filter((row) => isPaymentOverdue(row, referenceDate))
    .map((row) => row.id);

  if (overdueIds.length === 0) return 0;

  const now = new Date().toISOString();

  for (const id of overdueIds) {
    const { error: updateErr } = await secret
      .from("payments")
      .update({
        status: "failed",
        payment_request_token: null,
        updated_at: now,
      })
      .eq("id", id);

    if (updateErr) {
      console.error("[expireOverduePendingPayments] update", id, updateErr);
    }
  }

  return overdueIds.length;
}

export function parseDueDateInput(raw: string): string | null {
  const trimmed = raw.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = Date.parse(`${trimmed}T12:00:00`);
  if (!Number.isFinite(parsed)) return null;
  return trimmed;
}

export function validateDueDateNotPast(dueDate: string, referenceDate = todayDateString()): boolean {
  return dueDate >= referenceDate;
}

export type ApplicationPlanOption = {
  id: number;
  name: string;
  price: number;
  universities_count: number;
};

export function isCustomApplicationPlan(plan: {
  name: string;
  universities_count: number;
}): boolean {
  if (plan.universities_count === 0) return true;
  return /custom/i.test(plan.name);
}

export function formatPlanDisplayName(
  plan: { name: string; universities_count: number },
  customUniversitiesCount?: number | null,
): string {
  if (isCustomApplicationPlan(plan)) {
    const count = customUniversitiesCount ?? 0;
    if (count > 0) {
      return `Custom Advisory Package (${count} ${count === 1 ? "university" : "universities"})`;
    }
    return plan.name?.trim() || "Custom Advisory Package";
  }
  if (plan.universities_count > 0) {
    return `${plan.universities_count}-University Application Package`;
  }
  return plan.name?.trim() || "Application package";
}

export function formatPlanSelectLabel(plan: ApplicationPlanOption): string {
  if (isCustomApplicationPlan(plan)) {
    return plan.name?.trim() || "Custom Advisory Package";
  }
  return `${formatPlanDisplayName(plan)} — AED ${plan.price.toLocaleString()}`;
}
