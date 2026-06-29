import "server-only";

import { sendResendEmail } from "@/lib/resend/send-email";
import { formatWebinarDateTime } from "@/lib/resend/webinar-reminder-email";

export type SendWebinarRegistrationConfirmationEmailInput = {
  to: string;
  studentFirstName: string;
  webinarTitle: string;
  scheduledAt: string;
  timezoneLabel: string;
  advisorName: string;
  meetingLink?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildConfirmationHtml(
  input: SendWebinarRegistrationConfirmationEmailInput,
): string {
  const studentFirstName = escapeHtml(input.studentFirstName);
  const webinarTitle = escapeHtml(input.webinarTitle);
  const dateTime = escapeHtml(
    formatWebinarDateTime(input.scheduledAt, input.timezoneLabel),
  );
  const advisorName = escapeHtml(input.advisorName);
  const meetingLink = input.meetingLink?.trim() ?? "";
  const hasMeetingLink = meetingLink.length > 0;
  const meetingLinkEscaped = escapeHtml(meetingLink);

  const linkSection = hasMeetingLink
    ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#3d4f44;">Here is your meeting link for the session:</p>
          <a href="${meetingLinkEscaped}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">Join webinar</a>
          <p style="margin:16px 0 20px;font-size:12px;line-height:1.5;color:#7a8a80;">If the button doesn't work, copy this link into your browser:<br><a href="${meetingLinkEscaped}" style="color:#2d6a4f;word-break:break-all;">${meetingLinkEscaped}</a></p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#3d4f44;">We'll also send you a reminder the day before the session.</p>`
    : `<p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#3d4f44;">We'll send you a reminder the day before the session, and the meeting link when the webinar starts.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f3ee;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3ee;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e2d8;overflow:hidden;">
        <tr><td style="padding:28px 28px 8px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">Thanks for registering for our webinar</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">Hi ${studentFirstName},</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4f44;">You're registered for <strong>${webinarTitle}</strong> with <strong>${advisorName}</strong>. We're glad you'll be joining us.</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">When:</p>
          <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#1a2e22;">${dateTime}</p>
          ${linkSection}
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

function buildConfirmationText(
  input: SendWebinarRegistrationConfirmationEmailInput,
): string {
  const dateTime = formatWebinarDateTime(input.scheduledAt, input.timezoneLabel);
  const meetingLink = input.meetingLink?.trim() ?? "";
  const hasMeetingLink = meetingLink.length > 0;

  const linkLines = hasMeetingLink
    ? `

Here is your meeting link for the session:
${meetingLink}

We'll also send you a reminder the day before the session.`
    : `

We'll send you a reminder the day before the session, and the meeting link when the webinar starts.`;

  return `Thanks for registering for our webinar

Hi ${input.studentFirstName},

You're registered for ${input.webinarTitle} with ${input.advisorName}. We're glad you'll be joining us.

When: ${dateTime}${linkLines}

Warm regards,
The Univeera Team
`;
}

export async function sendWebinarRegistrationConfirmationEmail(
  input: SendWebinarRegistrationConfirmationEmailInput,
) {
  return sendResendEmail({
    to: input.to,
    subject: `Thanks for registering: ${input.webinarTitle}`,
    html: buildConfirmationHtml(input),
    text: buildConfirmationText(input),
    tags: [{ name: "category", value: "webinar_registration_confirmation" }],
  });
}
