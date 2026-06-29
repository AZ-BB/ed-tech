import "server-only";

import { sendResendEmail } from "@/lib/resend/send-email";
import { getResendFromEmail } from "@/lib/resend/config";
import {
  buildPaymentRequestEmailHtml,
  buildPaymentRequestEmailText,
  PAYMENT_REQUEST_EMAIL_SUBJECT,
  type PaymentRequestEmailContentInput,
} from "@/lib/payment-request-email-content";

export type SendApplicationPaymentRequestEmailInput = PaymentRequestEmailContentInput & {
  bodyOverride?: string;
};

export async function sendApplicationPaymentRequestEmail(
  input: SendApplicationPaymentRequestEmailInput,
) {
  const emailOptions = input.bodyOverride != null ? { bodyOverride: input.bodyOverride } : {};
  return sendResendEmail({
    to: input.recipientEmail,
    subject: PAYMENT_REQUEST_EMAIL_SUBJECT,
    html: buildPaymentRequestEmailHtml(input, emailOptions),
    text: buildPaymentRequestEmailText(input, emailOptions),
    tags: [{ name: "category", value: "application_payment_request" }],
  });
}

export function resolvePaymentFromEmailDisplay(): string {
  return getResendFromEmail()?.trim() || "Univeera <noreply@univeera.me>";
}
