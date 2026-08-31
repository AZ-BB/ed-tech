import "server-only";

import { getStripeClient } from "@/lib/stripe/config";
import { markStandalonePaymentPaid } from "@/lib/stripe/mark-standalone-payment-paid";

export type ConfirmStandalonePaymentFromSessionResult =
  | { ok: true; alreadyPaid: boolean }
  | { ok: false; error: string };

export async function confirmStandalonePaymentFromSession(
  sessionId: string,
): Promise<ConfirmStandalonePaymentFromSessionResult> {
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
    console.error("[confirmStandalonePaymentFromSession] retrieve", error);
    return { ok: false, error: "Could not verify payment session." };
  }

  if (session.payment_status !== "paid") {
    return { ok: false, error: "Payment has not been completed." };
  }

  const standalonePaymentIdRaw = session.metadata?.standalone_payment_id?.trim();
  if (!standalonePaymentIdRaw) {
    return { ok: false, error: "Payment session is missing metadata." };
  }

  const standalonePaymentId = Number.parseInt(standalonePaymentIdRaw, 10);
  if (!Number.isFinite(standalonePaymentId) || standalonePaymentId < 1) {
    return { ok: false, error: "Invalid payment reference in session." };
  }

  const result = await markStandalonePaymentPaid(standalonePaymentId);
  if (!result.ok) {
    return result;
  }

  return { ok: true, alreadyPaid: false };
}
