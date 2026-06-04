import "server-only";

import { sendResendEmail } from "@/lib/resend/send-email";

export type SendStaffCredentialsEmailInput = {
  to: string;
  firstName: string;
  email: string;
  password: string;
  loginUrl: string;
  accountLabel: string;
  schoolName?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildStaffCredentialsHtml(input: SendStaffCredentialsEmailInput): string {
  const firstName = escapeHtml(input.firstName);
  const email = escapeHtml(input.email);
  const password = escapeHtml(input.password);
  const loginUrl = escapeHtml(input.loginUrl);
  const accountLabel = escapeHtml(input.accountLabel);
  const schoolLine = input.schoolName?.trim()
    ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">You've been added to <strong>${escapeHtml(input.schoolName.trim())}</strong>.</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f3ee;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3ee;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e2d8;overflow:hidden;">
        <tr><td style="padding:28px 28px 8px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">Your account is ready</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">Hi ${firstName}, your <strong>${accountLabel}</strong> account has been created.</p>
          ${schoolLine}
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Sign in with this email:</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1a2e22;">${email}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Temporary password:</p>
          <p style="margin:0 0 20px;padding:12px 16px;background:#f0f7f2;border-radius:8px;font-size:16px;font-weight:700;color:#2d6a4f;font-family:ui-monospace,monospace;word-break:break-all;">${password}</p>
          <p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#7a8a80;">For security, change your password after your first sign-in when possible.</p>
          <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">Sign in</a>
        </td></tr>
        <tr><td style="padding:16px 28px 28px;border-top:1px solid #eee9dc;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#7a8a80;">If the button doesn't work, copy this link into your browser:<br><a href="${loginUrl}" style="color:#2d6a4f;word-break:break-all;">${loginUrl}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildStaffCredentialsText(input: SendStaffCredentialsEmailInput): string {
  const schoolLine = input.schoolName?.trim()
    ? `You've been added to ${input.schoolName.trim()}.\n\n`
    : "";

  return `Your Univeera account is ready

Hi ${input.firstName}, your ${input.accountLabel} account has been created.

${schoolLine}Sign in with this email:
${input.email}

Temporary password:
${input.password}

For security, change your password after your first sign-in when possible.

Sign in: ${input.loginUrl}
`;
}

export async function sendStaffCredentialsEmail(
  input: SendStaffCredentialsEmailInput,
) {
  return sendResendEmail({
    to: input.to,
    subject: "Your Univeera account is ready",
    html: buildStaffCredentialsHtml(input),
    text: buildStaffCredentialsText(input),
    tags: [{ name: "category", value: "staff_credentials" }],
  });
}
