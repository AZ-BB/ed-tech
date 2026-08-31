import "server-only";

import { aedToFils } from "@/lib/application-support-payment";
import { getPublicSiteBaseUrl } from "@/lib/resend/site-url";
import { getStripeClient } from "@/lib/stripe/config";

export type CreatePaymentRequestCheckoutSessionInput = {
  paymentId: number;
  customerEmail: string;
  amountAed: number;
  productName: string;
  productDescription: string;
  returnUrl: string;
  metadata: Record<string, string>;
  existingSessionId?: string | null;
};

export type CreatePaymentRequestCheckoutSessionResult =
  | { ok: true; sessionId: string; clientSecret: string; reused: boolean }
  | { ok: false; error: string };

async function tryReuseOpenSession(
  existingSessionId: string,
): Promise<{ sessionId: string; clientSecret: string } | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;

  try {
    const session = await stripe.checkout.sessions.retrieve(existingSessionId);
    if (session.status !== "open" || !session.client_secret) {
      return null;
    }
    return {
      sessionId: session.id,
      clientSecret: session.client_secret,
    };
  } catch (error) {
    console.warn("[tryReuseOpenSession] could not reuse session", error);
    return null;
  }
}

export async function createPaymentRequestCheckoutSession(
  input: CreatePaymentRequestCheckoutSessionInput,
): Promise<CreatePaymentRequestCheckoutSessionResult> {
  const stripe = getStripeClient();
  if (!stripe) {
    return {
      ok: false,
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY.",
    };
  }

  const existingSessionId = input.existingSessionId?.trim();
  if (existingSessionId) {
    const reused = await tryReuseOpenSession(existingSessionId);
    if (reused) {
      return { ok: true, ...reused, reused: true };
    }
  }

  const amountFils = aedToFils(input.amountAed);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "elements",
      currency: "aed",
      customer_email: input.customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "aed",
            unit_amount: amountFils,
            product_data: {
              name: input.productName,
              description: input.productDescription,
            },
          },
        },
      ],
      metadata: input.metadata,
      return_url: input.returnUrl,
    });

    if (!session.client_secret) {
      return { ok: false, error: "Stripe did not return a checkout client secret." };
    }

    return {
      ok: true,
      sessionId: session.id,
      clientSecret: session.client_secret,
      reused: false,
    };
  } catch (error) {
    console.error("[createPaymentRequestCheckoutSession]", error);
    return { ok: false, error: "Could not create Stripe checkout session." };
  }
}

export async function buildPaymentRequestReturnUrl(pathWithQuery: string): Promise<string> {
  const baseUrl = await getPublicSiteBaseUrl();
  const separator = pathWithQuery.includes("?") ? "&" : "?";
  return `${baseUrl}${pathWithQuery}${separator}session_id={CHECKOUT_SESSION_ID}`;
}
