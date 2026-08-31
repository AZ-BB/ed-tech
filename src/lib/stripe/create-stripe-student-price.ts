import "server-only";

import type Stripe from "stripe";

import { getStripeClient } from "@/lib/stripe/config";
import {
  DEFAULT_STRIPE_CURRENCY,
  type StripeStudentCurrencyAmount,
  type StripeStudentProductBillingMode,
  toStripeCurrencyOptions,
} from "@/lib/stripe/stripe-student-pricing-shared";

export type CreateStripeStudentPriceInput = {
  stripeProductId: string;
  billingMode: StripeStudentProductBillingMode;
  currencies: StripeStudentCurrencyAmount[];
};

export type CreateStripeStudentPriceResult =
  | { ok: true; priceId: string }
  | { ok: false; error: string };

export async function createStripeStudentPrice(
  input: CreateStripeStudentPriceInput,
): Promise<CreateStripeStudentPriceResult> {
  const stripe = getStripeClient();
  if (!stripe) {
    return { ok: false, error: "Stripe is not configured. Set STRIPE_SECRET_KEY." };
  }

  const stripeProductId = input.stripeProductId.trim();
  if (!stripeProductId) {
    return { ok: false, error: "Stripe Product ID is not configured." };
  }

  const aedAmount = input.currencies.find(
    (row) => row.currency === DEFAULT_STRIPE_CURRENCY,
  )?.amountMinor;
  if (aedAmount == null) {
    return {
      ok: false,
      error: `AED amount is required to create a Stripe Price.`,
    };
  }

  const currencyOptions = toStripeCurrencyOptions(
    input.currencies,
    DEFAULT_STRIPE_CURRENCY,
  );

  const createParams: Stripe.PriceCreateParams = {
    product: stripeProductId,
    currency: DEFAULT_STRIPE_CURRENCY.toLowerCase(),
    unit_amount: aedAmount,
    ...(input.billingMode === "subscription"
      ? { recurring: { interval: "month" } }
      : {}),
    ...(Object.keys(currencyOptions).length > 0
      ? { currency_options: currencyOptions }
      : {}),
  };

  try {
    const price = await stripe.prices.create(createParams);
    if (!price.id) {
      return { ok: false, error: "Stripe did not return a Price ID." };
    }
    return { ok: true, priceId: price.id };
  } catch (error) {
    console.error("[createStripeStudentPrice]", error);
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message.trim()
        : "Could not create Stripe Price.";
    return { ok: false, error: message };
  }
}
