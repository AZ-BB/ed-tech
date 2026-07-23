import "server-only";

import { format, isValid, parseISO } from "date-fns";
import { wrapEmailHtml } from "@/lib/resend/email-layout";
import { sendResendEmail } from "@/lib/resend/send-email";

export type SendWebinarReminderEmailInput = {
  to: string;
  studentFirstName: string;
  webinarTitle: string;
  scheduledAt: string;
  timezoneLabel: string;
  advisorName: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatWebinarDateTime(
  value: string,
  timezoneLabel: string,
): string {
  const parsed = parseISO(value);
  if (!isValid(parsed)) return value;
  return `${format(parsed, "EEEE, MMMM d, yyyy 'at' h:mm a")} ${timezoneLabel}`;
}

function buildReminderHtml(input: SendWebinarReminderEmailInput): string {
  const studentFirstName = escapeHtml(input.studentFirstName);
  const webinarTitle = escapeHtml(input.webinarTitle);
  const dateTime = escapeHtml(
    formatWebinarDateTime(input.scheduledAt, input.timezoneLabel),
  );
  const advisorName = escapeHtml(input.advisorName);

  return wrapEmailHtml({
    bodyHtml: `<p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">Reminder: webinar tomorrow</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">Hi ${studentFirstName},</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4f44;">This is a friendly reminder that you are registered for <strong>${webinarTitle}</strong> with <strong>${advisorName}</strong>.</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">When:</p>
          <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#1a2e22;">${dateTime}</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#3d4f44;">We will send you the meeting link when the session starts. You can also check your Univeera dashboard for updates.</p>`,
    footerHtml: `<p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:#3d4f44;">Warm regards,</p>
          <p style="margin:0;font-size:14px;line-height:1.5;color:#3d4f44;">The Univeera Team</p>`,
  });
}

function buildReminderText(input: SendWebinarReminderEmailInput): string {
  const dateTime = formatWebinarDateTime(input.scheduledAt, input.timezoneLabel);

  return `Reminder: webinar tomorrow

Hi ${input.studentFirstName},

This is a friendly reminder that you are registered for ${input.webinarTitle} with ${input.advisorName}.

When: ${dateTime}

We will send you the meeting link when the session starts. You can also check your Univeera dashboard for updates.

Warm regards,
The Univeera Team
`;
}

export async function sendWebinarReminderEmail(input: SendWebinarReminderEmailInput) {
  return sendResendEmail({
    to: input.to,
    subject: `Reminder: ${input.webinarTitle} is tomorrow`,
    html: buildReminderHtml(input),
    text: buildReminderText(input),
    tags: [{ name: "category", value: "webinar_reminder" }],
  });
}
