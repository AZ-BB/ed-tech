import "server-only";

import { aedToFils } from "@/lib/application-support-payment";
import { getPublicSiteBaseUrl } from "@/lib/resend/site-url";
import { getStripeClient } from "@/lib/stripe/config";

export type CreatePostAdmissionCheckoutSessionInput = {
  paymentId: number;
  caseId: number;
  customerEmail: string;
  amountAed: number;
};

export type CreatePostAdmissionCheckoutSessionResult =
  | { ok: true; sessionId: string; url: string }
  | { ok: false; error: string };

export async function createPostAdmissionCheckoutSession(
  input: CreatePostAdmissionCheckoutSessionInput,
): Promise<CreatePostAdmissionCheckoutSessionResult> {
  const stripe = getStripeClient();
  if (!stripe) {
    return {
      ok: false,
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY.",
    };
  }

  const baseUrl = await getPublicSiteBaseUrl();
  const successUrl = `${baseUrl}/post-admission-support/payment/success?case_id=${input.caseId}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/post-admission-support/payment/cancel?case_id=${input.caseId}`;

  const amountFils = aedToFils(input.amountAed);
  const amountLabel = input.amountAed.toLocaleString();

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
            unit_amount: amountFils,
            product_data: {
              name: "Post-Admission Support Payment",
              description: `${amountLabel} AED post-admission support payment`,
            },
          },
        },
      ],
      metadata: {
        payment_id: String(input.paymentId),
        post_admission_case_id: String(input.caseId),
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
    console.error("[createPostAdmissionCheckoutSession]", error);
    return { ok: false, error: "Could not create Stripe checkout session." };
  }
}
