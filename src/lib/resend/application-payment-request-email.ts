import "server-only";

import { ONBOARDING_DEPOSIT_AED } from "@/lib/application-support-payment";
import { sendResendEmail } from "@/lib/resend/send-email";

export type SendApplicationPaymentRequestEmailInput = {
  to: string;
  studentName: string;
  applicationId: number;
  packageLabel: string;
  payUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildApplicationPaymentRequestHtml(
  input: SendApplicationPaymentRequestEmailInput,
): string {
  const studentName = escapeHtml(input.studentName);
  const applicationId = escapeHtml(String(input.applicationId));
  const packageLabel = escapeHtml(input.packageLabel || "Application support");
  const payUrl = escapeHtml(input.payUrl);
  const amount = ONBOARDING_DEPOSIT_AED.toLocaleString();

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f3ee;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3ee;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e2d8;overflow:hidden;">
        <tr><td style="padding:28px 28px 8px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">Application support payment</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4f44;">Hi ${studentName},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">Please complete your <strong>${amount} AED</strong> onboarding deposit to continue your application support request.</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Application:</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1a2e22;">#${applicationId}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Package:</p>
          <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#1a2e22;">${packageLabel}</p>
          <a href="${payUrl}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">Pay ${amount} AED securely</a>
        </td></tr>
        <tr><td style="padding:16px 28px 28px;border-top:1px solid #eee9dc;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#7a8a80;">This link is private. Do not share it publicly. If the button doesn't work, copy this URL into your browser:<br><a href="${payUrl}" style="color:#2d6a4f;word-break:break-all;">${payUrl}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildApplicationPaymentRequestText(
  input: SendApplicationPaymentRequestEmailInput,
): string {
  const amount = ONBOARDING_DEPOSIT_AED.toLocaleString();

  return `Application support payment

Hi ${input.studentName},

Please complete your ${amount} AED onboarding deposit to continue your application support request.

Application: #${input.applicationId}
Package: ${input.packageLabel || "Application support"}

Pay securely: ${input.payUrl}

This link is private. Do not share it publicly.
`;
}

export async function sendApplicationPaymentRequestEmail(
  input: SendApplicationPaymentRequestEmailInput,
) {
  const amount = ONBOARDING_DEPOSIT_AED.toLocaleString();

  return sendResendEmail({
    to: input.to,
    subject: `Complete your ${amount} AED application support deposit`,
    html: buildApplicationPaymentRequestHtml(input),
    text: buildApplicationPaymentRequestText(input),
    tags: [{ name: "category", value: "application_payment_request" }],
  });
}
