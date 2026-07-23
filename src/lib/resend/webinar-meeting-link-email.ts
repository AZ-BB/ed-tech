import "server-only";

import { wrapEmailHtml } from "@/lib/resend/email-layout";
import { sendResendEmail } from "@/lib/resend/send-email";
import { formatWebinarDateTime } from "@/lib/resend/webinar-reminder-email";

export type SendWebinarMeetingLinkEmailInput = {
  to: string;
  studentFirstName: string;
  webinarTitle: string;
  scheduledAt: string;
  timezoneLabel: string;
  advisorName: string;
  meetingLink: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMeetingLinkHtml(input: SendWebinarMeetingLinkEmailInput): string {
  const studentFirstName = escapeHtml(input.studentFirstName);
  const webinarTitle = escapeHtml(input.webinarTitle);
  const dateTime = escapeHtml(
    formatWebinarDateTime(input.scheduledAt, input.timezoneLabel),
  );
  const advisorName = escapeHtml(input.advisorName);
  const meetingLink = escapeHtml(input.meetingLink);

  return wrapEmailHtml({
    bodyHtml: `<p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">Your webinar is starting</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">Hi ${studentFirstName},</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4f44;"><strong>${webinarTitle}</strong> with <strong>${advisorName}</strong> is now live. Join using the link below.</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">When:</p>
          <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#1a2e22;">${dateTime}</p>
          <a href="${meetingLink}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">Join webinar</a>`,
    footerHtml: `<p style="margin:0 0 12px;font-size:12px;line-height:1.5;color:#7a8a80;">If the button doesn't work, copy this link into your browser:<br><a href="${meetingLink}" style="color:#2d6a4f;word-break:break-all;">${meetingLink}</a></p>
          <p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:#3d4f44;">Warm regards,</p>
          <p style="margin:0;font-size:14px;line-height:1.5;color:#3d4f44;">The Univeera Team</p>`,
  });
}

function buildMeetingLinkText(input: SendWebinarMeetingLinkEmailInput): string {
  const dateTime = formatWebinarDateTime(input.scheduledAt, input.timezoneLabel);

  return `Your webinar is starting

Hi ${input.studentFirstName},

${input.webinarTitle} with ${input.advisorName} is now live. Join using the link below.

When: ${dateTime}

Join webinar: ${input.meetingLink}

Warm regards,
The Univeera Team
`;
}

export async function sendWebinarMeetingLinkEmail(
  input: SendWebinarMeetingLinkEmailInput,
) {
  return sendResendEmail({
    to: input.to,
    subject: `Join now: ${input.webinarTitle}`,
    html: buildMeetingLinkHtml(input),
    text: buildMeetingLinkText(input),
    tags: [{ name: "category", value: "webinar_meeting_link" }],
  });
}
