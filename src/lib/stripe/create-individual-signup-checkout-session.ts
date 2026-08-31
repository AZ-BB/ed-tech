import "server-only";

import { getPublicSiteBaseUrl } from "@/lib/resend/site-url";
import { getStripeClient } from "@/lib/stripe/config";
import type { SupportedCurrency } from "@/lib/stripe/stripe-student-pricing-shared";

export type CreateIndividualSignupCheckoutInput = {
  studentId: string;
  customerEmail: string;
  stripeCustomerId?: string | null;
  currency: SupportedCurrency;
  stripePriceId: string;
};

export type CreateIndividualSignupCheckoutResult =
  | { ok: true; sessionId: string; url: string }
  | { ok: false; error: string };

export async function createIndividualSignupCheckoutSession(
  input: CreateIndividualSignupCheckoutInput,
): Promise<CreateIndividualSignupCheckoutResult> {
  const stripe = getStripeClient();
  if (!stripe) {
    return {
      ok: false,
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY.",
    };
  }

  const priceId = input.stripePriceId.trim();
  if (!priceId) {
    return {
      ok: false,
      error:
        "Signup payment price is not configured. Set STRIPE_INDIVIDUAL_SIGNUP_PRICE_ID or configure pricing in admin settings.",
    };
  }

  const baseUrl = await getPublicSiteBaseUrl();
  const successUrl = `${baseUrl}/student?signup_session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/student?signup_payment=canceled`;

  const existingCustomerId = input.stripeCustomerId?.trim() || undefined;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: input.currency.toLowerCase(),
      customer: existingCustomerId,
      customer_email: existingCustomerId ? undefined : input.customerEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        student_id: input.studentId,
        kind: "individual_signup_fee",
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
    console.error("[createIndividualSignupCheckoutSession]", error);
    const stripeMessage =
      error instanceof Error &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.trim().length > 0
        ? error.message.trim()
        : null;
    if (stripeMessage?.includes("No such price")) {
      return {
        ok: false,
        error:
          "Stripe price not found for the configured API key. Use a test-mode price ID with your test secret key (same Stripe account), or update STRIPE_SECRET_KEY to match the account where the price was created.",
      };
    }
    return {
      ok: false,
      error: stripeMessage ?? "Could not create signup payment checkout session.",
    };
  }
}
