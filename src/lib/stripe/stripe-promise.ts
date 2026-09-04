import { getStripePublishableKey } from "@/lib/stripe/publishable-key";
import { type Stripe, loadStripe } from "@stripe/stripe-js";

let cachedPublishableKey: string | undefined;
let stripePromise: Promise<Stripe | null> | null = null;

/** Cached Stripe.js loader — avoids remount warnings on CheckoutElementsProvider. */
export function getStripePromise(): Promise<Stripe | null> | null {
  const publishableKey = getStripePublishableKey();
  if (!publishableKey) return null;

  if (cachedPublishableKey !== publishableKey) {
    cachedPublishableKey = publishableKey;
    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
}
