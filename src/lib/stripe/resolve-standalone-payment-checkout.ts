import "server-only";

import { isPaymentOverdue } from "@/lib/payment-request-utils";
import { createStandaloneCheckoutSession } from "@/lib/stripe/create-standalone-checkout-session";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type ResolveStandalonePaymentCheckoutResult =
  | {
      type: "checkout";
      clientSecret: string;
      title: string;
      description?: string;
      successReturnPath: string;
    }
  | { type: "redirect_success" }
  | { type: "error"; message: string };

export async function resolveStandalonePaymentCheckout(
  token: string,
): Promise<ResolveStandalonePaymentCheckoutResult> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { type: "error", message: "This payment link is invalid." };
  }

  const secret = await createSupabaseSecretClient();

  const { data: payment, error } = await secret
    .from("standalone_payments")
    .select("id, status, amount, due_date, stripe_checkout_session_id")
    .eq("payment_request_token", trimmed)
    .maybeSingle();

  if (error) {
    console.error("[resolveStandalonePaymentCheckout] fetch", error);
    return { type: "error", message: "Could not load payment details." };
  }

  if (!payment) {
    return {
      type: "error",
      message: "This payment link is invalid or has expired.",
    };
  }

  if (payment.status === "paid") {
    return { type: "redirect_success" };
  }

  if (payment.status === "failed") {
    return {
      type: "error",
      message:
        "This payment could not be completed. Please contact support for assistance.",
    };
  }

  if (isPaymentOverdue(payment)) {
    const now = new Date().toISOString();
    await secret
      .from("standalone_payments")
      .update({
        status: "failed",
        payment_request_token: null,
        updated_at: now,
      })
      .eq("id", payment.id);

    return {
      type: "error",
      message: "This payment link has expired. Please request a new link.",
    };
  }

  const amountAed = Number(payment.amount);
  const checkout = await createStandaloneCheckoutSession({
    standalonePaymentId: payment.id,
    amountAed,
    existingSessionId: payment.stripe_checkout_session_id,
  });

  if (!checkout.ok) {
    return { type: "error", message: checkout.error };
  }

  if (!checkout.reused) {
    const { error: updateErr } = await secret
      .from("standalone_payments")
      .update({
        stripe_checkout_session_id: checkout.sessionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (updateErr) {
      console.error("[resolveStandalonePaymentCheckout] session save", updateErr);
    }
  }

  const amountLabel = amountAed.toLocaleString();

  return {
    type: "checkout",
    clientSecret: checkout.clientSecret,
    title: "Univeera Payment",
    description: `${amountLabel} AED`,
    successReturnPath: "/pay/success",
  };
}
