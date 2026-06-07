/** Default onboarding deposit for application support (AED). Not the full package price. */
export const ONBOARDING_DEPOSIT_AED = 200;

/** Stripe Checkout uses smallest currency unit (fils for AED). */
export const ONBOARDING_DEPOSIT_FILS = ONBOARDING_DEPOSIT_AED * 100;

export function aedToFils(amountAed: number): number {
  return Math.round(amountAed * 100);
}
