import "server-only";

import type { StandaloneCheckoutMode } from "@/lib/standalone-payment-types";
import {
  buildPaymentRequestReturnUrl,
  buildStandalonePaymentCancelUrl,
  createHostedPaymentRequestCheckoutSession,
  createPaymentRequestCheckoutSession,
} from "@/lib/stripe/create-payment-request-checkout-session";

export type CreateStandaloneCheckoutSessionInput = {
  standalonePaymentId: number;
  amountAed: number;
  paymentToken: string;
  checkoutMode: StandaloneCheckoutMode;
  existingSessionId?: string | null;
};

export type CreateStandaloneCheckoutSessionResult =
  | {
      ok: true;
      checkoutMode: "custom";
      sessionId: string;
      clientSecret: string;
      reused: boolean;
    }
  | {
      ok: true;
      checkoutMode: "hosted";
      sessionId: string;
      url: string;
      reused: boolean;
    }
  | { ok: false; error: string };

export async function createStandaloneCheckoutSession(
  input: CreateStandaloneCheckoutSessionInput,
): Promise<CreateStandaloneCheckoutSessionResult> {
  const amountLabel = input.amountAed.toLocaleString();
  const metadata = {
    kind: "standalone_payment",
    standalone_payment_id: String(input.standalonePaymentId),
  };

  if (input.checkoutMode === "hosted") {
    const successUrl = await buildPaymentRequestReturnUrl("/pay/success");
    const cancelUrl = await buildStandalonePaymentCancelUrl(input.paymentToken);

    const hosted = await createHostedPaymentRequestCheckoutSession({
      paymentId: input.standalonePaymentId,
      amountAed: input.amountAed,
      productName: "Univeera Payment",
      productDescription: `${amountLabel} AED payment`,
      successUrl,
      cancelUrl,
      metadata,
      existingSessionId: input.existingSessionId,
    });

    if (!hosted.ok) {
      return hosted;
    }

    return {
      ok: true,
      checkoutMode: "hosted",
      sessionId: hosted.sessionId,
      url: hosted.url,
      reused: hosted.reused,
    };
  }

  const returnUrl = await buildPaymentRequestReturnUrl("/pay/success");
  const custom = await createPaymentRequestCheckoutSession({
    paymentId: input.standalonePaymentId,
    amountAed: input.amountAed,
    productName: "Univeera Payment",
    productDescription: `${amountLabel} AED payment`,
    returnUrl,
    metadata,
    existingSessionId: input.existingSessionId,
  });

  if (!custom.ok) {
    return custom;
  }

  return {
    ok: true,
    checkoutMode: "custom",
    sessionId: custom.sessionId,
    clientSecret: custom.clientSecret,
    reused: custom.reused,
  };
}
