import "server-only";

import type { Json } from "@/database.types";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { sendResendEmail } from "@/lib/resend/send-email";

export type AmbassadorProfileForStudentEmail = {
  firstName: string;
  lastName: string;
  university: string;
  major: string | null;
  destinationLabel: string;
  about: string | null;
  helps: string[];
};

export type ExternalAmbassadorProfileForStudentEmail = {
  fullName: string;
  email: string | null;
  linkedin: string | null;
  overview: string;
};

export type SendAmbassadorSpecificRequestStudentEmailInput = {
  to: string;
  studentName: string;
  targetUniversity: string;
  preferredMajor: string | null;
  additionalNotes: string | null;
} & (
  | {
      kind: "catalog";
      ambassador: AmbassadorProfileForStudentEmail;
      catalogUrl: string;
    }
  | {
      kind: "external";
      ambassador: ExternalAmbassadorProfileForStudentEmail;
    }
);

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

export function jsonToStringList(value: Json | null): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === "string");
  }
  if (typeof value === "object" && value !== null && "items" in value) {
    const items = (value as { items: unknown }).items;
    if (Array.isArray(items)) {
      return items.filter((x): x is string => typeof x === "string");
    }
  }
  return [];
}

function buildCatalogAmbassadorProfileHtml(
  ambassador: AmbassadorProfileForStudentEmail,
): string {
  const ambassadorName = escapeHtml(
    `${ambassador.firstName} ${ambassador.lastName}`.trim(),
  );
  const helps =
    ambassador.helps.length > 0
      ? ambassador.helps
      : ["Campus life and culture", "Application experience", "Scholarships and housing"];

  const helpsHtml = helps
    .slice(0, 6)
    .map(
      (item) =>
        `<li style="margin:0 0 6px;font-size:13px;line-height:1.4;color:#3d4f44;">${escapeHtml(item)}</li>`,
    )
    .join("");

  return `<div style="margin:0 0 20px;padding:16px;background:#f0f7f2;border-radius:8px;">
            <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#2d6a4f;">${ambassadorName}</p>
            <p style="margin:0 0 6px;font-size:14px;color:#3d4f44;"><strong>University:</strong> ${escapeHtml(ambassador.university)}</p>
            <p style="margin:0 0 6px;font-size:14px;color:#3d4f44;"><strong>Major:</strong> ${escapeHtml(displayField(ambassador.major))}</p>
            <p style="margin:0 0 12px;font-size:14px;color:#3d4f44;"><strong>Destination:</strong> ${escapeHtml(ambassador.destinationLabel)}</p>
            ${ambassador.about ? `<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#3d4f44;">${escapeHtml(ambassador.about)}</p>` : ""}
            <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#3d4f44;">Can help with</p>
            <ul style="margin:0;padding-left:18px;">${helpsHtml}</ul>
          </div>`;
}

function buildExternalAmbassadorProfileHtml(
  ambassador: ExternalAmbassadorProfileForStudentEmail,
): string {
  const ambassadorName = escapeHtml(ambassador.fullName);
  const emailBlock = ambassador.email
    ? `<p style="margin:0 0 6px;font-size:14px;color:#3d4f44;"><strong>Email:</strong> <a href="mailto:${escapeHtml(ambassador.email)}" style="color:#2d6a4f;">${escapeHtml(ambassador.email)}</a></p>`
    : "";
  const linkedinBlock = ambassador.linkedin
    ? `<p style="margin:0 0 12px;font-size:14px;color:#3d4f44;"><strong>LinkedIn:</strong> <a href="${escapeHtml(ambassador.linkedin)}" style="color:#2d6a4f;word-break:break-all;">${escapeHtml(ambassador.linkedin)}</a></p>`
    : "";

  return `<div style="margin:0 0 20px;padding:16px;background:#f0f7f2;border-radius:8px;">
            <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#2d6a4f;">${ambassadorName}</p>
            ${emailBlock}
            ${linkedinBlock}
            <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#3d4f44;">Overview</p>
            <p style="margin:0;font-size:13px;line-height:1.5;color:#3d4f44;">${escapeHtml(ambassador.overview)}</p>
          </div>`;
}

function buildStudentConfirmationHtml(
  input: SendAmbassadorSpecificRequestStudentEmailInput,
): string {
  const studentName = escapeHtml(input.studentName);
  const ambassadorName =
    input.kind === "catalog"
      ? escapeHtml(
          `${input.ambassador.firstName} ${input.ambassador.lastName}`.trim(),
        )
      : escapeHtml(input.ambassador.fullName);

  const profileBlock =
    input.kind === "catalog"
      ? buildCatalogAmbassadorProfileHtml(input.ambassador)
      : buildExternalAmbassadorProfileHtml(input.ambassador);

  const catalogButtonBlock =
    input.kind === "catalog"
      ? `<a href="${escapeHtml(input.catalogUrl)}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">View ambassador profile</a>`
      : "";

  const catalogFooterBlock =
    input.kind === "catalog"
      ? `<tr><td style="padding:16px 28px 28px;border-top:1px solid #eee9dc;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#7a8a80;">If the button doesn't work, copy this link into your browser:<br><a href="${escapeHtml(input.catalogUrl)}" style="color:#2d6a4f;word-break:break-all;">${escapeHtml(input.catalogUrl)}</a></p>
        </td></tr>`
      : `<tr><td style="padding:16px 28px 28px;border-top:1px solid #eee9dc;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#7a8a80;">Reply to this email or contact your counselor if you need help reaching your ambassador.</p>
        </td></tr>`;

  const notesBlock = input.additionalNotes?.trim()
    ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#3d4f44;"><strong>Your notes:</strong> ${escapeHtml(input.additionalNotes.trim())}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f3ee;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3ee;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e2d8;overflow:hidden;">
        <tr><td style="padding:28px 28px 8px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">We found an ambassador for you</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4f44;">Hi ${studentName}, your ambassador request has been reviewed and we matched you with <strong>${ambassadorName}</strong>.</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">You asked about:</p>
          <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#1a2e22;">${escapeHtml(input.targetUniversity)}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Preferred major / area:</p>
          <p style="margin:0 0 16px;font-size:15px;color:#1a2e22;">${escapeHtml(displayField(input.preferredMajor))}</p>
          ${notesBlock}
          ${profileBlock}
          ${catalogButtonBlock}
        </td></tr>
        ${catalogFooterBlock}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildStudentConfirmationText(
  input: SendAmbassadorSpecificRequestStudentEmailInput,
): string {
  const notesLine = input.additionalNotes?.trim()
    ? `Your notes: ${input.additionalNotes.trim()}\n\n`
    : "";

  if (input.kind === "external") {
    const { ambassador } = input;
    return `We found an ambassador for you

Hi ${input.studentName}, your ambassador request has been reviewed and we matched you with ${ambassador.fullName}.

You asked about: ${input.targetUniversity}
Preferred major / area: ${displayField(input.preferredMajor)}
${notesLine}${ambassador.fullName}
${ambassador.email ? `Email: ${ambassador.email}\n` : ""}${ambassador.linkedin ? `LinkedIn: ${ambassador.linkedin}\n` : ""}
Overview:
${ambassador.overview}
`;
  }

  const ambassadorName =
    `${input.ambassador.firstName} ${input.ambassador.lastName}`.trim();
  const helps =
    input.ambassador.helps.length > 0
      ? input.ambassador.helps.join(", ")
      : "Campus life, applications, scholarships";

  return `We found an ambassador for you

Hi ${input.studentName}, your ambassador request has been reviewed and we matched you with ${ambassadorName}.

You asked about: ${input.targetUniversity}
Preferred major / area: ${displayField(input.preferredMajor)}
${notesLine}${ambassadorName}
University: ${input.ambassador.university}
Major: ${displayField(input.ambassador.major)}
Destination: ${input.ambassador.destinationLabel}
${input.ambassador.about ? `${input.ambassador.about}\n\n` : ""}Can help with: ${helps}

View ambassador profile: ${input.catalogUrl}
`;
}

function ambassadorEmailSubject(
  input: SendAmbassadorSpecificRequestStudentEmailInput,
): string {
  const name =
    input.kind === "catalog"
      ? `${input.ambassador.firstName} ${input.ambassador.lastName}`.trim()
      : input.ambassador.fullName.trim();
  return `Your ambassador match: ${name}`;
}

export async function sendAmbassadorSpecificRequestStudentEmail(
  input: SendAmbassadorSpecificRequestStudentEmailInput,
) {
  return sendResendEmail({
    to: input.to,
    subject: ambassadorEmailSubject(input),
    html: buildStudentConfirmationHtml(input),
    text: buildStudentConfirmationText(input),
    tags: [{ name: "category", value: "ambassador_specific_request_student" }],
  });
}

export function mapAmbassadorRowForStudentEmail(row: {
  first_name: string;
  last_name: string;
  major: string | null;
  university_name: string | null;
  destination_country_code: string;
  about: string | null;
  help_in: Json | null;
  universities: { name: string } | { name: string }[] | null;
}): AmbassadorProfileForStudentEmail {
  const uniEmbed = Array.isArray(row.universities)
    ? (row.universities[0] ?? null)
    : row.universities;
  const university =
    uniEmbed?.name?.trim() || row.university_name?.trim() || "University TBD";

  return {
    firstName: row.first_name?.trim() ?? "",
    lastName: row.last_name?.trim() ?? "",
    university,
    major: row.major?.trim() || null,
    destinationLabel:
      getCountryNameByAlpha2(row.destination_country_code) ??
      row.destination_country_code ??
      "—",
    about: row.about?.trim() || null,
    helps: jsonToStringList(row.help_in),
  };
}
