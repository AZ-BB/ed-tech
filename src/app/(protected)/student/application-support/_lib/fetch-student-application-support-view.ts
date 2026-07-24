import "server-only";

import {
  expireOverduePendingPayments,
  isPaymentOverdue,
  isPaymentRequestSent,
} from "@/lib/payment-request-utils";
import type { createSupabaseSecretClient } from "@/utils/supabase-server";

import {
  fetchStudentApplicationSupportDashboard,
  fetchLatestStudentApplication,
} from "./fetch-student-application-support-dashboard";
import type { StudentApplicationSupportDashboardPayload } from "./student-application-support-dashboard-types";

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type StudentApplicationSupportScheduledView = {
  kind: "scheduled";
  scheduledAt: string;
};

export type StudentApplicationSupportPaymentPendingView = {
  kind: "payment_pending";
  paymentUrl: string | null;
  amountAed: number | null;
  dueDate: string | null;
  planName: string | null;
};

export type StudentApplicationSupportDashboardView = {
  kind: "dashboard";
  payload: StudentApplicationSupportDashboardPayload;
};

export type StudentApplicationSupportIntakeFunnelView = {
  kind: "intake_funnel";
};

export type StudentApplicationSupportAwaitingReviewView = {
  kind: "awaiting_review";
};

export type StudentApplicationSupportView =
  | StudentApplicationSupportDashboardView
  | StudentApplicationSupportScheduledView
  | StudentApplicationSupportPaymentPendingView
  | StudentApplicationSupportIntakeFunnelView
  | StudentApplicationSupportAwaitingReviewView;

type PaymentRow = {
  status: string | null;
  amount: number | null;
  due_date: string | null;
  payment_request_sent_at: string | null;
  payment_request_token: string | null;
};

function isFutureScheduledAt(scheduledAt: string | null | undefined): scheduledAt is string {
  const trimmed = scheduledAt?.trim();
  if (!trimmed) return false;
  const meetingAt = new Date(trimmed);
  if (Number.isNaN(meetingAt.getTime())) return false;
  return meetingAt.getTime() > Date.now();
}

function resolvePendingPayment(
  payments: PaymentRow[],
): { token: string; amountAed: number | null; dueDate: string | null } | null {
  for (const payment of payments) {
    if (payment.status !== "pending") continue;
    if (!isPaymentRequestSent(payment)) continue;
    if (isPaymentOverdue(payment)) continue;
    const token = payment.payment_request_token?.trim();
    if (!token) continue;
    const dueDate = payment.due_date?.trim()?.slice(0, 10) ?? null;
    return {
      token,
      amountAed: payment.amount ?? null,
      dueDate,
    };
  }
  return null;
}

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

export async function fetchStudentApplicationSupportView(
  secret: SecretClient,
  studentId: string,
): Promise<StudentApplicationSupportView> {
  const row = await fetchLatestStudentApplication(secret, studentId);
  if (!row) {
    return { kind: "intake_funnel" };
  }

  const status = row.status?.trim() || "lead";

  if (status === "active_package") {
    const payload = await fetchStudentApplicationSupportDashboard(secret, studentId);
    if (!payload) {
      return { kind: "intake_funnel" };
    }
    return { kind: "dashboard", payload };
  }

  if (status === "payment_requested") {
    await expireOverduePendingPayments(secret, { applicationId: row.id });

    const { data: payments, error: paymentsErr } = await secret
      .from("payments")
      .select(
        "status, amount, due_date, payment_request_sent_at, payment_request_token",
      )
      .eq("application_id", row.id)
      .order("created_at", { ascending: false });

    if (paymentsErr) {
      console.error("[fetchStudentApplicationSupportView] payments", paymentsErr);
    }

    const pending = resolvePendingPayment((payments ?? []) as PaymentRow[]);
    const plan = firstEmbed(row.applications_plans);

    return {
      kind: "payment_pending",
      paymentUrl: pending ? `/application-support/pay/${encodeURIComponent(pending.token)}` : null,
      amountAed: pending?.amountAed ?? null,
      dueDate: pending?.dueDate ?? null,
      planName: plan?.name?.trim() || null,
    };
  }

  if (isFutureScheduledAt(row.scheduled_at)) {
    return {
      kind: "scheduled",
      scheduledAt: row.scheduled_at.trim(),
    };
  }

  if (status === "lead") {
    return { kind: "awaiting_review" };
  }

  return { kind: "intake_funnel" };
}
