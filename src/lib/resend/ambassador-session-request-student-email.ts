import "server-only";

import { format, isValid, parseISO } from "date-fns";
import { wrapEmailHtml } from "@/lib/resend/email-layout";
import { resolveStudentFirstNameFromRequestName } from "@/lib/resend/ambassador-specific-request-student-email";
import { sendResendEmail } from "@/lib/resend/send-email";

export type SendAmbassadorSessionRequestStudentEmailInput = {
  to: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  ambassadorName: string;
  prefTime1Iso: string;
  prefTime2Iso: string | null;
  prefTime3Iso: string | null;
  discussionTopics: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPreferredTime(iso: string): string {
  const trimmed = iso.trim();
  const parsed = parseISO(trimmed);
  if (!isValid(parsed)) return trimmed;
  return format(parsed, "EEEE, MMMM d, yyyy 'at' h:mm a");
}

function formatPreferredTimes(input: SendAmbassadorSessionRequestStudentEmailInput): string[] {
  const slots = [input.prefTime1Iso];
  if (input.prefTime2Iso?.trim()) slots.push(input.prefTime2Iso.trim());
  if (input.prefTime3Iso?.trim()) slots.push(input.prefTime3Iso.trim());
  return slots.map(formatPreferredTime);
}

function buildConfirmationHtml(input: SendAmbassadorSessionRequestStudentEmailInput): string {
  const studentFirstName = escapeHtml(resolveStudentFirstNameFromRequestName(input.studentName));
  const ambassadorName = escapeHtml(input.ambassadorName.trim());
  const studentEmail = escapeHtml(input.studentEmail.trim());
  const studentPhone = escapeHtml(input.studentPhone.trim());
  const discussionTopics = escapeHtml(input.discussionTopics.trim());
  const preferredTimes = formatPreferredTimes(input);
  const preferredTimesHtml = preferredTimes
    .map(
      (slot, index) =>
        `<li style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#1a2e22;">${escapeHtml(slot)}${index === 0 ? " <span style=\"color:#5c6b62;\">(first choice)</span>" : ""}</li>`,
    )
    .join("");

  return wrapEmailHtml({
    bodyHtml: `<p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">Ambassador session request received</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">Hi ${studentFirstName},</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4f44;">Thank you for booking an ambassador session. Our internal team will review and coordinate with you and the selected ambassador. Please allow us 24–48 hours to get back to you.</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Here is a summary of what you submitted:</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Ambassador:</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1a2e22;">${ambassadorName}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Your contact details:</p>
          <p style="margin:0 0 4px;font-size:15px;line-height:1.5;color:#3d4f44;">Email: ${studentEmail}</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">Phone: ${studentPhone}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Preferred times:</p>
          <ul style="margin:0 0 16px;padding-left:20px;">${preferredTimesHtml}</ul>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">What you would like to discuss:</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4f44;white-space:pre-wrap;">${discussionTopics}</p>`,
    footerHtml: `<p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:#3d4f44;">Best,</p>
          <p style="margin:0;font-size:14px;line-height:1.5;color:#3d4f44;">The Univeera Team</p>`,
  });
}

function buildConfirmationText(input: SendAmbassadorSessionRequestStudentEmailInput): string {
  const studentFirstName = resolveStudentFirstNameFromRequestName(input.studentName);
  const preferredTimes = formatPreferredTimes(input)
    .map((slot, index) => `- ${slot}${index === 0 ? " (first choice)" : ""}`)
    .join("\n");

  return `Ambassador session request received

Hi ${studentFirstName},

Thank you for booking an ambassador session. Our internal team will review and coordinate with you and the selected ambassador. Please allow us 24-48 hours to get back to you.

Here is a summary of what you submitted:

Ambassador: ${input.ambassadorName.trim()}

Your contact details:
Email: ${input.studentEmail.trim()}
Phone: ${input.studentPhone.trim()}

Preferred times:
${preferredTimes}

What you would like to discuss:
${input.discussionTopics.trim()}

Best,
The Univeera Team
`;
}

export async function sendAmbassadorSessionRequestStudentEmail(
  input: SendAmbassadorSessionRequestStudentEmailInput,
) {
  return sendResendEmail({
    to: input.to,
    subject: "Your ambassador session request has been received",
    html: buildConfirmationHtml(input),
    text: buildConfirmationText(input),
    tags: [{ name: "category", value: "ambassador_session_request_student" }],
  });
}
