import "server-only";

import type { Json } from "@/database.types";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { wrapEmailHtml } from "@/lib/resend/email-layout";
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
  studentFirstName: string;
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

export function resolveStudentFirstNameFromRequestName(
  studentName: string | null | undefined,
): string {
  const fromName = studentName?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  return "there";
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

function resolveAmbassadorName(
  input: SendAmbassadorSpecificRequestStudentEmailInput,
): string {
  if (input.kind === "catalog") {
    return `${input.ambassador.firstName} ${input.ambassador.lastName}`.trim();
  }
  return input.ambassador.fullName.trim();
}

function resolveAmbassadorUniversity(
  input: SendAmbassadorSpecificRequestStudentEmailInput,
): string {
  if (input.kind === "catalog") {
    return input.ambassador.university;
  }
  return "—";
}

function resolveAmbassadorMajor(
  input: SendAmbassadorSpecificRequestStudentEmailInput,
): string {
  if (input.kind === "catalog") {
    return displayField(input.ambassador.major);
  }
  return "—";
}

function resolveProfileLink(
  input: SendAmbassadorSpecificRequestStudentEmailInput,
): string | null {
  if (input.kind === "catalog") {
    return input.catalogUrl;
  }

  const linkedin = input.ambassador.linkedin?.trim();
  if (linkedin) return linkedin;

  const email = input.ambassador.email?.trim();
  if (email) return `mailto:${email}`;

  return null;
}

function buildStudentConfirmationHtml(
  input: SendAmbassadorSpecificRequestStudentEmailInput,
): string {
  const studentFirstName = escapeHtml(input.studentFirstName);
  const ambassadorName = escapeHtml(resolveAmbassadorName(input));
  const ambassadorUniversity = escapeHtml(resolveAmbassadorUniversity(input));
  const ambassadorMajor = escapeHtml(resolveAmbassadorMajor(input));
  const profileLink = resolveProfileLink(input);
  const profileLinkHtml = profileLink
    ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.5;"><a href="${escapeHtml(profileLink)}" style="color:#2d6a4f;word-break:break-all;">${escapeHtml(profileLink)}</a></p>`
    : `<p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#3d4f44;">Reply to this email and our team will help you connect with your ambassador.</p>`;
  const profileButton =
    profileLink
      ? `<a href="${escapeHtml(profileLink)}" style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">View ambassador profile</a>`
      : "";

  return wrapEmailHtml({
    bodyHtml: `<p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2d6a4f;">Univeera</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2e22;">Your ambassador match: ${ambassadorName}</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3d4f44;">Hi ${studentFirstName},</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4f44;">Good news. We have confirmed your ambassador match.</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">You have been matched with:</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1a2e22;">${ambassadorName}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">University:</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1a2e22;">${ambassadorUniversity}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Major:</p>
          <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#1a2e22;">${ambassadorMajor}</p>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#3d4f44;">You can view the ambassador profile here:</p>
          <p style="margin:0 0 8px;font-size:14px;color:#5c6b62;">Profile link:</p>
          ${profileLinkHtml}
          <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#3d4f44;">Your ambassador can help you better understand the student experience, university life, and what it may feel like to study at your target university. We hope this makes the journey feel clearer and less overwhelming.</p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#3d4f44;">Please confirm attendance by replying to the email.</p>
          ${profileButton}`,
    footerHtml: `<p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:#3d4f44;">Warm regards,</p>
          <p style="margin:0;font-size:14px;line-height:1.5;color:#3d4f44;">The Univeera Team</p>`,
  });
}

function buildStudentConfirmationText(
  input: SendAmbassadorSpecificRequestStudentEmailInput,
): string {
  const ambassadorName = resolveAmbassadorName(input);
  const profileLink = resolveProfileLink(input);
  const profileLinkLine = profileLink
    ? `Profile link: ${profileLink}`
    : "Profile link: Reply to this email and our team will help you connect with your ambassador.";

  return `Your ambassador match: ${ambassadorName}

Hi ${input.studentFirstName},

Good news. We have confirmed your ambassador match.

You have been matched with: ${ambassadorName}
University: ${resolveAmbassadorUniversity(input)}
Major: ${resolveAmbassadorMajor(input)}

You can view the ambassador profile here:

${profileLinkLine}

Your ambassador can help you better understand the student experience, university life, and what it may feel like to study at your target university. We hope this makes the journey feel clearer and less overwhelming.

Please confirm attendance by replying to the email.

Warm regards,
The Univeera Team
`;
}

function ambassadorEmailSubject(
  input: SendAmbassadorSpecificRequestStudentEmailInput,
): string {
  return `Your ambassador match: ${resolveAmbassadorName(input)}`;
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
