import "server-only";

import { sendResendEmail } from "@/lib/resend/send-email";

export type SendApplicationPaymentRequestEmailInput = {
  to: string;
  studentFirstName: string;
  applicationId: number;
  packageLabel: string;
  payUrl: string;
  amountAed: number;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatAmountAed(amountAed: number): string {
  return amountAed.toLocaleString();
}

function buildApplicationPaymentRequestHtml(
  input: SendApplicationPaymentRequestEmailInput,
): string {
  const studentFirstName = escapeHtml(input.studentFirstName);
  const applicationId = escapeHtml(String(input.applicationId));
  const packageLabel = escapeHtml(input.packageLabel || "Application support");
  const payUrl = escapeHtml(input.payUrl);
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
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">Complete your ${amount} AED application support payment</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">Hi ${studentFirstName},</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4f44;">Your application support payment request is ready.</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Application ID:</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1a2e22;">${applicationId}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Package:</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1a2e22;">${packageLabel}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Amount:</p>
          <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#1a2e22;">${amount} AED</p>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#3d4f44;">You can complete your payment securely using the link below:</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Secure payment link:</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.5;"><a href="${payUrl}" style="color:#2d6a4f;word-break:break-all;">${payUrl}</a></p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#3d4f44;">Once the payment is completed, our team will continue supporting you with the next steps of your application. You are not alone in this process. We will help you stay organized and move forward clearly.</p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#3d4f44;">If you have any questions before completing the payment, please reach out to the Univeera team.</p>
          <a href="${payUrl}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">Pay ${amount} AED securely</a>
        </td></tr>
        <tr><td style="padding:16px 28px 28px;border-top:1px solid #eee9dc;">
          <p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:#3d4f44;">Warm regards,</p>
          <p style="margin:0;font-size:14px;line-height:1.5;color:#3d4f44;">The Univeera Team</p>
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
  const amount = formatAmountAed(input.amountAed);

  return `Complete your ${amount} AED application support payment

Hi ${input.studentFirstName},

Your application support payment request is ready.

Application ID: ${input.applicationId}
Package: ${input.packageLabel || "Application support"}
Amount: ${amount} AED

You can complete your payment securely using the link below:

Secure payment link: ${input.payUrl}

Once the payment is completed, our team will continue supporting you with the next steps of your application. You are not alone in this process. We will help you stay organized and move forward clearly.

If you have any questions before completing the payment, please reach out to the Univeera team.

Warm regards,
The Univeera Team
`;
}

export async function sendApplicationPaymentRequestEmail(
  input: SendApplicationPaymentRequestEmailInput,
) {
  const amount = formatAmountAed(input.amountAed);

  return sendResendEmail({
    to: input.to,
    subject: `Complete your ${amount} AED application support payment`,
    html: buildApplicationPaymentRequestHtml(input),
    text: buildApplicationPaymentRequestText(input),
    tags: [{ name: "category", value: "application_payment_request" }],
  });
}
