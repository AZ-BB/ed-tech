import "server-only";

import { format, isValid, parseISO } from "date-fns";
import { wrapEmailHtml } from "@/lib/resend/email-layout";
import { sendResendEmail } from "@/lib/resend/send-email";
import { formatSessionDateTime } from "@/lib/resend/session-cancelled-student-email";

export type SessionBookedKind = "advisor" | "post_admission";

export type SendSessionBookedStudentEmailInput = {
  to: string;
  studentFirstName: string;
  sessionKind: SessionBookedKind;
  providerName: string;
  sessionDateTime: string;
  /** IANA timezone from Calendly invitee (e.g. America/New_York). */
  timezone?: string | null;
  meetingLink?: string | null;
  dashboardUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sessionSubjectLabel(kind: SessionBookedKind): string {
  return kind === "advisor" ? "advisor session" : "post-admission session";
}

function sessionTypePhrase(kind: SessionBookedKind): string {
  return kind === "advisor"
    ? "advisor session"
    : "post-admission support session";
}

export function formatBookedSessionDateTime(
  value: string,
  timezone?: string | null,
): string {
  const trimmed = value.trim();
  const parsed = parseISO(trimmed);
  if (!isValid(parsed)) return formatSessionDateTime(trimmed);

  const tz = timezone?.trim();
  if (tz) {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(parsed);
    } catch {
      // Invalid IANA timezone — fall through.
    }
  }

  return format(parsed, "EEEE, MMMM d, yyyy 'at' h:mm a");
}

function buildSessionBookedHtml(
  input: SendSessionBookedStudentEmailInput,
): string {
  const studentFirstName = escapeHtml(input.studentFirstName);
  const providerName = escapeHtml(input.providerName);
  const sessionType = escapeHtml(sessionTypePhrase(input.sessionKind));
  const subjectLabel = escapeHtml(sessionSubjectLabel(input.sessionKind));
  const sessionDateTime = escapeHtml(
    formatBookedSessionDateTime(input.sessionDateTime, input.timezone),
  );
  const dashboardUrl = escapeHtml(input.dashboardUrl);
  const meetingLink = input.meetingLink?.trim() ?? "";
  const hasMeetingLink = meetingLink.length > 0;
  const meetingLinkEscaped = escapeHtml(meetingLink);

  const meetingSection = hasMeetingLink
    ? `<p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Meeting link:</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;">
            <a href="${meetingLinkEscaped}" style="color:#2d6a4f;word-break:break-all;">${meetingLinkEscaped}</a>
          </p>`
    : `<p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#3d4f44;">Your calendar invite from Calendly includes the meeting details and join link.</p>`;

  return wrapEmailHtml({
    bodyHtml: `<p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">Your ${subjectLabel} is booked</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">Hi ${studentFirstName},</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4f44;">You have booked a ${sessionType} with <strong>${providerName}</strong>.</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">When:</p>
          <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#1a2e22;">${sessionDateTime}</p>
          ${meetingSection}
          <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">View in Univeera</a>`,
    footerHtml: `<p style="margin:0 0 12px;font-size:12px;line-height:1.5;color:#7a8a80;">If the button doesn't work, copy this link into your browser:<br><a href="${dashboardUrl}" style="color:#2d6a4f;word-break:break-all;">${dashboardUrl}</a></p>
          <p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:#3d4f44;">Warm regards,</p>
          <p style="margin:0;font-size:14px;line-height:1.5;color:#3d4f44;">The Univeera Team</p>`,
  });
}

function buildSessionBookedText(
  input: SendSessionBookedStudentEmailInput,
): string {
  const sessionType = sessionTypePhrase(input.sessionKind);
  const subjectLabel = sessionSubjectLabel(input.sessionKind);
  const sessionDateTime = formatBookedSessionDateTime(
    input.sessionDateTime,
    input.timezone,
  );
  const meetingLink = input.meetingLink?.trim() ?? "";
  const meetingLines = meetingLink
    ? `

Meeting link:
${meetingLink}`
    : `

Your calendar invite from Calendly includes the meeting details and join link.`;

  return `Your ${subjectLabel} is booked

Hi ${input.studentFirstName},

You have booked a ${sessionType} with ${input.providerName}.

When: ${sessionDateTime}${meetingLines}

View in Univeera: ${input.dashboardUrl}

Warm regards,
The Univeera Team
`;
}

export async function sendSessionBookedStudentEmail(
  input: SendSessionBookedStudentEmailInput,
) {
  const subjectLabel = sessionSubjectLabel(input.sessionKind);

  return sendResendEmail({
    to: input.to,
    subject: `Your ${subjectLabel} is booked`,
    html: buildSessionBookedHtml(input),
    text: buildSessionBookedText(input),
    tags: [{ name: "category", value: "session_booked_student" }],
  });
}
