import "server-only";

import { getStripeClient } from "@/lib/stripe/config";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type ConfirmIndividualSignupPaymentFromSessionResult =
  | { ok: true; alreadyPaid: boolean }
  | { ok: false; error: string };

export async function confirmIndividualSignupPaymentFromSession(
  sessionId: string,
  expectedStudentId?: string,
): Promise<ConfirmIndividualSignupPaymentFromSessionResult> {
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
    console.error("[confirmIndividualSignupPaymentFromSession] retrieve", error);
    return { ok: false, error: "Could not verify payment session." };
  }

  if (session.metadata?.kind !== "individual_signup_fee") {
    return { ok: false, error: "This checkout session is not an individual signup payment." };
  }

  if (session.payment_status !== "paid") {
    return { ok: false, error: "Payment has not been completed." };
  }

  const studentId = session.metadata?.student_id?.trim();
  if (!studentId) {
    return { ok: false, error: "Payment session is missing student reference." };
  }

  if (expectedStudentId && studentId !== expectedStudentId) {
    return { ok: false, error: "Payment session does not belong to this account." };
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;

  const service = await createSupabaseSecretClient();
  const { data: profile, error: profileError } = await service
    .from("student_profiles")
    .select("id, student_type, has_paid_signup_fee")
    .eq("id", studentId)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false, error: "Student profile not found for payment." };
  }

  if (profile.student_type !== "individual") {
    return {
      ok: false,
      error: "Individual signup payment is only supported for individual students.",
    };
  }

  if (profile.has_paid_signup_fee) {
    return { ok: true, alreadyPaid: true };
  }

  const paidAt = new Date().toISOString();
  const { error: updateError } = await service
    .from("student_profiles")
    .update({
      has_paid_signup_fee: true,
      signup_fee_paid_at: paidAt,
      ...(customerId ? { stripe_customer_id: customerId } : {}),
    })
    .eq("id", studentId);

  if (updateError) {
    console.error("[confirmIndividualSignupPaymentFromSession]", updateError);
    return { ok: false, error: "Could not save signup payment status." };
  }

  return { ok: true, alreadyPaid: false };
}
