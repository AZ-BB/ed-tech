/** Client-safe Stripe publishable key (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`). */
export function getStripePublishableKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return key || undefined;
}
