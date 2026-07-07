import {
  PAYMENT_LINK_PLACEHOLDER,
  plainTextEmailBodyToHtml,
} from "@/lib/payment-request-email-content";

export type PostAdmissionPaymentRequestEmailContentInput = {
  studentFirstName: string;
  amountAed: number;
  dueDate: string;
  payUrl: string;
  senderName: string;
  recipientEmail: string;
  fromEmailDisplay: string;
};

export const POST_ADMISSION_PAYMENT_REQUEST_EMAIL_SUBJECT =
  "Your Univeera Post-Admission Support Payment";

function formatAmountAed(amountAed: number): string {
  return amountAed.toLocaleString();
}

function formatDueDateLabel(dueDate: string): string {
  const trimmed = dueDate.trim();
  if (!trimmed) return "—";
  try {
    const d = new Date(`${trimmed}T12:00:00`);
    if (Number.isNaN(d.getTime())) return trimmed;
    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return trimmed;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPostAdmissionPaymentRequestEmailBody(
  input: PostAdmissionPaymentRequestEmailContentInput,
  options: { usePlaceholderLink?: boolean; amountPending?: boolean } = {},
): string {
  const amount = options.amountPending
    ? "[enter amount above]"
    : formatAmountAed(input.amountAed);
  const payLink = options.usePlaceholderLink ? PAYMENT_LINK_PLACEHOLDER : input.payUrl;
  const firstName = input.studentFirstName.trim() || "there";
  const dueLabel = formatDueDateLabel(input.dueDate);

  return `Hi ${firstName},

It was great speaking with you about your next steps after receiving your offer.

To move forward with your post-admission support, please complete the payment below:

Service: Post-admission support
Amount due: AED ${amount}
Payment due by: ${dueLabel}
Payment link: ${payLink}

Your advisor can help with visa guidance, accommodation, tuition payments, scholarships, insurance, travel planning, and everything you need before your first day on campus.

Once payment is completed, we will get started on your personalised post-admission plan.

Warm regards,
${input.senderName}
Univeera`;
}

function resolveEmailBody(
  input: PostAdmissionPaymentRequestEmailContentInput,
  bodyOverride?: string,
): string {
  if (bodyOverride != null) {
    return bodyOverride;
  }
  return buildPostAdmissionPaymentRequestEmailBody(input, { usePlaceholderLink: false });
}

export function buildPostAdmissionPaymentRequestEmailHtml(
  input: PostAdmissionPaymentRequestEmailContentInput,
  options: { bodyOverride?: string } = {},
): string {
  const body = resolveEmailBody(input, options.bodyOverride);
  const bodyHtml = plainTextEmailBodyToHtml(body, input.payUrl);
  const amount = formatAmountAed(input.amountAed);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f3ee;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3ee;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e2d8;overflow:hidden;">
        <tr><td style="padding:28px 28px 8px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera · Post-admission support</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">${escapeHtml(POST_ADMISSION_PAYMENT_REQUEST_EMAIL_SUBJECT)}</h1>
          ${bodyHtml}
          <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#3d4f44;">If you have any questions before completing the payment, please reply to your advisor or contact the Univeera team.</p>
          <a href="${escapeHtml(input.payUrl)}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">Pay ${amount} AED securely</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildPostAdmissionPaymentRequestEmailText(
  input: PostAdmissionPaymentRequestEmailContentInput,
  options: { bodyOverride?: string } = {},
): string {
  const body = resolveEmailBody(input, options.bodyOverride);

  return `${POST_ADMISSION_PAYMENT_REQUEST_EMAIL_SUBJECT}

${body}

If you have any questions before completing the payment, please reply to your advisor or contact the Univeera team.`;
}
