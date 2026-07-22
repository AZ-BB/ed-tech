import "server-only";

import {
  mapStripeSubscriptionStatus,
  type StudentSubscriptionStatus,
} from "@/lib/student-subscription";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import type Stripe from "stripe";

export type SyncStudentSubscriptionResult =
  | { ok: true; studentId: string; status: StudentSubscriptionStatus }
  | { ok: false; error: string };

function readStudentId(subscription: Stripe.Subscription): string | null {
  const fromMetadata = subscription.metadata?.student_id?.trim();
  if (fromMetadata) return fromMetadata;
  return null;
}

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const raw = subscription as Stripe.Subscription & {
    current_period_end?: number;
  };
  const epoch =
    typeof raw.current_period_end === "number"
      ? raw.current_period_end
      : subscription.items.data[0] &&
          typeof (subscription.items.data[0] as { current_period_end?: number })
            .current_period_end === "number"
        ? (subscription.items.data[0] as { current_period_end: number })
            .current_period_end
        : null;

  return epoch != null ? new Date(epoch * 1000).toISOString() : null;
}

export async function syncStudentSubscriptionFromStripe(
  subscription: Stripe.Subscription,
): Promise<SyncStudentSubscriptionResult> {
  const studentId = readStudentId(subscription);
  if (!studentId) {
    return { ok: false, error: "Subscription is missing student_id metadata." };
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  const status = mapStripeSubscriptionStatus(subscription.status);
  const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);

  const service = await createSupabaseSecretClient();
  const { data: profile, error: profileError } = await service
    .from("student_profiles")
    .select("id, student_type")
    .eq("id", studentId)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false, error: "Student profile not found for subscription." };
  }

  if (profile.student_type !== "funnel") {
    return {
      ok: false,
      error: "Subscription sync is only supported for funnel students.",
    };
  }

  const { error: updateError } = await service
    .from("student_profiles")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_status: status,
      subscription_current_period_end: currentPeriodEnd,
      subscription_cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq("id", studentId);

  if (updateError) {
    console.error("[syncStudentSubscriptionFromStripe]", updateError);
    return { ok: false, error: "Could not save subscription state." };
  }

  return { ok: true, studentId, status };
}
