import "server-only";

import { getPublicSiteBaseUrl } from "@/lib/resend/site-url";
import { getFunnelSubscriptionPriceId, getStripeClient } from "@/lib/stripe/config";

export type CreateFunnelSubscriptionCheckoutInput = {
  studentId: string;
  customerEmail: string;
  stripeCustomerId?: string | null;
};

export type CreateFunnelSubscriptionCheckoutResult =
  | { ok: true; sessionId: string; url: string }
  | { ok: false; error: string };

export async function createFunnelSubscriptionCheckoutSession(
  input: CreateFunnelSubscriptionCheckoutInput,
): Promise<CreateFunnelSubscriptionCheckoutResult> {
  const stripe = getStripeClient();
  if (!stripe) {
    return {
      ok: false,
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY.",
    };
  }

  const priceId = getFunnelSubscriptionPriceId();
  if (!priceId) {
    return {
      ok: false,
      error:
        "Subscription price is not configured. Set STRIPE_FUNNEL_SUBSCRIPTION_PRICE_ID.",
    };
  }

  const baseUrl = await getPublicSiteBaseUrl();
  const successUrl = `${baseUrl}/student/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/student/settings?subscription=canceled`;

  const existingCustomerId = input.stripeCustomerId?.trim() || undefined;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      currency: "aed",
      customer: existingCustomerId,
      customer_email: existingCustomerId ? undefined : input.customerEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        student_id: input.studentId,
        kind: "funnel_subscription",
      },
      subscription_data: {
        metadata: {
          student_id: input.studentId,
          kind: "funnel_subscription",
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      return { ok: false, error: "Stripe did not return a checkout URL." };
    }

    return {
      ok: true,
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.error("[createFunnelSubscriptionCheckoutSession]", error);
    return { ok: false, error: "Could not create subscription checkout session." };
  }
}
