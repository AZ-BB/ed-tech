import "server-only";

import { resolvePricingForRequest } from "@/lib/stripe/stripe-student-pricing";
import type { SupportedCurrency } from "@/lib/stripe/stripe-student-pricing-shared";

export {
  SUPPORTED_CURRENCIES as INDIVIDUAL_SIGNUP_CURRENCIES,
  type SupportedCurrency as IndividualSignupCurrency,
} from "@/lib/stripe/stripe-student-pricing-shared";

export type IndividualSignupPricing = {
  currency: SupportedCurrency;
  displayPrice: string;
  countryCode: string | null;
};

/** Resolve localized signup fee pricing from admin-managed Stripe product config. */
export async function getIndividualSignupPricingForRequest(): Promise<IndividualSignupPricing> {
  const resolved = await resolvePricingForRequest("individual_signup");
  if ("error" in resolved) {
    return {
      currency: "AED",
      displayPrice: "AED —",
      countryCode: null,
    };
  }

  return {
    currency: resolved.currency,
    displayPrice: resolved.displayPrice,
    countryCode: resolved.countryCode,
  };
}
