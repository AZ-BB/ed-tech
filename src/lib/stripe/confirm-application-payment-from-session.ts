import "server-only";

import { getStripeClient } from "@/lib/stripe/config";
import { markPaymentPaid } from "@/lib/stripe/mark-payment-paid";

export type ConfirmPaymentFromSessionResult =
  | { ok: true; alreadyPaid: boolean }
  | { ok: false; error: string };

/**
 * Verifies a completed Stripe Checkout session and marks the linked payment paid.
 * Handles both application support and post-admission support payments.
 */
export async function confirmPaymentFromSession(
  sessionId: string,
): Promise<ConfirmPaymentFromSessionResult> {
  const trimmed = sessionId.trim();
  if (!trimmed) {
    return { ok: false, error: "Missing checkout session." };
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return { ok: false, error: "Stripe is not configured." };
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(trimmed);
  } catch (error) {
    console.error("[confirmPaymentFromSession] retrieve", error);
    return { ok: false, error: "Could not verify payment session." };
  }

  if (session.payment_status !== "paid") {
    return { ok: false, error: "Payment has not been completed." };
  }

  const paymentIdRaw = session.metadata?.payment_id?.trim();
  if (!paymentIdRaw) {
    return { ok: false, error: "Payment session is missing metadata." };
  }

  const paymentId = Number.parseInt(paymentIdRaw, 10);
  if (!Number.isFinite(paymentId) || paymentId < 1) {
    return { ok: false, error: "Invalid payment reference in session." };
  }

  const postAdmissionCaseIdRaw = session.metadata?.post_admission_case_id?.trim();
  const applicationIdRaw = session.metadata?.application_id?.trim();

  let message: string;
  if (postAdmissionCaseIdRaw) {
    const caseId = Number.parseInt(postAdmissionCaseIdRaw, 10);
    message = Number.isFinite(caseId)
      ? `Stripe payment completed for post-admission case #${caseId}.`
      : "Stripe payment completed for post-admission support.";
  } else if (applicationIdRaw) {
    const applicationId = Number.parseInt(applicationIdRaw, 10);
    message = Number.isFinite(applicationId)
      ? `Stripe payment completed for application #${applicationId}.`
      : "Stripe payment completed for application support.";
  } else {
    message = "Stripe payment completed.";
  }

  const result = await markPaymentPaid(paymentId, { message });

  if (!result.ok) {
    return result;
  }

  return { ok: true, alreadyPaid: false };
}

/** @deprecated Use confirmPaymentFromSession */
export async function confirmApplicationPaymentFromSession(
  sessionId: string,
): Promise<ConfirmPaymentFromSessionResult> {
  return confirmPaymentFromSession(sessionId);
}
