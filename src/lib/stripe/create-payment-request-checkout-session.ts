import "server-only";

import { aedToFils } from "@/lib/application-support-payment";
import { getPublicSiteBaseUrl } from "@/lib/resend/site-url";
import { buildHostedCheckoutBrandingSettings } from "@/lib/stripe/checkout-branding";
import { getStripeClient, getStripeSecretKey } from "@/lib/stripe/config";

export type CreatePaymentRequestCheckoutSessionInput = {
  paymentId: number;
  customerEmail?: string;
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

export type CreateHostedPaymentRequestCheckoutSessionInput = {
  paymentId: number;
  customerEmail?: string;
  amountAed: number;
  productName: string;
  productDescription: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
  existingSessionId?: string | null;
};

export type CreateHostedPaymentRequestCheckoutSessionResult =
  | { ok: true; sessionId: string; url: string; reused: boolean }
  | { ok: false; error: string };

function normalizeCheckoutUrl(url: string): string {
  return url.replace("{CHECKOUT_SESSION_ID}", "");
}

function sessionKeyMatchesEnvironment(sessionId: string): boolean {
  const secretKey = getStripeSecretKey();
  if (!secretKey) return true;
  const sessionIsLive = sessionId.startsWith("cs_live_");
  const keyIsLive = secretKey.startsWith("sk_live_");
  return sessionIsLive === keyIsLive;
}

async function tryReuseOpenElementsSession(
  existingSessionId: string,
  expectedReturnUrl: string,
): Promise<{ sessionId: string; clientSecret: string } | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;
  if (!sessionKeyMatchesEnvironment(existingSessionId)) return null;

  try {
    const session = await stripe.checkout.sessions.retrieve(existingSessionId);
    if (session.status !== "open" || !session.client_secret) {
      return null;
    }
    if (
      session.return_url &&
      normalizeCheckoutUrl(session.return_url) !==
        normalizeCheckoutUrl(expectedReturnUrl)
    ) {
      return null;
    }
    return {
      sessionId: session.id,
      clientSecret: session.client_secret,
    };
  } catch (error) {
    console.warn("[tryReuseOpenElementsSession] could not reuse session", error);
    return null;
  }
}

async function tryReuseOpenHostedSession(
  existingSessionId: string,
  expectedSuccessUrl: string,
): Promise<{ sessionId: string; url: string } | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;
  if (!sessionKeyMatchesEnvironment(existingSessionId)) return null;

  try {
    const session = await stripe.checkout.sessions.retrieve(existingSessionId);
    if (session.status !== "open" || !session.url) {
      return null;
    }
    if (
      session.success_url &&
      normalizeCheckoutUrl(session.success_url) !==
        normalizeCheckoutUrl(expectedSuccessUrl)
    ) {
      return null;
    }
    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.warn("[tryReuseOpenHostedSession] could not reuse session", error);
    return null;
  }
}

function buildLineItems(
  amountAed: number,
  productName: string,
  productDescription: string,
) {
  const amountFils = aedToFils(amountAed);
  return [
    {
      quantity: 1,
      price_data: {
        currency: "aed",
        unit_amount: amountFils,
        product_data: {
          name: productName,
          description: productDescription,
        },
      },
    },
  ];
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
    const reused = await tryReuseOpenElementsSession(
      existingSessionId,
      input.returnUrl,
    );
    if (reused) {
      return { ok: true, ...reused, reused: true };
    }
  }

  try {
    const customerEmail = input.customerEmail?.trim();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "elements",
      currency: "aed",
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      line_items: buildLineItems(
        input.amountAed,
        input.productName,
        input.productDescription,
      ),
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

export async function createHostedPaymentRequestCheckoutSession(
  input: CreateHostedPaymentRequestCheckoutSessionInput,
): Promise<CreateHostedPaymentRequestCheckoutSessionResult> {
  const stripe = getStripeClient();
  if (!stripe) {
    return {
      ok: false,
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY.",
    };
  }

  const existingSessionId = input.existingSessionId?.trim();
  if (existingSessionId) {
    const reused = await tryReuseOpenHostedSession(
      existingSessionId,
      input.successUrl,
    );
    if (reused) {
      return { ok: true, ...reused, reused: true };
    }
  }

  try {
    const customerEmail = input.customerEmail?.trim();
    const brandingSettings = await buildHostedCheckoutBrandingSettings();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "aed",
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      line_items: buildLineItems(
        input.amountAed,
        input.productName,
        input.productDescription,
      ),
      metadata: input.metadata,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      branding_settings: brandingSettings,
    });

    if (!session.url) {
      return { ok: false, error: "Stripe did not return a checkout URL." };
    }

    return {
      ok: true,
      sessionId: session.id,
      url: session.url,
      reused: false,
    };
  } catch (error) {
    console.error("[createHostedPaymentRequestCheckoutSession]", error);
    return { ok: false, error: "Could not create Stripe checkout session." };
  }
}

export async function buildPaymentRequestReturnUrl(pathWithQuery: string): Promise<string> {
  const baseUrl = await getPublicSiteBaseUrl();
  const separator = pathWithQuery.includes("?") ? "&" : "?";
  return `${baseUrl}${pathWithQuery}${separator}session_id={CHECKOUT_SESSION_ID}`;
}

export async function buildStandalonePaymentCancelUrl(token: string): Promise<string> {
  const baseUrl = await getPublicSiteBaseUrl();
  return `${baseUrl}/pay/${encodeURIComponent(token)}?canceled=1`;
}
