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

/** Optional CLI listener secret from `stripe listen` (`STRIPE_CLI_WEBHOOK_SECRET`). */
export function getStripeCliWebhookSecret(): string | undefined {
  const secret = process.env.STRIPE_CLI_WEBHOOK_SECRET?.trim();
  return secret || undefined;
}

/** All configured webhook signing secrets (production + local CLI), deduplicated. */
export function getStripeWebhookSecrets(): string[] {
  const secrets = [getStripeWebhookSecret(), getStripeCliWebhookSecret()].filter(
    (secret): secret is string => Boolean(secret),
  );
  return [...new Set(secrets)];
}

/** Verify a Stripe webhook payload against any configured signing secret. */
export function constructStripeWebhookEvent(
  stripe: Stripe,
  rawBody: string,
  signature: string,
): Stripe.Event {
  const secrets = getStripeWebhookSecrets();
  if (secrets.length === 0) {
    throw new Error("No Stripe webhook signing secrets configured.");
  }

  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Stripe webhook signature verification failed.");
}

/** Monthly funnel student subscription Price ID (`STRIPE_FUNNEL_SUBSCRIPTION_PRICE_ID`). */
export function getFunnelSubscriptionPriceId(): string | undefined {
  const priceId = process.env.STRIPE_FUNNEL_SUBSCRIPTION_PRICE_ID?.trim();
  return priceId || undefined;
}

/** Monthly custom student subscription Price ID (`STRIPE_CUSTOM_SUBSCRIPTION_PRICE_ID`). */
export function getCustomSubscriptionPriceId(): string | undefined {
  const priceId = process.env.STRIPE_CUSTOM_SUBSCRIPTION_PRICE_ID?.trim();
  return priceId || undefined;
}

/** One-time individual student signup Price ID (`STRIPE_INDIVIDUAL_SIGNUP_PRICE_ID`). */
export function getIndividualSignupPriceId(): string | undefined {
  const priceId = process.env.STRIPE_INDIVIDUAL_SIGNUP_PRICE_ID?.trim();
  return priceId || undefined;
}

/** Individual signup Stripe Product ID (`STRIPE_INDIVIDUAL_SIGNUP_PRODUCT_ID`). */
export function getIndividualSignupProductId(): string | undefined {
  const productId = process.env.STRIPE_INDIVIDUAL_SIGNUP_PRODUCT_ID?.trim();
  return productId || undefined;
}

/** Funnel subscription Stripe Product ID (`STRIPE_FUNNEL_SUBSCRIPTION_PRODUCT_ID`). */
export function getFunnelSubscriptionProductId(): string | undefined {
  const productId = process.env.STRIPE_FUNNEL_SUBSCRIPTION_PRODUCT_ID?.trim();
  return productId || undefined;
}

/** Custom subscription Stripe Product ID (`STRIPE_CUSTOM_SUBSCRIPTION_PRODUCT_ID`). */
export function getCustomSubscriptionProductId(): string | undefined {
  const productId = process.env.STRIPE_CUSTOM_SUBSCRIPTION_PRODUCT_ID?.trim();
  return productId || undefined;
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
