"use server";

import { createFunnelSubscriptionCheckoutSession } from "@/lib/stripe/create-funnel-subscription-checkout-session";
import { getStripeClient } from "@/lib/stripe/config";
import { syncStudentSubscriptionFromStripe } from "@/lib/stripe/sync-student-subscription";
import { requireStudentSession } from "@/lib/student-ai-usage-log";
import {
  canManageFunnelSubscription,
  isStudentSubscriptionActive,
} from "@/lib/student-subscription";
import type { GeneralResponse } from "@/utils/response";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

export async function createFunnelSubscriptionCheckoutAction(): Promise<
  GeneralResponse<{ url: string } | null>
> {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return { data: null, error: auth.message };
  }

  if (!canManageFunnelSubscription(auth)) {
    return { data: null, error: "Subscriptions are not available for this account." };
  }

  if (isStudentSubscriptionActive(auth.subscriptionStatus)) {
    return { data: null, error: "You already have an active subscription." };
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

  const checkout = await createFunnelSubscriptionCheckoutSession({
    studentId: auth.studentId,
    customerEmail: profile.email,
    stripeCustomerId: profile.stripe_customer_id,
  });

  if (!checkout.ok) {
    return { data: null, error: checkout.error };
  }

  return { data: { url: checkout.url }, error: null };
}

export async function cancelFunnelSubscriptionAction(): Promise<GeneralResponse<null>> {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return { data: null, error: auth.message };
  }

  if (!canManageFunnelSubscription(auth)) {
    return { data: null, error: "Subscriptions are not available for this account." };
  }

  if (!isStudentSubscriptionActive(auth.subscriptionStatus)) {
    return { data: null, error: "You do not have an active subscription to cancel." };
  }

  if (auth.subscriptionCancelAtPeriodEnd) {
    return { data: null, error: "Your subscription is already set to cancel." };
  }

  const subscriptionId = auth.stripeSubscriptionId?.trim();
  if (!subscriptionId) {
    return { data: null, error: "Missing subscription reference." };
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return { data: null, error: "Stripe is not configured." };
  }

  try {
    const updated = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    const sync = await syncStudentSubscriptionFromStripe(updated);
    if (!sync.ok) {
      return { data: null, error: sync.error };
    }
  } catch (error) {
    console.error("[cancelFunnelSubscriptionAction]", error);
    return { data: null, error: "Could not cancel subscription." };
  }

  revalidatePath("/student");
  revalidatePath("/student/settings");
  return { data: null, error: null };
}
