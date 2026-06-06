import "server-only";

import { getStripeClient } from "@/lib/stripe/config";
import { markApplicationPaymentPaid } from "@/lib/stripe/mark-payment-paid";

export type ConfirmApplicationPaymentResult =
  | { ok: true; alreadyPaid: boolean }
  | { ok: false; error: string };

/**
 * Verifies a completed Stripe Checkout session and marks the linked payment paid.
 * Used on the success redirect (immediate feedback) and safe to call idempotently.
 */
export async function confirmApplicationPaymentFromSession(
  sessionId: string,
): Promise<ConfirmApplicationPaymentResult> {
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
    console.error("[confirmApplicationPaymentFromSession] retrieve", error);
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

  const applicationIdRaw = session.metadata?.application_id?.trim();
  const applicationId = applicationIdRaw
    ? Number.parseInt(applicationIdRaw, 10)
    : NaN;
  const applicationRef =
    Number.isFinite(applicationId) && applicationId > 0
      ? `application #${applicationId}`
      : "application support";

  const result = await markApplicationPaymentPaid(paymentId, {
    message: `Stripe payment completed for ${applicationRef}.`,
  });

  if (!result.ok) {
    return result;
  }

  return { ok: true, alreadyPaid: false };
}
