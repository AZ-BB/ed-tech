import "server-only";

import { format, isValid, parseISO } from "date-fns";
import { wrapEmailHtml } from "@/lib/resend/email-layout";
import { sendResendEmail } from "@/lib/resend/send-email";

export type SendRecommendationRequestEmailInput = {
  to: string;
  teacherName: string;
  studentName: string;
  forApplication: string;
  personalNote: string | null;
  neededBy: string;
  submitUrl: string;
  teacherSubject?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatRecommendationDeadline(neededBy: string): string {
  const trimmed = neededBy.trim();
  if (!trimmed) return "—";
  const iso =
    /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T12:00:00` : trimmed;
  const parsed = parseISO(iso);
  if (isValid(parsed)) return format(parsed, "MMMM d, yyyy");
  return trimmed;
}

function buildRecommendationRequestHtml(
  input: SendRecommendationRequestEmailInput,
): string {
  const teacherName = escapeHtml(input.teacherName);
  const studentName = escapeHtml(input.studentName);
  const application = escapeHtml(input.forApplication);
  const deadline = escapeHtml(formatRecommendationDeadline(input.neededBy));
  const submitUrl = escapeHtml(input.submitUrl);
  const subjectLine = input.teacherSubject?.trim()
    ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">Subject: <strong>${escapeHtml(input.teacherSubject.trim())}</strong></p>`
    : "";

  const noteBlock = input.personalNote?.trim()
    ? `<p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Note from the student:</p>
          <p style="margin:0 0 20px;padding:12px 16px;background:#faf9f4;border-radius:8px;font-size:14px;line-height:1.5;color:#3d4f44;">${escapeHtml(input.personalNote.trim())}</p>`
    : `<p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#7a8a80;">No additional note was included.</p>`;

  return wrapEmailHtml({
    bodyHtml: `<p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">Recommendation letter request</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4f44;">Hi ${teacherName},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;"><strong>${studentName}</strong> has asked you to submit a recommendation letter through our secure upload link.</p>
          ${subjectLine}
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Application:</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1a2e22;">${application}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Deadline:</p>
          <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#1a2e22;">${deadline}</p>
          ${noteBlock}
          <a href="${submitUrl}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">Upload recommendation letter</a>`,
    footerHtml: `<p style="margin:0;font-size:12px;line-height:1.5;color:#7a8a80;">This link is private. Do not share it publicly. If the button doesn't work, copy this URL into your browser:<br><a href="${submitUrl}" style="color:#2d6a4f;word-break:break-all;">${submitUrl}</a></p>`,
  });
}

function buildRecommendationRequestText(
  input: SendRecommendationRequestEmailInput,
): string {
  const deadline = formatRecommendationDeadline(input.neededBy);
  const subjectLine = input.teacherSubject?.trim()
    ? `Subject: ${input.teacherSubject.trim()}\n\n`
    : "";
  const noteBlock = input.personalNote?.trim()
    ? `Note from the student:\n${input.personalNote.trim()}\n\n`
    : "No additional note was included.\n\n";

  return `Recommendation letter request

Hi ${input.teacherName},

${input.studentName} has asked you to submit a recommendation letter through our secure upload link.

${subjectLine}Application:
${input.forApplication}

Deadline:
${deadline}

${noteBlock}Upload recommendation letter: ${input.submitUrl}

This link is private. Do not share it publicly.
`;
}

export async function sendRecommendationRequestEmail(
  input: SendRecommendationRequestEmailInput,
) {
  return sendResendEmail({
    to: input.to,
    subject: `Recommendation request from ${input.studentName}`,
    html: buildRecommendationRequestHtml(input),
    text: buildRecommendationRequestText(input),
    tags: [{ name: "category", value: "recommendation_request" }],
  });
}
