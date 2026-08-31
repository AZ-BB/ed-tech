import "server-only";

/** Meta Graph API version (pin intentionally; bump when upgrading). */
export function getWhatsAppApiVersion(): string {
  return process.env.WHATSAPP_API_VERSION?.trim() || "v22.0";
}

/** System user permanent access token (`WHATSAPP_ACCESS_TOKEN`). */
export function getWhatsAppAccessToken(): string | undefined {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  return token || undefined;
}

/** WhatsApp Business phone number ID (`WHATSAPP_PHONE_NUMBER_ID`). */
export function getWhatsAppPhoneNumberId(): string | undefined {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  return id || undefined;
}

/** Approved template name for day-before session reminders. */
export function getWhatsAppSessionReminderTemplateName(): string {
  return (
    process.env.WHATSAPP_TEMPLATE_SESSION_REMINDER?.trim() ||
    "session_day_before_reminder"
  );
}

/** Webhook verify token for Meta hub challenge (`WHATSAPP_WEBHOOK_VERIFY_TOKEN`). */
export function getWhatsAppWebhookVerifyToken(): string | undefined {
  const token = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();
  return token || undefined;
}

export function isWhatsAppEnabled(): boolean {
  const flag = process.env.WHATSAPP_ENABLED?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

export function isWhatsAppConfigured(): boolean {
  return (
    isWhatsAppEnabled() &&
    Boolean(getWhatsAppAccessToken() && getWhatsAppPhoneNumberId())
  );
}

export function getWhatsAppMessagesUrl(): string | undefined {
  const phoneNumberId = getWhatsAppPhoneNumberId();
  if (!phoneNumberId) return undefined;
  return `https://graph.facebook.com/${getWhatsAppApiVersion()}/${phoneNumberId}/messages`;
}
