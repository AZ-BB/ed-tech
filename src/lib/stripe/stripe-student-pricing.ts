import "server-only";

import {
  getCustomSubscriptionPriceId,
  getFunnelSubscriptionPriceId,
  getIndividualSignupPriceId,
} from "@/lib/stripe/config";
import { getRequestCountryCode } from "@/lib/geo/get-request-country-code";
import {
  DEFAULT_STRIPE_CURRENCY,
  STRIPE_STUDENT_PRODUCT_IDS,
  formatDisplayPrice,
  isSupportedCurrency,
  resolveCurrencyForCountry,
  type ResolvedStripeStudentPricing,
  type StripeStudentCurrencyAmount,
  type StripeStudentProductBillingMode,
  type StripeStudentProductKey,
  type StripeStudentProductPricing,
  type SupportedCurrency,
} from "@/lib/stripe/stripe-student-pricing-shared";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export {
  DEFAULT_STRIPE_CURRENCY,
  SUPPORTED_CURRENCIES,
  STRIPE_STUDENT_PRODUCT_IDS,
  STRIPE_STUDENT_PRODUCT_KEYS,
  amountInputStep,
  currencyMinorUnitFactor,
  currencyAmountsEqual,
  formatDisplayPrice,
  isSupportedCurrency,
  majorToMinor,
  minorToMajor,
  resolveCurrencyForCountry,
  toStripeCurrencyOptions,
  type ResolvedStripeStudentPricing,
  type StripeStudentCurrencyAmount,
  type StripeStudentProductBillingMode,
  type StripeStudentProductKey,
  type StripeStudentProductPricing,
  type SupportedCurrency,
} from "@/lib/stripe/stripe-student-pricing-shared";

const PRODUCT_ENV_PRICE_GETTERS: Record<
  StripeStudentProductKey,
  () => string | undefined
> = {
  individual_signup: getIndividualSignupPriceId,
  funnel_subscription: getFunnelSubscriptionPriceId,
  custom_subscription: getCustomSubscriptionPriceId,
};

const PRODUCT_LABELS: Record<StripeStudentProductKey, string> = {
  individual_signup: "Individual signup fee",
  funnel_subscription: "Funnel monthly subscription",
  custom_subscription: "Custom monthly subscription",
};

const PRODUCT_BILLING_MODES: Record<StripeStudentProductKey, StripeStudentProductBillingMode> =
  {
    individual_signup: "one_time",
    funnel_subscription: "subscription",
    custom_subscription: "subscription",
  };

function resolveEffectivePriceId(
  productKey: StripeStudentProductKey,
  dbPriceId: string | null | undefined,
): string | null {
  const fromDb = dbPriceId?.trim();
  if (fromDb) return fromDb;
  return PRODUCT_ENV_PRICE_GETTERS[productKey]() ?? null;
}

function buildProductPricing(
  productKey: StripeStudentProductKey,
  row: {
    stripe_product_id: string;
    stripe_price_id: string | null;
    label: string;
    billing_mode: string;
    updated_at: string | null;
  } | null,
  currencyRows: { currency: string; amount_minor: number }[],
): StripeStudentProductPricing {
  const envStripePriceId = PRODUCT_ENV_PRICE_GETTERS[productKey]() ?? null;

  const currencies: StripeStudentCurrencyAmount[] = currencyRows
    .filter((item): item is { currency: SupportedCurrency; amount_minor: number } =>
      isSupportedCurrency(item.currency.toUpperCase()),
    )
    .map((item) => ({
      currency: item.currency.toUpperCase() as SupportedCurrency,
      amountMinor: item.amount_minor,
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));

  return {
    productKey,
    label: row?.label?.trim() || PRODUCT_LABELS[productKey],
    billingMode:
      row?.billing_mode === "one_time" || row?.billing_mode === "subscription"
        ? row.billing_mode
        : PRODUCT_BILLING_MODES[productKey],
    stripeProductId: row?.stripe_product_id?.trim() || STRIPE_STUDENT_PRODUCT_IDS[productKey],
    stripePriceId: row?.stripe_price_id?.trim() || null,
    envStripePriceId,
    currencies,
    updatedAt: row?.updated_at ?? null,
  };
}

export async function fetchStripeStudentPricing(): Promise<
  Record<StripeStudentProductKey, StripeStudentProductPricing>
> {
  const service = await createSupabaseSecretClient();

  const [productsResult, currenciesResult] = await Promise.all([
    service.from("stripe_student_products").select("*"),
    service
      .from("stripe_student_product_currencies")
      .select("product_key, currency, amount_minor"),
  ]);

  if (productsResult.error) {
    console.error("[stripe-student-pricing] products", productsResult.error);
  }
  if (currenciesResult.error) {
    console.error("[stripe-student-pricing] currencies", currenciesResult.error);
  }

  const productsByKey = new Map(
    (productsResult.data ?? []).map((row) => [row.product_key, row]),
  );
  const currenciesByProduct = new Map<
    StripeStudentProductKey,
    { currency: string; amount_minor: number }[]
  >();

  for (const row of currenciesResult.data ?? []) {
    const key = row.product_key as StripeStudentProductKey;
    const list = currenciesByProduct.get(key) ?? [];
    list.push({ currency: row.currency, amount_minor: row.amount_minor });
    currenciesByProduct.set(key, list);
  }

  return {
    individual_signup: buildProductPricing(
      "individual_signup",
      productsByKey.get("individual_signup") ?? null,
      currenciesByProduct.get("individual_signup") ?? [],
    ),
    funnel_subscription: buildProductPricing(
      "funnel_subscription",
      productsByKey.get("funnel_subscription") ?? null,
      currenciesByProduct.get("funnel_subscription") ?? [],
    ),
    custom_subscription: buildProductPricing(
      "custom_subscription",
      productsByKey.get("custom_subscription") ?? null,
      currenciesByProduct.get("custom_subscription") ?? [],
    ),
  };
}

export function resolveProductPricing(
  product: StripeStudentProductPricing,
  countryCode: string | null,
): ResolvedStripeStudentPricing | { ok: false; error: string } {
  const requestedCurrency = resolveCurrencyForCountry(countryCode);
  const amountByCurrency = new Map(
    product.currencies.map((row) => [row.currency, row.amountMinor]),
  );

  const currency =
    amountByCurrency.has(requestedCurrency) ? requestedCurrency : DEFAULT_STRIPE_CURRENCY;
  const amountMinor = amountByCurrency.get(currency);

  if (amountMinor == null) {
    return {
      ok: false,
      error: `No pricing configured for ${product.label} (${currency}).`,
    };
  }

  const stripePriceId = resolveEffectivePriceId(product.productKey, product.stripePriceId);
  if (!stripePriceId) {
    return {
      ok: false,
      error: `Stripe price is not configured for ${product.label}.`,
    };
  }

  return {
    productKey: product.productKey,
    currency,
    amountMinor,
    displayPrice: formatDisplayPrice(currency, amountMinor),
    stripePriceId,
    countryCode,
    billingMode: product.billingMode,
  };
}

export async function resolvePricingForRequest(
  productKey: StripeStudentProductKey,
): Promise<ResolvedStripeStudentPricing | { ok: false; error: string }> {
  const countryCode = await getRequestCountryCode();
  const allPricing = await fetchStripeStudentPricing();
  return resolveProductPricing(allPricing[productKey], countryCode);
}

export function getEffectiveStripePriceId(
  product: StripeStudentProductPricing,
): string | null {
  return resolveEffectivePriceId(product.productKey, product.stripePriceId);
}
