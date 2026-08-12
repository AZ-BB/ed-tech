import "server-only";

import { getRequestCountryCode } from "@/lib/geo/get-request-country-code";

export const INDIVIDUAL_SIGNUP_CURRENCIES = [
  "AED",
  "BHD",
  "EGP",
  "JOD",
  "KWD",
  "OMR",
  "QAR",
  "USD",
] as const;

export type IndividualSignupCurrency = (typeof INDIVIDUAL_SIGNUP_CURRENCIES)[number];

export type IndividualSignupPricing = {
  currency: IndividualSignupCurrency;
  displayPrice: string;
  countryCode: string | null;
};

/** Static display prices matching the Stripe product currency options. */
const DISPLAY_PRICES: Record<IndividualSignupCurrency, string> = {
  AED: "AED 99",
  BHD: "BHD 10",
  EGP: "EGP 1,380",
  JOD: "JOD 19",
  KWD: "KWD 8.30",
  OMR: "OMR 10",
  QAR: "QAR 100",
  USD: "$27",
};

const COUNTRY_TO_CURRENCY: Record<string, IndividualSignupCurrency> = {
  BH: "BHD",
  EG: "EGP",
  JO: "JOD",
  KW: "KWD",
  OM: "OMR",
  QA: "QAR",
  US: "USD",
  AE: "AED",
};

function resolveCurrencyForCountry(countryCode: string | null): IndividualSignupCurrency {
  const code = countryCode?.trim().toUpperCase() ?? "";
  return COUNTRY_TO_CURRENCY[code] ?? "AED";
}

export async function getIndividualSignupPricingForRequest(): Promise<IndividualSignupPricing> {
  const countryCode = await getRequestCountryCode();
  const currency = resolveCurrencyForCountry(countryCode);

  return {
    currency,
    displayPrice: DISPLAY_PRICES[currency],
    countryCode,
  };
}
