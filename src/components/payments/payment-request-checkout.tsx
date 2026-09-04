"use client";

import { getStripePublishableKey } from "@/lib/stripe/publishable-key";
import { loadStripe } from "@stripe/stripe-js";
import {
  CheckoutElementsProvider,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import { useMemo, useState } from "react";

const checkoutAppearance = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#2D6A4F",
    colorBackground: "#ffffff",
    colorText: "#1a2e22",
    colorDanger: "#b42318",
    fontFamily: "system-ui, sans-serif",
    borderRadius: "8px",
  },
};

type PaymentRequestCheckoutFormProps = {
  title: string;
  description?: string;
};

function PaymentRequestCheckoutForm({
  title,
  description,
}: PaymentRequestCheckoutFormProps) {
  const checkoutState = useCheckoutElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);

  if (checkoutState.type === "loading") {
    return (
      <div className="rounded-[14px] border border-[var(--border-light)] bg-white px-6 py-8 text-center">
        <p className="text-sm text-[var(--text-mid)]">Loading secure checkout…</p>
      </div>
    );
  }

  if (checkoutState.type === "error") {
    return (
      <div className="rounded-[14px] border border-[var(--border-light)] bg-white px-6 py-8 text-center">
        <h1 className="text-lg font-semibold tracking-tight text-[var(--text)]">
          Payment unavailable
        </h1>
        <p className="mt-2 text-sm text-[var(--text-mid)]">
          {checkoutState.error.message}
        </p>
      </div>
    );
  }

  const { checkout } = checkoutState;
  const amountLabel = checkout.total.total.amount;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const confirmResult = await checkout.confirm();

    if (confirmResult.type === "error") {
      setMessage(confirmResult.error.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-[14px] border border-[var(--border-light)] bg-white px-6 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-lg font-semibold tracking-tight text-[var(--text)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-[var(--text-mid)]">{description}</p>
        ) : null}
      </div>

      <div className="mb-6 rounded-[10px] border border-[#e8f5ee] bg-[#f8fbf9] px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-[var(--text-mid)]">Amount due</span>
          <span className="text-lg font-semibold text-[var(--text)]">
            {amountLabel}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <PaymentElement
          options={{
            layout: "tabs", wallets: {
              applePay: 'auto',
              googlePay: 'auto'
            }
          }}
          onChange={(event) => setPaymentReady(event.complete)}
        />

        {message ? (
          <p className="text-sm text-[#b42318]" role="alert">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || !paymentReady}
          className="inline-flex w-full items-center justify-center rounded-[8px] bg-[#2D6A4F] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Processing…" : `Pay ${amountLabel} securely`}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-[var(--text-mid)]">
        Payments are processed securely by Stripe.
      </p>
    </div>
  );
}

export type PaymentRequestCheckoutProps = {
  clientSecret: string;
  title: string;
  description?: string;
};

export function PaymentRequestCheckout({
  clientSecret,
  title,
  description,
}: PaymentRequestCheckoutProps) {
  const publishableKey = getStripePublishableKey();
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  if (!publishableKey || !stripePromise) {
    return (
      <div className="rounded-[14px] border border-[var(--border-light)] bg-white px-6 py-8 text-center">
        <h1 className="text-lg font-semibold tracking-tight text-[var(--text)]">
          Payment unavailable
        </h1>
        <p className="mt-2 text-sm text-[var(--text-mid)]">
          Stripe is not configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
        </p>
      </div>
    );
  }

  return (
    <CheckoutElementsProvider
      stripe={stripePromise}
      options={{
        clientSecret,
        elementsOptions: { appearance: checkoutAppearance },
      }}
    >
      <PaymentRequestCheckoutForm title={title} description={description} />
    </CheckoutElementsProvider>
  );
}
