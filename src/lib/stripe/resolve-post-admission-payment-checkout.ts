import "server-only";

import { createPostAdmissionCheckoutSession } from "@/lib/stripe/create-post-admission-checkout-session";
import {
  expireOverduePendingPayments,
  isPaymentOverdue,
} from "@/lib/payment-request-utils";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type CaseEmbed = {
  id: number;
  student_name: string | null;
  student_email: string | null;
  student_profiles:
    | { email: string | null }
    | { email: string | null }[]
    | null;
};

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function resolveStudentEmail(row: CaseEmbed): string {
  const profile = firstEmbed(row.student_profiles);
  const fromProfile = profile?.email?.trim();
  if (fromProfile) return fromProfile;
  return row.student_email?.trim() || "";
}

export type ResolvePostAdmissionPaymentCheckoutResult =
  | { type: "redirect"; url: string }
  | { type: "redirect_success"; caseId: number }
  | { type: "error"; message: string };

export async function resolvePostAdmissionPaymentCheckout(
  token: string,
): Promise<ResolvePostAdmissionPaymentCheckoutResult> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { type: "error", message: "This payment link is invalid." };
  }

  const secret = await createSupabaseSecretClient();

  const { data: payment, error } = await secret
    .from("payments")
    .select(
      `
      id,
      post_admission_case_id,
      status,
      amount,
      due_date,
      post_admission_cases!inner (
        id,
        student_name,
        student_email,
        student_profiles ( email )
      )
    `,
    )
    .eq("payment_request_token", trimmed)
    .maybeSingle();

  if (error) {
    console.error("[resolvePostAdmissionPaymentCheckout] fetch", error);
    return { type: "error", message: "Could not load payment details." };
  }

  if (!payment || !payment.post_admission_case_id) {
    return {
      type: "error",
      message: "This payment link is invalid or has expired.",
    };
  }

  const caseRow = firstEmbed(
    payment.post_admission_cases as CaseEmbed | CaseEmbed[] | null,
  );
  if (!caseRow) {
    return { type: "error", message: "Post-admission case not found for this payment." };
  }

  if (payment.status === "paid") {
    return { type: "redirect_success", caseId: caseRow.id };
  }

  if (payment.status === "failed") {
    return {
      type: "error",
      message:
        "This payment could not be completed. Please contact support for assistance.",
    };
  }

  if (isPaymentOverdue(payment)) {
    await expireOverduePendingPayments(secret, {
      postAdmissionCaseId: payment.post_admission_case_id,
    });
    return {
      type: "error",
      message: "This payment link has expired. Please contact your advisor for a new request.",
    };
  }

  const customerEmail = resolveStudentEmail(caseRow);
  if (!customerEmail) {
    return {
      type: "error",
      message: "No email is on file for this case. Please contact support.",
    };
  }

  const checkout = await createPostAdmissionCheckoutSession({
    paymentId: payment.id,
    caseId: caseRow.id,
    customerEmail,
    amountAed: payment.amount,
  });

  if (!checkout.ok) {
    return { type: "error", message: checkout.error };
  }

  const { error: updateErr } = await secret
    .from("payments")
    .update({
      stripe_checkout_session_id: checkout.sessionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  if (updateErr) {
    console.error("[resolvePostAdmissionPaymentCheckout] session save", updateErr);
  }

  return { type: "redirect", url: checkout.url };
}
