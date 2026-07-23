import "server-only";

import { wrapEmailHtml } from "@/lib/resend/email-layout";
import { sendResendEmail } from "@/lib/resend/send-email";

export type AmbassadorSpecificRequestFormData = {
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  schoolName: string;
  targetUniversity: string;
  requestedAmbassadorName: string;
  preferredMajor: string | null;
  additionalNotes: string | null;
};

export type SendAmbassadorSpecificRequestAdminEmailInput = {
  to: string | string[];
  form: AmbassadorSpecificRequestFormData;
  adminRequestUrl: string;
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

function formatStudentNotes(
  notes: string | null | undefined,
  preferredMajor: string | null | undefined,
): string {
  const parts: string[] = [];
  const major = preferredMajor?.trim();
  const noteText = notes?.trim();

  if (major) parts.push(`Preferred major: ${major}`);
  if (noteText) parts.push(noteText);

  return parts.join("\n\n") || "—";
}

function buildAmbassadorRequestAdminHtml(
  input: SendAmbassadorSpecificRequestAdminEmailInput,
): string {
  const form = input.form;
  const adminUrl = escapeHtml(input.adminRequestUrl);
  const studentName = escapeHtml(displayField(form.studentName));
  const studentEmail = escapeHtml(displayField(form.studentEmail));
  const schoolName = escapeHtml(displayField(form.schoolName));
  const targetUniversity = escapeHtml(displayField(form.targetUniversity));
  const requestedAmbassadorName = escapeHtml(
    displayField(form.requestedAmbassadorName),
  );
  const studentNotes = escapeHtml(
    formatStudentNotes(form.additionalNotes, form.preferredMajor),
  ).replace(/\n/g, "<br>");

  return wrapEmailHtml({
    bodyHtml: `<p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">New ambassador request from ${studentName}</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">Hi Team,</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4f44;">A new ambassador request has been submitted on Univeera.</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Student name:</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1a2e22;">${studentName}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Student email:</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1a2e22;">${studentEmail}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">School:</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1a2e22;">${schoolName}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Target university:</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1a2e22;">${targetUniversity}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Requested ambassador:</p>
          <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#1a2e22;">${requestedAmbassadorName}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Student notes:</p>
          <p style="margin:0 0 20px;padding:12px 16px;background:#faf9f4;border-radius:8px;font-size:14px;line-height:1.5;color:#3d4f44;">${studentNotes}</p>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#3d4f44;">Please review the request and confirm the best ambassador match using the link below:</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Admin review link:</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.5;"><a href="${adminUrl}" style="color:#2d6a4f;word-break:break-all;">${adminUrl}</a></p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#3d4f44;">This is a good opportunity to help the student feel more confident by connecting them with someone who can share real experience and practical guidance.</p>
          <a href="${adminUrl}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">Review request</a>`,
    footerHtml: `<p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:#3d4f44;">Warm regards,</p>
          <p style="margin:0;font-size:14px;line-height:1.5;color:#3d4f44;">Univeera Notifications</p>`,
  });
}

function buildAmbassadorRequestAdminText(
  input: SendAmbassadorSpecificRequestAdminEmailInput,
): string {
  const form = input.form;
  const studentNotes = formatStudentNotes(
    form.additionalNotes,
    form.preferredMajor,
  );

  return `New ambassador request from ${displayField(form.studentName, "A student")}

Hi Team,

A new ambassador request has been submitted on Univeera.

Student name: ${displayField(form.studentName)}
Student email: ${displayField(form.studentEmail)}
School: ${displayField(form.schoolName)}
Target university: ${displayField(form.targetUniversity)}
Requested ambassador: ${displayField(form.requestedAmbassadorName)}

Student notes:
${studentNotes}

Please review the request and confirm the best ambassador match using the link below:

Admin review link: ${input.adminRequestUrl}

This is a good opportunity to help the student feel more confident by connecting them with someone who can share real experience and practical guidance.

Warm regards,
Univeera Notifications
`;
}

export async function sendAmbassadorSpecificRequestAdminEmail(
  input: SendAmbassadorSpecificRequestAdminEmailInput,
) {
  const studentName = displayField(input.form.studentName, "A student");

  return sendResendEmail({
    to: input.to,
    subject: `New ambassador request from ${studentName}`,
    html: buildAmbassadorRequestAdminHtml(input),
    text: buildAmbassadorRequestAdminText(input),
    tags: [{ name: "category", value: "ambassador_specific_request_admin" }],
  });
}
