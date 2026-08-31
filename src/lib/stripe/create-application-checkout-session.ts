import "server-only";

import {
  buildPaymentRequestReturnUrl,
  createPaymentRequestCheckoutSession,
} from "@/lib/stripe/create-payment-request-checkout-session";

export type CreateApplicationCheckoutSessionInput = {
  paymentId: number;
  applicationId: number;
  customerEmail: string;
  packageLabel: string;
  amountAed: number;
  existingSessionId?: string | null;
};

export type CreateApplicationCheckoutSessionResult =
  | { ok: true; sessionId: string; clientSecret: string; reused: boolean }
  | { ok: false; error: string };

export async function createApplicationCheckoutSession(
  input: CreateApplicationCheckoutSessionInput,
): Promise<CreateApplicationCheckoutSessionResult> {
  const amountLabel = input.amountAed.toLocaleString();
  const returnUrl = await buildPaymentRequestReturnUrl(
    `/application-support/payment/success?application_id=${input.applicationId}`,
  );

  return createPaymentRequestCheckoutSession({
    paymentId: input.paymentId,
    customerEmail: input.customerEmail,
    amountAed: input.amountAed,
    productName: "Application Support Payment",
    productDescription: `${amountLabel} AED application support payment${input.packageLabel ? ` — ${input.packageLabel}` : ""}`,
    returnUrl,
    metadata: {
      payment_id: String(input.paymentId),
      application_id: String(input.applicationId),
    },
    existingSessionId: input.existingSessionId,
  });
}
