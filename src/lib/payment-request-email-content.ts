import { wrapEmailHtml } from "@/lib/resend/email-layout";

export type PaymentRequestEmailContentInput = {
  studentFirstName: string;
  packageDisplayName: string;
  amountAed: number;
  payUrl: string;
  senderName: string;
  recipientEmail: string;
  fromEmailDisplay: string;
};

export const PAYMENT_REQUEST_EMAIL_SUBJECT =
  "Your Univeera Application Support Package";

export const PAYMENT_LINK_PLACEHOLDER = "[secure Stripe checkout]";

const PAYMENT_REQUEST_EMAIL_BODY_MAX_LENGTH = 8000;

function formatAmountAed(amountAed: number): string {
  return amountAed.toLocaleString();
}

export function replacePaymentLinkPlaceholder(body: string, payUrl: string): string {
  return body.split(PAYMENT_LINK_PLACEHOLDER).join(payUrl);
}

export function validatePaymentRequestEmailBody(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) {
    return "Email message cannot be empty.";
  }
  if (trimmed.length > PAYMENT_REQUEST_EMAIL_BODY_MAX_LENGTH) {
    return `Email message is too long (max ${PAYMENT_REQUEST_EMAIL_BODY_MAX_LENGTH.toLocaleString()} characters).`;
  }
  return null;
}

export function buildPaymentRequestEmailBody(
  input: PaymentRequestEmailContentInput,
  options: { usePlaceholderLink?: boolean } = {},
): string {
  const amount = formatAmountAed(input.amountAed);
  const payLink = options.usePlaceholderLink ? PAYMENT_LINK_PLACEHOLDER : input.payUrl;
  const firstName = input.studentFirstName.trim() || "there";

  return `Hi ${firstName},

It was a pleasure speaking with you and learning more about your university goals.

Based on our discussion, we'd like to recommend the following Univeera support package:

Package: ${input.packageDisplayName}
Amount due: AED ${amount}
Payment link: ${payLink}

This package will support you across your full application journey — university shortlisting, document preparation, personal statement review, and submission tracking for every application.

Once payment is completed, I'll begin working with you on the next steps.

Warm regards,
${input.senderName}
Univeera`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function plainTextEmailBodyToHtml(body: string, payUrl: string): string {
  return body
    .split("\n")
    .map((line) => {
      if (line.startsWith("Payment link:")) {
        const linkText = line.slice("Payment link:".length).trim();
        const href = linkText === PAYMENT_LINK_PLACEHOLDER ? payUrl : linkText;
        return `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#3d4f44;">Payment link: <a href="${escapeHtml(href)}" style="color:#2d6a4f;word-break:break-all;">${escapeHtml(href)}</a></p>`;
      }
      if (line.trim() === "") {
        return `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#3d4f44;">&nbsp;</p>`;
      }
      return `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#3d4f44;">${escapeHtml(line)}</p>`;
    })
    .join("");
}

export function buildPaymentRequestEmailHtmlBody(
  input: PaymentRequestEmailContentInput,
  options: { usePlaceholderLink?: boolean } = {},
): string {
  const body = buildPaymentRequestEmailBody(input, options);
  if (options.usePlaceholderLink) {
    return plainTextEmailBodyToHtml(body, PAYMENT_LINK_PLACEHOLDER);
  }
  return plainTextEmailBodyToHtml(body, input.payUrl);
}

function resolveEmailBody(
  input: PaymentRequestEmailContentInput,
  bodyOverride?: string,
): string {
  if (bodyOverride != null) {
    return bodyOverride;
  }
  return buildPaymentRequestEmailBody(input, { usePlaceholderLink: false });
}

export function buildPaymentRequestEmailHtml(
  input: PaymentRequestEmailContentInput,
  options: { bodyOverride?: string } = {},
): string {
  const body = resolveEmailBody(input, options.bodyOverride);
  const bodyHtml = plainTextEmailBodyToHtml(body, input.payUrl);
  const amount = formatAmountAed(input.amountAed);

  return wrapEmailHtml({
    bodyHtml: `<p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">${escapeHtml(PAYMENT_REQUEST_EMAIL_SUBJECT)}</h1>
          ${bodyHtml}
          <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#3d4f44;">If you have any questions before completing the payment, please reach out to the Univeera team.</p>
          <a href="${escapeHtml(input.payUrl)}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">Pay ${amount} AED securely</a>`,
  });
}

export function buildPaymentRequestEmailText(
  input: PaymentRequestEmailContentInput,
  options: { bodyOverride?: string } = {},
): string {
  const body = resolveEmailBody(input, options.bodyOverride);
  return `${PAYMENT_REQUEST_EMAIL_SUBJECT}

${body}

If you have any questions before completing the payment, please reach out to the Univeera team.`;
}

export type SendPaymentRequestInput = {
  applicationId: number;
  planId: number;
  amountAed: number;
  dueDate: string;
  emailBody: string;
  customUniversitiesCount?: number | null;
  internalNote?: string | null;
};
