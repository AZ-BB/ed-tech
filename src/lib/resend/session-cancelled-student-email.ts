import "server-only";

import { format, isValid, parseISO } from "date-fns";
import { wrapEmailHtml } from "@/lib/resend/email-layout";
import { sendResendEmail } from "@/lib/resend/send-email";

export type SessionCancelledKind = "advisor" | "ambassador";

export type SendSessionCancelledStudentEmailInput = {
  to: string;
  studentFirstName: string;
  sessionKind: SessionCancelledKind;
  providerName: string;
  sessionDateTime?: string | null;
  dashboardUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatSessionDateTime(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return "—";
  const parsed = parseISO(trimmed);
  if (isValid(parsed)) return format(parsed, "MMMM d, yyyy 'at' h:mm a");
  return trimmed;
}

function sessionTypeLabel(kind: SessionCancelledKind): string {
  return kind === "advisor" ? "advisor" : "ambassador";
}

function sessionSubjectLabel(kind: SessionCancelledKind): string {
  return kind === "advisor" ? "advisor session" : "ambassador session";
}

function buildSessionCancelledHtml(
  input: SendSessionCancelledStudentEmailInput,
): string {
  const studentFirstName = escapeHtml(input.studentFirstName);
  const providerName = escapeHtml(input.providerName);
  const sessionType = escapeHtml(sessionTypeLabel(input.sessionKind));
  const sessionDateTime = escapeHtml(
    formatSessionDateTime(input.sessionDateTime),
  );
  const dashboardUrl = escapeHtml(input.dashboardUrl);
  const subjectLabel = escapeHtml(sessionSubjectLabel(input.sessionKind));

  return wrapEmailHtml({
    bodyHtml: `<p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">Your ${subjectLabel} was cancelled</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">Hi ${studentFirstName},</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4f44;">We wanted to let you know that your ${sessionType} session with <strong>${providerName}</strong> has been cancelled.</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Session date and time:</p>
          <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#1a2e22;">${sessionDateTime}</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#3d4f44;">Your session credit has been returned to your Univeera account, so you can book another session from your dashboard whenever you are ready.</p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#3d4f44;">We are sorry for the inconvenience. These things can happen, and we will make sure you still get the support you need.</p>
          <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">Go to your dashboard</a>`,
    footerHtml: `<p style="margin:0 0 12px;font-size:12px;line-height:1.5;color:#7a8a80;">If the button doesn't work, copy this link into your browser:<br><a href="${dashboardUrl}" style="color:#2d6a4f;word-break:break-all;">${dashboardUrl}</a></p>
          <p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:#3d4f44;">Warm regards,</p>
          <p style="margin:0;font-size:14px;line-height:1.5;color:#3d4f44;">The Univeera Team</p>`,
  });
}

function buildSessionCancelledText(
  input: SendSessionCancelledStudentEmailInput,
): string {
  const sessionType = sessionTypeLabel(input.sessionKind);
  const sessionDateTime = formatSessionDateTime(input.sessionDateTime);
  const subjectLabel = sessionSubjectLabel(input.sessionKind);

  return `Your ${subjectLabel} was cancelled

Hi ${input.studentFirstName},

We wanted to let you know that your ${sessionType} session with ${input.providerName} has been cancelled.

Session date and time: ${sessionDateTime}

Your session credit has been returned to your Univeera account, so you can book another session from your dashboard whenever you are ready.

We are sorry for the inconvenience. These things can happen, and we will make sure you still get the support you need.

Go to your dashboard: ${input.dashboardUrl}

Warm regards,
The Univeera Team
`;
}

export async function sendSessionCancelledStudentEmail(
  input: SendSessionCancelledStudentEmailInput,
) {
  const subjectLabel = sessionSubjectLabel(input.sessionKind);

  return sendResendEmail({
    to: input.to,
    subject: `Your ${subjectLabel} was cancelled`,
    html: buildSessionCancelledHtml(input),
    text: buildSessionCancelledText(input),
    tags: [{ name: "category", value: "session_cancelled_student" }],
  });
}

export function resolveStudentFirstNameForEmail(
  sessionName: string | null | undefined,
  profile:
    | { first_name: string | null; last_name: string | null }
    | { first_name: string | null; last_name: string | null }[]
    | null
    | undefined,
): string {
  const row = Array.isArray(profile) ? (profile[0] ?? null) : profile;
  const fromProfile = row?.first_name?.trim();
  if (fromProfile) return fromProfile;

  const fromSession = sessionName?.trim().split(/\s+/)[0];
  if (fromSession) return fromSession;

  return "there";
}

export function resolveProviderName(
  person:
    | { first_name: string | null; last_name: string | null }
    | { first_name: string | null; last_name: string | null }[]
    | null
    | undefined,
  fallback: string,
): string {
  const row = Array.isArray(person) ? (person[0] ?? null) : person;
  if (!row) return fallback;

  const fullName = [row.first_name?.trim(), row.last_name?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || fallback;
}

export function resolveStudentEmailForSession(
  sessionEmail: string | null | undefined,
  profile:
    | { email: string | null }
    | { email: string | null }[]
    | null
    | undefined,
): string | null {
  const fromSession = sessionEmail?.trim();
  if (fromSession) return fromSession;

  const row = Array.isArray(profile) ? (profile[0] ?? null) : profile;
  const fromProfile = row?.email?.trim();
  return fromProfile || null;
}
