import "server-only";

import {
  ONBOARDING_DEPOSIT_AED,
  ONBOARDING_DEPOSIT_FILS,
} from "@/lib/application-support-payment";
import { getPublicSiteBaseUrl } from "@/lib/resend/site-url";
import { getStripeClient } from "@/lib/stripe/config";

export type CreateApplicationCheckoutSessionInput = {
  paymentId: number;
  applicationId: number;
  customerEmail: string;
  packageLabel: string;
};

export type CreateApplicationCheckoutSessionResult =
  | { ok: true; sessionId: string; url: string }
  | { ok: false; error: string };

export async function createApplicationCheckoutSession(
  input: CreateApplicationCheckoutSessionInput,
): Promise<CreateApplicationCheckoutSessionResult> {
  const stripe = getStripeClient();
  if (!stripe) {
    return {
      ok: false,
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY.",
    };
  }

  const baseUrl = await getPublicSiteBaseUrl();
  const successUrl = `${baseUrl}/application-support/payment/success?application_id=${input.applicationId}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/application-support/payment/cancel?application_id=${input.applicationId}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "aed",
      customer_email: input.customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "aed",
            unit_amount: ONBOARDING_DEPOSIT_FILS,
            product_data: {
              name: "Application Support Deposit",
              description: `${ONBOARDING_DEPOSIT_AED} AED onboarding deposit${input.packageLabel ? ` — ${input.packageLabel}` : ""}`,
            },
          },
        },
      ],
      metadata: {
        payment_id: String(input.paymentId),
        application_id: String(input.applicationId),
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
    console.error("[createApplicationCheckoutSession]", error);
    return { ok: false, error: "Could not create Stripe checkout session." };
  }
}
