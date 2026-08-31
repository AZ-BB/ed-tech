export const SUPPORTED_CURRENCIES = [
  "AED",
  "BHD",
  "EGP",
  "JOD",
  "KWD",
  "LBP",
  "OMR",
  "QAR",
  "SAR",
  "USD",
  "YER",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const STRIPE_STUDENT_PRODUCT_KEYS = [
  "individual_signup",
  "funnel_subscription",
  "custom_subscription",
] as const;

export type StripeStudentProductKey = (typeof STRIPE_STUDENT_PRODUCT_KEYS)[number];

export type StripeStudentProductBillingMode = "one_time" | "subscription";

export type StripeStudentCurrencyAmount = {
  currency: SupportedCurrency;
  amountMinor: number;
};

export type StripeStudentProductPricing = {
  productKey: StripeStudentProductKey;
  label: string;
  billingMode: StripeStudentProductBillingMode;
  stripeProductId: string;
  stripePriceId: string | null;
  envStripePriceId: string | null;
  currencies: StripeStudentCurrencyAmount[];
  updatedAt: string | null;
};

export type ResolvedStripeStudentPricing = {
  productKey: StripeStudentProductKey;
  currency: SupportedCurrency;
  amountMinor: number;
  displayPrice: string;
  stripePriceId: string;
  countryCode: string | null;
  billingMode: StripeStudentProductBillingMode;
};

const THREE_DECIMAL_CURRENCIES = new Set<SupportedCurrency>(["BHD", "JOD", "KWD", "OMR"]);

export const DEFAULT_STRIPE_CURRENCY: SupportedCurrency = "AED";

const COUNTRY_TO_CURRENCY: Record<string, SupportedCurrency> = {
  BH: "BHD",
  EG: "EGP",
  JO: "JOD",
  KW: "KWD",
  LB: "LBP",
  OM: "OMR",
  QA: "QAR",
  SA: "SAR",
  US: "USD",
  AE: "AED",
  YE: "YER",
};

export function isSupportedCurrency(value: string): value is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function resolveCurrencyForCountry(countryCode: string | null): SupportedCurrency {
  const code = countryCode?.trim().toUpperCase() ?? "";
  return COUNTRY_TO_CURRENCY[code] ?? DEFAULT_STRIPE_CURRENCY;
}

export function currencyMinorUnitFactor(currency: SupportedCurrency): number {
  return THREE_DECIMAL_CURRENCIES.has(currency) ? 1000 : 100;
}

export function majorToMinor(currency: SupportedCurrency, major: number): number {
  return Math.round(major * currencyMinorUnitFactor(currency));
}

export function minorToMajor(currency: SupportedCurrency, minor: number): number {
  return minor / currencyMinorUnitFactor(currency);
}

export function formatDisplayPrice(
  currency: SupportedCurrency,
  amountMinor: number,
): string {
  const major = minorToMajor(currency, amountMinor);

  if (currency === "USD") {
    const formatted =
      major % 1 === 0
        ? major.toLocaleString("en-US", { maximumFractionDigits: 0 })
        : major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `$${formatted}`;
  }

  const formatted = THREE_DECIMAL_CURRENCIES.has(currency)
    ? major.toLocaleString("en-US", {
        minimumFractionDigits: major % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 3,
      })
    : major.toLocaleString("en-US", { maximumFractionDigits: 0 });

  return `${currency} ${formatted}`;
}

export function toStripeCurrencyOptions(
  currencies: StripeStudentCurrencyAmount[],
  baseCurrency: SupportedCurrency,
): Record<string, { unit_amount: number }> {
  const options: Record<string, { unit_amount: number }> = {};

  for (const row of currencies) {
    if (row.currency === baseCurrency) continue;
    options[row.currency.toLowerCase()] = { unit_amount: row.amountMinor };
  }

  return options;
}

export function amountInputStep(currency: SupportedCurrency): string {
  return currency === "BHD" || currency === "JOD" || currency === "KWD" || currency === "OMR"
    ? "0.001"
    : "0.01";
}

export function currencyAmountsEqual(
  a: StripeStudentCurrencyAmount[],
  b: StripeStudentCurrencyAmount[],
): boolean {
  if (a.length !== b.length) return false;
  const mapA = new Map(a.map((row) => [row.currency, row.amountMinor]));
  for (const row of b) {
    if (mapA.get(row.currency) !== row.amountMinor) return false;
  }
  return true;
}

export const STRIPE_STUDENT_PRODUCT_IDS: Record<StripeStudentProductKey, string> = {
  individual_signup: "prod_UzJJARAuV1bUeX",
  funnel_subscription: "prod_V2aJchKc8HZwig",
  custom_subscription: "prod_Uvp7Go1v3eOl3O",
};

export const STRIPE_STUDENT_PRODUCT_DESCRIPTIONS: Record<StripeStudentProductKey, string> = {
  individual_signup: "One-time fee for independent students before portal access.",
  funnel_subscription: "Monthly subscription for self-serve funnel students.",
  custom_subscription: "Monthly subscription for custom-plan students.",
};
