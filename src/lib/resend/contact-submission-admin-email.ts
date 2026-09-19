import "server-only";

import { wrapEmailHtml } from "@/lib/resend/email-layout";
import { sendResendEmail } from "@/lib/resend/send-email";

export const CONTACT_ADMIN_EMAIL = "admin@univeera.me";

export type SendContactSubmissionAdminEmailInput = {
  to?: string | string[];
  name: string;
  email: string;
  subject: string | null;
  message: string;
  submissionId: string;
  submittedAtIso: string;
  adminSubmissionsUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displayField(value: string | null | undefined, fallback = "—"): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function formatSubmittedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

function buildEmailSubject(name: string, subject: string | null): string {
  const base = `New contact message from ${name.trim() || "A visitor"}`;
  const subjectTrimmed = subject?.trim();
  return subjectTrimmed ? `${base} — ${subjectTrimmed}` : base;
}

function buildContactSubmissionAdminHtml(
  input: SendContactSubmissionAdminEmailInput,
): string {
  const name = escapeHtml(displayField(input.name));
  const email = escapeHtml(displayField(input.email));
  const subject = escapeHtml(displayField(input.subject));
  const messageHtml = escapeHtml(displayField(input.message)).replace(
    /\n/g,
    "<br>",
  );
  const submissionId = escapeHtml(input.submissionId);
  const submittedAt = escapeHtml(formatSubmittedAt(input.submittedAtIso));
  const adminUrl = escapeHtml(input.adminSubmissionsUrl);

  return wrapEmailHtml({
    bodyHtml: `<p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">New contact form submission</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">Someone submitted the public contact form on Univeera.</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Name:</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1a2e22;">${name}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Email:</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1a2e22;"><a href="mailto:${email}" style="color:#2d6a4f;">${email}</a></p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Subject:</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1a2e22;">${subject}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Message:</p>
          <p style="margin:0 0 20px;padding:12px 16px;background:#faf9f4;border-radius:8px;font-size:14px;line-height:1.5;color:#3d4f44;">${messageHtml}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Submission ID:</p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#3d4f44;font-family:ui-monospace,monospace;">${submissionId}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Submitted at (UTC):</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#3d4f44;">${submittedAt}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Admin inbox:</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.5;"><a href="${adminUrl}" style="color:#2d6a4f;word-break:break-all;">${adminUrl}</a></p>
          <a href="${adminUrl}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">View submissions</a>`,
    footerHtml: `<p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:#3d4f44;">Warm regards,</p>
          <p style="margin:0;font-size:14px;line-height:1.5;color:#3d4f44;">Univeera Notifications</p>`,
  });
}

function buildContactSubmissionAdminText(
  input: SendContactSubmissionAdminEmailInput,
): string {
  return `New contact form submission

Someone submitted the public contact form on Univeera.

Name: ${displayField(input.name)}
Email: ${displayField(input.email)}
Subject: ${displayField(input.subject)}

Message:
${displayField(input.message)}

Submission ID: ${input.submissionId}
Submitted at (UTC): ${formatSubmittedAt(input.submittedAtIso)}

Admin inbox: ${input.adminSubmissionsUrl}

Warm regards,
Univeera Notifications
`;
}

export async function sendContactSubmissionAdminEmail(
  input: SendContactSubmissionAdminEmailInput,
) {
  const to = input.to ?? CONTACT_ADMIN_EMAIL;
  const replyTo = input.email.trim();

  return sendResendEmail({
    to,
    subject: buildEmailSubject(input.name, input.subject),
    html: buildContactSubmissionAdminHtml(input),
    text: buildContactSubmissionAdminText(input),
    replyTo: replyTo || undefined,
    tags: [{ name: "category", value: "contact_submission_admin" }],
  });
}
