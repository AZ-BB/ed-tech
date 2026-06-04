import "server-only";

import { sendResendEmail } from "@/lib/resend/send-email";

export type AmbassadorSpecificRequestFormData = {
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  targetUniversity: string;
  preferredMajor: string | null;
  additionalNotes: string | null;
};

export type SendAmbassadorSpecificRequestAdminEmailInput = {
  to: string | string[];
  requestId: number;
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

function buildAmbassadorRequestAdminHtml(
  input: SendAmbassadorSpecificRequestAdminEmailInput,
): string {
  const form = input.form;
  const adminUrl = escapeHtml(input.adminRequestUrl);
  const rows = [
    ["Student name", displayField(form.studentName)],
    ["Student email", displayField(form.studentEmail)],
    ["Phone", displayField(form.studentPhone)],
    ["Target university / ambassador", displayField(form.targetUniversity)],
    ["Preferred major", displayField(form.preferredMajor)],
    ["Additional notes", displayField(form.additionalNotes)],
  ];

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:10px 12px;font-size:13px;color:#5c6b62;border-bottom:1px solid #eee9dc;vertical-align:top;width:40%;">${escapeHtml(label)}</td>
          <td style="padding:10px 12px;font-size:14px;color:#1a2e22;border-bottom:1px solid #eee9dc;vertical-align:top;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f3ee;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3ee;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e2d8;overflow:hidden;">
        <tr><td style="padding:28px 28px 8px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">New ambassador request</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4f44;">A student submitted a specific ambassador request (request #${input.requestId}).</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #eee9dc;border-radius:8px;overflow:hidden;">
            ${tableRows}
          </table>
          <a href="${adminUrl}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">View request in admin</a>
        </td></tr>
        <tr><td style="padding:16px 28px 28px;border-top:1px solid #eee9dc;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#7a8a80;">If the button doesn't work, copy this link into your browser:<br><a href="${adminUrl}" style="color:#2d6a4f;word-break:break-all;">${adminUrl}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildAmbassadorRequestAdminText(
  input: SendAmbassadorSpecificRequestAdminEmailInput,
): string {
  const form = input.form;

  return `New ambassador request (#${input.requestId})

A student submitted a specific ambassador request.

Student name: ${displayField(form.studentName)}
Student email: ${displayField(form.studentEmail)}
Phone: ${displayField(form.studentPhone)}
Target university / ambassador: ${displayField(form.targetUniversity)}
Preferred major: ${displayField(form.preferredMajor)}
Additional notes: ${displayField(form.additionalNotes)}

View request in admin: ${input.adminRequestUrl}
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
