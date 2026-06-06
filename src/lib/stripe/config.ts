import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/** Server-only Stripe secret key (`STRIPE_SECRET_KEY`). */
export function getStripeSecretKey(): string | undefined {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return key || undefined;
}

/** Webhook signing secret (`STRIPE_WEBHOOK_SECRET`). */
export function getStripeWebhookSecret(): string | undefined {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  return secret || undefined;
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripeSecretKey());
}

/** Lazily constructs a singleton Stripe client when `STRIPE_SECRET_KEY` is set. */
export function getStripeClient(): Stripe | null {
  const secretKey = getStripeSecretKey();
  if (!secretKey) return null;

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}
