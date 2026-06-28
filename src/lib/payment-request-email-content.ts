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

const PAYMENT_LINK_PLACEHOLDER = "[secure Stripe checkout]";

function formatAmountAed(amountAed: number): string {
  return amountAed.toLocaleString();
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

export function buildPaymentRequestEmailHtmlBody(
  input: PaymentRequestEmailContentInput,
  options: { usePlaceholderLink?: boolean } = {},
): string {
  const body = buildPaymentRequestEmailBody(input, options);
  return body
    .split("\n")
    .map((line) => {
      if (line.startsWith("Payment link:")) {
        const link = options.usePlaceholderLink
          ? PAYMENT_LINK_PLACEHOLDER
          : input.payUrl;
        if (options.usePlaceholderLink) {
          return `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#3d4f44;">Payment link: ${PAYMENT_LINK_PLACEHOLDER}</p>`;
        }
        return `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#3d4f44;">Payment link: <a href="${escapeHtml(link)}" style="color:#2d6a4f;word-break:break-all;">${escapeHtml(link)}</a></p>`;
      }
      if (line.trim() === "") {
        return `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#3d4f44;">&nbsp;</p>`;
      }
      return `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#3d4f44;">${escapeHtml(line)}</p>`;
    })
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPaymentRequestEmailHtml(
  input: PaymentRequestEmailContentInput,
): string {
  const bodyHtml = buildPaymentRequestEmailHtmlBody(input, { usePlaceholderLink: false });
  const amount = formatAmountAed(input.amountAed);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f3ee;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3ee;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e2d8;overflow:hidden;">
        <tr><td style="padding:28px 28px 8px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">${escapeHtml(PAYMENT_REQUEST_EMAIL_SUBJECT)}</h1>
          ${bodyHtml}
          <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#3d4f44;">If you have any questions before completing the payment, please reach out to the Univeera team.</p>
          <a href="${escapeHtml(input.payUrl)}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">Pay ${amount} AED securely</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildPaymentRequestEmailText(
  input: PaymentRequestEmailContentInput,
): string {
  const body = buildPaymentRequestEmailBody(input, { usePlaceholderLink: false });
  return `${PAYMENT_REQUEST_EMAIL_SUBJECT}

${body}

If you have any questions before completing the payment, please reach out to the Univeera team.`;
}

export type SendPaymentRequestInput = {
  applicationId: number;
  planId: number;
  amountAed: number;
  dueDate: string;
  customUniversitiesCount?: number | null;
  internalNote?: string | null;
};
