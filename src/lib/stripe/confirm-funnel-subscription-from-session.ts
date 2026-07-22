import "server-only";

import { getStripeClient } from "@/lib/stripe/config";
import { syncStudentSubscriptionFromStripe } from "@/lib/stripe/sync-student-subscription";

export type ConfirmFunnelSubscriptionFromSessionResult =
  | { ok: true; status: string }
  | { ok: false; error: string };

export async function confirmFunnelSubscriptionFromSession(
  sessionId: string,
): Promise<ConfirmFunnelSubscriptionFromSessionResult> {
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
    session = await stripe.checkout.sessions.retrieve(trimmed, {
      expand: ["subscription"],
    });
  } catch (error) {
    console.error("[confirmFunnelSubscriptionFromSession] retrieve", error);
    return { ok: false, error: "Could not verify subscription session." };
  }

  if (session.metadata?.kind !== "funnel_subscription") {
    return { ok: false, error: "This checkout session is not a funnel subscription." };
  }

  const subscription =
    typeof session.subscription === "string"
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

  if (!subscription) {
    return { ok: false, error: "Subscription was not created." };
  }

  const sync = await syncStudentSubscriptionFromStripe(subscription);
  if (!sync.ok) {
    return { ok: false, error: sync.error };
  }

  return { ok: true, status: sync.status };
}
