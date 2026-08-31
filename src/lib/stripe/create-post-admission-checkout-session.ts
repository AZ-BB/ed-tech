import "server-only";

import {
  buildPaymentRequestReturnUrl,
  createPaymentRequestCheckoutSession,
} from "@/lib/stripe/create-payment-request-checkout-session";

export type CreatePostAdmissionCheckoutSessionInput = {
  paymentId: number;
  caseId: number;
  customerEmail: string;
  amountAed: number;
  existingSessionId?: string | null;
};

export type CreatePostAdmissionCheckoutSessionResult =
  | { ok: true; sessionId: string; clientSecret: string; reused: boolean }
  | { ok: false; error: string };

export async function createPostAdmissionCheckoutSession(
  input: CreatePostAdmissionCheckoutSessionInput,
): Promise<CreatePostAdmissionCheckoutSessionResult> {
  const amountLabel = input.amountAed.toLocaleString();
  const returnUrl = await buildPaymentRequestReturnUrl(
    `/post-admission-support/payment/success?case_id=${input.caseId}`,
  );

  return createPaymentRequestCheckoutSession({
    paymentId: input.paymentId,
    customerEmail: input.customerEmail,
    amountAed: input.amountAed,
    productName: "Post-Admission Support Payment",
    productDescription: `${amountLabel} AED post-admission support payment`,
    returnUrl,
    metadata: {
      payment_id: String(input.paymentId),
      post_admission_case_id: String(input.caseId),
    },
    existingSessionId: input.existingSessionId,
  });
}
