import "server-only";

import {
  buildPaymentRequestReturnUrl,
  createPaymentRequestCheckoutSession,
} from "@/lib/stripe/create-payment-request-checkout-session";

export type CreateStandaloneCheckoutSessionInput = {
  standalonePaymentId: number;
  amountAed: number;
  existingSessionId?: string | null;
};

export type CreateStandaloneCheckoutSessionResult =
  | { ok: true; sessionId: string; clientSecret: string; reused: boolean }
  | { ok: false; error: string };

export async function createStandaloneCheckoutSession(
  input: CreateStandaloneCheckoutSessionInput,
): Promise<CreateStandaloneCheckoutSessionResult> {
  const amountLabel = input.amountAed.toLocaleString();
  const returnUrl = await buildPaymentRequestReturnUrl("/pay/success");

  return createPaymentRequestCheckoutSession({
    paymentId: input.standalonePaymentId,
    amountAed: input.amountAed,
    productName: "Univeera Payment",
    productDescription: `${amountLabel} AED payment`,
    returnUrl,
    metadata: {
      kind: "standalone_payment",
      standalone_payment_id: String(input.standalonePaymentId),
    },
    existingSessionId: input.existingSessionId,
  });
}
