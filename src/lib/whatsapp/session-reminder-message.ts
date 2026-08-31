import "server-only";

import { formatBookedSessionDateTime } from "@/lib/resend/session-booked-student-email";
import {
  getWhatsAppSessionReminderTemplateName,
  isWhatsAppConfigured,
} from "@/lib/whatsapp/config";
import { normalizePhoneForWhatsApp } from "@/lib/whatsapp/normalize-phone";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp/send-template-message";

export type SessionReminderKind = "advisor" | "post_admission";

export type SendSessionReminderWhatsAppInput = {
  toPhone: string;
  studentFirstName: string;
  sessionKind: SessionReminderKind;
  providerName: string;
  sessionDateTime: string;
  timezone?: string | null;
  meetingLinkOrDashboardUrl: string;
};

export type SendSessionReminderWhatsAppResult =
  | { ok: true; id: string }
  | { error: string };

function sessionKindLabel(kind: SessionReminderKind): string {
  return kind === "advisor" ? "advisor session" : "post-admission support session";
}

function truncateTemplateParam(value: string, maxLength = 1024): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

export function resolveStudentPhoneForSession(
  sessionPhone: string | null | undefined,
  profilePhone: string | null | undefined,
): string | null {
  return (
    normalizePhoneForWhatsApp(sessionPhone) ??
    normalizePhoneForWhatsApp(profilePhone)
  );
}

export async function sendSessionReminderWhatsApp(
  input: SendSessionReminderWhatsAppInput,
): Promise<SendSessionReminderWhatsAppResult> {
  if (!isWhatsAppConfigured()) {
    return {
      error:
        "WhatsApp is not configured. Set WHATSAPP_ENABLED, WHATSAPP_ACCESS_TOKEN, and WHATSAPP_PHONE_NUMBER_ID.",
    };
  }

  const to = normalizePhoneForWhatsApp(input.toPhone);
  if (!to) {
    return { error: "Invalid recipient phone number." };
  }

  const formattedDateTime = formatBookedSessionDateTime(
    input.sessionDateTime,
    input.timezone,
  );

  return sendWhatsAppTemplateMessage({
    to,
    templateName: getWhatsAppSessionReminderTemplateName(),
    languageCode: "en",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: truncateTemplateParam(input.studentFirstName || "there") },
          { type: "text", text: truncateTemplateParam(sessionKindLabel(input.sessionKind)) },
          { type: "text", text: truncateTemplateParam(input.providerName) },
          { type: "text", text: truncateTemplateParam(formattedDateTime) },
          {
            type: "text",
            text: truncateTemplateParam(input.meetingLinkOrDashboardUrl),
          },
        ],
      },
    ],
  });
}
