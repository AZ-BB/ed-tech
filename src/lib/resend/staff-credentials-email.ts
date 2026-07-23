import "server-only";

import { wrapEmailHtml } from "@/lib/resend/email-layout";
import { sendResendEmail } from "@/lib/resend/send-email";

const SUPPORT_EMAIL = "admin@univeera.me";

export type SendStaffCredentialsEmailInput = {
  to: string;
  firstName: string;
  email: string;
  password: string;
  loginUrl: string;
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

  return wrapEmailHtml({
    bodyHtml: `<p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">Your Univeera account is ready</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">Hi ${firstName},</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4f44;">Welcome to Univeera. Your account has been created, and you can now sign in to access your dashboard.</p>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#3d4f44;">Here are your login details:</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Login email:</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1a2e22;">${email}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Temporary password:</p>
          <p style="margin:0 0 16px;padding:12px 16px;background:#f0f7f2;border-radius:8px;font-size:16px;font-weight:700;color:#2d6a4f;font-family:ui-monospace,monospace;word-break:break-all;">${password}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Sign-in link:</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.5;"><a href="${loginUrl}" style="color:#2d6a4f;word-break:break-all;">${loginUrl}</a></p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#3d4f44;">For your security, please update your password after signing in for the first time.</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#3d4f44;">If anything feels unclear or you are not able to access your account, do not worry. Our team will be more than happy to help you get set up smoothly.</p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#3d4f44;">Feel free to contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;">${SUPPORT_EMAIL}</a> with any questions you may have.</p>
          <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">Sign in</a>`,
    footerHtml: `<p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:#3d4f44;">Warm regards,</p>
          <p style="margin:0;font-size:14px;line-height:1.5;color:#3d4f44;">The Univeera Team</p>`,
  });
}

function buildStaffCredentialsText(input: SendStaffCredentialsEmailInput): string {
  return `Your Univeera account is ready

Hi ${input.firstName},

Welcome to Univeera. Your account has been created, and you can now sign in to access your dashboard.

Here are your login details:

Login email: ${input.email}
Temporary password: ${input.password}
Sign-in link: ${input.loginUrl}

For your security, please update your password after signing in for the first time.

If anything feels unclear or you are not able to access your account, do not worry. Our team will be more than happy to help you get set up smoothly.

Feel free to contact us at ${SUPPORT_EMAIL} with any questions you may have.

Warm regards,
The Univeera Team
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
