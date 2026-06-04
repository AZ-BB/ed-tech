import "server-only";

import { sendResendEmail } from "@/lib/resend/send-email";

export type SendStudentSchoolInviteEmailInput = {
  to: string;
  studentEmail: string;
  schoolCode: string;
  invitedByName: string;
  signupUrl: string;
  schoolName?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildStudentSchoolInviteHtml(input: SendStudentSchoolInviteEmailInput): string {
  const invitedBy = escapeHtml(input.invitedByName);
  const email = escapeHtml(input.studentEmail);
  const code = escapeHtml(input.schoolCode);
  const signupUrl = escapeHtml(input.signupUrl);
  const schoolLine = input.schoolName?.trim()
    ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">School: <strong>${escapeHtml(input.schoolName.trim())}</strong></p>`
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
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">You're invited to join</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">You've been invited by <strong>${invitedBy}</strong> to create your student account.</p>
          ${schoolLine}
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Sign up using this email address:</p>
          <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#1a2e22;">${email}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Your school access code:</p>
          <p style="margin:0 0 24px;padding:12px 16px;background:#f0f7f2;border-radius:8px;font-size:20px;font-weight:700;letter-spacing:0.08em;color:#2d6a4f;font-family:ui-monospace,monospace;">${code}</p>
          <a href="${signupUrl}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">Create your account</a>
        </td></tr>
        <tr><td style="padding:16px 28px 28px;border-top:1px solid #eee9dc;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#7a8a80;">If the button doesn't work, copy this link into your browser:<br><a href="${signupUrl}" style="color:#2d6a4f;word-break:break-all;">${signupUrl}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildStudentSchoolInviteText(input: SendStudentSchoolInviteEmailInput): string {
  const schoolLine = input.schoolName?.trim()
    ? `School: ${input.schoolName.trim()}\n\n`
    : "";

  return `You're invited to join Univeera

You've been invited by ${input.invitedByName} to create your student account.

${schoolLine}Sign up using this email address:
${input.studentEmail}

Your school access code:
${input.schoolCode}

Create your account: ${input.signupUrl}
`;
}

export async function sendStudentSchoolInviteEmail(
  input: SendStudentSchoolInviteEmailInput,
) {
  return sendResendEmail({
    to: input.to,
    subject: "You're invited to join Univeera",
    html: buildStudentSchoolInviteHtml(input),
    text: buildStudentSchoolInviteText(input),
    tags: [{ name: "category", value: "student_school_invite" }],
  });
}
