import "server-only";

import { sendResendEmail } from "@/lib/resend/send-email";

const SUPPORT_EMAIL = "admin@univeera.me";

export type SendStudentSchoolInviteEmailInput = {
  to: string;
  studentFirstName: string;
  schoolName: string;
  schoolCode: string;
  signupUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildStudentSchoolInviteHtml(input: SendStudentSchoolInviteEmailInput): string {
  const studentFirstName = escapeHtml(input.studentFirstName);
  const schoolName = escapeHtml(input.schoolName);
  const code = escapeHtml(input.schoolCode);
  const signupUrl = escapeHtml(input.signupUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f3ee;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3ee;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e2d8;overflow:hidden;">
        <tr><td style="padding:28px 28px 8px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">You're invited to join Univeera</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">Hi ${studentFirstName},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;"><strong>${schoolName}</strong> has invited you to join Univeera.</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">Univeera is here to support you as you explore majors, universities, scholarships, essays, conduct advisor sessions, and enable your next steps after high school. You will also be able to speak to students who were in your shoes not too long ago and learn from their experiences.</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4f44;">You do not need to have everything figured out right now. The platform is designed to guide you one step at a time and help you feel more confident as you build your university journey.</p>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#3d4f44;">To create your account, please use the details below:</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">School access code:</p>
          <p style="margin:0 0 16px;padding:12px 16px;background:#f0f7f2;border-radius:8px;font-size:20px;font-weight:700;letter-spacing:0.08em;color:#2d6a4f;font-family:ui-monospace,monospace;">${code}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Signup link:</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.5;"><a href="${signupUrl}" style="color:#2d6a4f;word-break:break-all;">${signupUrl}</a></p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#3d4f44;">Once you sign up, you will be able to start building your university journey from your dashboard.</p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#3d4f44;">We are excited to have you on Univeera and if you have any questions please feel free to reach out to us at any time at the following email address <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;">${SUPPORT_EMAIL}</a>.</p>
          <a href="${signupUrl}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">Create your account</a>
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

function buildStudentSchoolInviteText(input: SendStudentSchoolInviteEmailInput): string {
  return `You're invited to join Univeera

Hi ${input.studentFirstName},
${input.schoolName} has invited you to join Univeera.
Univeera is here to support you as you explore majors, universities, scholarships, essays, conduct advisor sessions, and enable your next steps after high school. You will also be able to speak to students who were in your shoes not too long ago and learn from their experiences.
You do not need to have everything figured out right now. The platform is designed to guide you one step at a time and help you feel more confident as you build your university journey.
To create your account, please use the details below:
School access code: ${input.schoolCode}
Signup link: ${input.signupUrl}
Once you sign up, you will be able to start building your university journey from your dashboard.
We are excited to have you on Univeera and if you have any questions please feel free to reach out to us at any time at the following email address ${SUPPORT_EMAIL}
Warm regards,
The Univeera Team
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
