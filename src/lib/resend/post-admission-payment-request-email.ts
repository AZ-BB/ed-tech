import "server-only";

import {
  buildPostAdmissionPaymentRequestEmailHtml,
  buildPostAdmissionPaymentRequestEmailText,
  POST_ADMISSION_PAYMENT_REQUEST_EMAIL_SUBJECT,
  type PostAdmissionPaymentRequestEmailContentInput,
} from "@/lib/post-admission-payment-request-email-content";
import { sendResendEmail } from "@/lib/resend/send-email";

export type SendPostAdmissionPaymentRequestEmailInput =
  PostAdmissionPaymentRequestEmailContentInput & {
    bodyOverride?: string;
  };

export async function sendPostAdmissionPaymentRequestEmail(
  input: SendPostAdmissionPaymentRequestEmailInput,
) {
  const emailOptions = input.bodyOverride != null ? { bodyOverride: input.bodyOverride } : {};

  return sendResendEmail({
    to: input.recipientEmail,
    subject: POST_ADMISSION_PAYMENT_REQUEST_EMAIL_SUBJECT,
    html: buildPostAdmissionPaymentRequestEmailHtml(input, emailOptions),
    text: buildPostAdmissionPaymentRequestEmailText(input, emailOptions),
    tags: [{ name: "category", value: "post_admission_payment_request" }],
  });
}
