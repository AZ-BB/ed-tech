import "server-only";

import { wrapEmailHtml } from "@/lib/resend/email-layout";
import { sendResendEmail } from "@/lib/resend/send-email";

export type SendStudentDocumentReminderEmailInput = {
  to: string;
  studentName: string;
  documentName: string;
  uploadUrl: string;
  requestedByName: string;
  requestedByRole: "school" | "admin" | "advisor";
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function requesterLabel(role: SendStudentDocumentReminderEmailInput["requestedByRole"]): string {
  if (role === "school") return "Your school";
  if (role === "advisor") return "Your application advisor";
  return "The Univeera team";
}

function buildStudentDocumentReminderHtml(
  input: SendStudentDocumentReminderEmailInput,
): string {
  const studentName = escapeHtml(input.studentName);
  const documentName = escapeHtml(input.documentName);
  const uploadUrl = escapeHtml(input.uploadUrl);
  const requester = escapeHtml(requesterLabel(input.requestedByRole));
  const requestedBy = escapeHtml(input.requestedByName.trim() || requesterLabel(input.requestedByRole));

  return wrapEmailHtml({
    bodyHtml: `<p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">Document upload requested</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4f44;">Hi ${studentName},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">${requester} (${requestedBy}) has requested that you upload the following document for your university application checklist:</p>
          <p style="margin:0 0 20px;padding:12px 16px;background:#faf9f4;border-radius:8px;font-size:16px;font-weight:600;line-height:1.4;color:#1a2e22;">${documentName}</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#5c6b62;">Please sign in to My Applications and upload this file when you are ready.</p>
          <a href="${uploadUrl}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">Upload document</a>`,
    footerHtml: `<p style="margin:0;font-size:12px;line-height:1.5;color:#7a8a80;">If the button doesn't work, copy this URL into your browser:<br><a href="${uploadUrl}" style="color:#2d6a4f;word-break:break-all;">${uploadUrl}</a></p>`,
  });
}

function buildStudentDocumentReminderText(
  input: SendStudentDocumentReminderEmailInput,
): string {
  const requester = requesterLabel(input.requestedByRole);
  const requestedBy = input.requestedByName.trim() || requester;

  return `Document upload requested

Hi ${input.studentName},

${requester} (${requestedBy}) has requested that you upload the following document for your university application checklist:

${input.documentName}

Please sign in to My Applications and upload this file when you are ready.

Upload document: ${input.uploadUrl}
`;
}

export async function sendStudentDocumentReminderEmail(
  input: SendStudentDocumentReminderEmailInput,
) {
  return sendResendEmail({
    to: input.to,
    subject: `Please upload: ${input.documentName}`,
    html: buildStudentDocumentReminderHtml(input),
    text: buildStudentDocumentReminderText(input),
    tags: [{ name: "category", value: "student_document_reminder" }],
  });
}
