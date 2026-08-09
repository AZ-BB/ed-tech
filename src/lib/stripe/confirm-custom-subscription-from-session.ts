import "server-only";

import { getStripeClient } from "@/lib/stripe/config";
import { syncStudentSubscriptionFromStripe } from "@/lib/stripe/sync-student-subscription";

export type ConfirmCustomSubscriptionFromSessionResult =
  | { ok: true; status: string }
  | { ok: false; error: string };

export async function confirmCustomSubscriptionFromSession(
  sessionId: string,
): Promise<ConfirmCustomSubscriptionFromSessionResult> {
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
    console.error("[confirmCustomSubscriptionFromSession] retrieve", error);
    return { ok: false, error: "Could not verify subscription session." };
  }

  if (session.metadata?.kind !== "custom_subscription") {
    return { ok: false, error: "This checkout session is not a custom subscription." };
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
