"use client";

import { getStripePromise } from "@/lib/stripe/stripe-promise";
import {
  CheckoutElementsProvider,
  ContactDetailsElement,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import { useMemo, useState } from "react";

const WALLET_PAYMENT_METHODS = new Set(["apple_pay", "google_pay"]);

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

function buildSuccessUrl(successReturnPath: string, sessionId: string): string {
  const separator = successReturnPath.includes("?") ? "&" : "?";
  return `${successReturnPath}${separator}session_id=${encodeURIComponent(sessionId)}`;
}

function readErrorMessage(error: unknown): string | null {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return null;
}

type PaymentRequestCheckoutFormProps = {
  title: string;
  description?: string;
  successReturnPath: string;
  /** When true, collect session email via ContactDetailsElement (standalone links). */
  collectContactEmail: boolean;
};

function PaymentRequestCheckoutForm({
  title,
  description,
  successReturnPath,
  collectContactEmail,
}: PaymentRequestCheckoutFormProps) {
  const checkoutState = useCheckoutElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [contactReady, setContactReady] = useState(!collectContactEmail);

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
  const canPay = paymentReady && contactReady;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      // return_url is set server-side when the Checkout Session is created.
      // When ContactDetailsElement is mounted, Stripe reads email from that element —
      // passing `email` to confirm() throws IntegrationError.
      const confirmOptions: Parameters<typeof checkout.confirm>[0] = {
        redirect: "if_required",
      };
      if (!collectContactEmail) {
        const email = checkout.email?.trim();
        if (email) {
          confirmOptions.email = email;
        }
      }

      const confirmResult = await checkout.confirm(confirmOptions);

      if (confirmResult.type === "error") {
        setMessage(confirmResult.error.message);
        setIsSubmitting(false);
        return;
      }

      const sessionId = confirmResult.session.id?.trim();
      if (!sessionId) {
        setMessage(
          "Payment completed but we could not verify the session. Please contact support.",
        );
        setIsSubmitting(false);
        return;
      }

      window.location.assign(buildSuccessUrl(successReturnPath, sessionId));
    } catch (error) {
      console.error("[PaymentRequestCheckout] confirm failed", error);
      setMessage(
        readErrorMessage(error) ??
          "Something went wrong while processing your payment. Please try again.",
      );
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
        {collectContactEmail ? (
          <ContactDetailsElement
            onChange={(event) => {
              setContactReady(event.complete);
            }}
          />
        ) : null}
        <PaymentElement
          options={{
            layout: "tabs",
            ...(collectContactEmail
              ? {
                  fields: { billingDetails: { email: "never" } },
                  walletOptions: { emailRequired: true },
                }
              : {}),
            wallets: {
              applePay: "auto",
              googlePay: "auto",
            },
          }}
          onChange={(event) => {
            setPaymentReady(event.complete);
            if (collectContactEmail && event.complete) {
              const paymentMethodType = event.value.type;
              if (WALLET_PAYMENT_METHODS.has(paymentMethodType)) {
                setContactReady(true);
              }
            }
          }}
        />

        {message ? (
          <p className="text-sm text-[#b42318]" role="alert">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || !canPay}
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
  successReturnPath: string;
  collectContactEmail?: boolean;
};

export function PaymentRequestCheckout({
  clientSecret,
  title,
  description,
  successReturnPath,
  collectContactEmail = false,
}: PaymentRequestCheckoutProps) {
  const stripePromise = getStripePromise();
  const checkoutOptions = useMemo(
    () => ({
      clientSecret,
      elementsOptions: { appearance: checkoutAppearance },
    }),
    [clientSecret],
  );

  if (!stripePromise) {
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
    <CheckoutElementsProvider stripe={stripePromise} options={checkoutOptions}>
      <PaymentRequestCheckoutForm
        title={title}
        description={description}
        successReturnPath={successReturnPath}
        collectContactEmail={collectContactEmail}
      />
    </CheckoutElementsProvider>
  );
}
