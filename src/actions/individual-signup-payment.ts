"use server";

import { createIndividualSignupCheckoutSession } from "@/lib/stripe/create-individual-signup-checkout-session";
import { confirmIndividualSignupPaymentFromSession } from "@/lib/stripe/confirm-individual-signup-payment-from-session";
import { resolvePricingForRequest } from "@/lib/stripe/stripe-student-pricing";
import { requireStudentSession } from "@/lib/student-ai-usage-log";
import { requiresIndividualSignupPayment } from "@/lib/student-subscription";
import type { GeneralResponse } from "@/utils/response";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

export async function createIndividualSignupCheckoutAction(): Promise<
  GeneralResponse<{ url: string } | null>
> {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return { data: null, error: auth.message };
  }

  if (!requiresIndividualSignupPayment(auth)) {
    return { data: null, error: "Signup payment is not required for this account." };
  }

  const pricing = await resolvePricingForRequest("individual_signup");
  if ("error" in pricing) {
    return { data: null, error: pricing.error };
  }

  const service = await createSupabaseSecretClient();
  const { data: profile, error } = await service
    .from("student_profiles")
    .select("email, stripe_customer_id")
    .eq("id", auth.studentId)
    .maybeSingle();

  if (error || !profile?.email) {
    return { data: null, error: "Could not load your billing profile." };
  }

  const checkout = await createIndividualSignupCheckoutSession({
    studentId: auth.studentId,
    customerEmail: profile.email,
    stripeCustomerId: profile.stripe_customer_id,
    currency: pricing.currency,
    stripePriceId: pricing.stripePriceId,
  });

  if (!checkout.ok) {
    return { data: null, error: checkout.error };
  }

  return { data: { url: checkout.url }, error: null };
}

export async function confirmIndividualSignupPaymentAction(
  sessionId: string,
): Promise<GeneralResponse<{ alreadyPaid: boolean } | null>> {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return { data: null, error: auth.message };
  }

  if (!requiresIndividualSignupPayment(auth)) {
    return { data: { alreadyPaid: true }, error: null };
  }

  const result = await confirmIndividualSignupPaymentFromSession(
    sessionId,
    auth.studentId,
  );
  if (!result.ok) {
    return { data: null, error: result.error };
  }

  revalidatePath("/student");
  return { data: { alreadyPaid: result.alreadyPaid }, error: null };
}
