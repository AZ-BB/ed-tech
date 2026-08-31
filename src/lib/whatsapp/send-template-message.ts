import "server-only";

import {
  getWhatsAppAccessToken,
  getWhatsAppMessagesUrl,
  isWhatsAppConfigured,
} from "@/lib/whatsapp/config";

export type WhatsAppTemplateComponent = {
  type: "body" | "header" | "button";
  sub_type?: "quick_reply" | "url";
  index?: number;
  parameters: Array<
    | { type: "text"; text: string }
    | { type: "payload"; payload: string }
  >;
};

export type SendWhatsAppTemplateMessageInput = {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: WhatsAppTemplateComponent[];
};

export type SendWhatsAppTemplateMessageResult =
  | { ok: true; id: string }
  | { error: string };

export async function sendWhatsAppTemplateMessage(
  input: SendWhatsAppTemplateMessageInput,
): Promise<SendWhatsAppTemplateMessageResult> {
  if (!isWhatsAppConfigured()) {
    return {
      error:
        "WhatsApp is not configured. Set WHATSAPP_ENABLED, WHATSAPP_ACCESS_TOKEN, and WHATSAPP_PHONE_NUMBER_ID.",
    };
  }

  const url = getWhatsAppMessagesUrl();
  const token = getWhatsAppAccessToken();
  if (!url || !token) {
    return { error: "WhatsApp client is not available." };
  }

  const to = input.to.replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(to)) {
    return { error: "Invalid WhatsApp recipient phone number." };
  }

  const templateName = input.templateName.trim();
  if (!templateName) {
    return { error: "Template name is required." };
  }

  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: input.languageCode?.trim() || "en" },
      ...(input.components && input.components.length > 0
        ? { components: input.components }
        : {}),
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        messages?: Array<{ id?: string }>;
        error?: { message?: string; error_user_msg?: string };
      }
    | null;

  if (!response.ok) {
    const message =
      payload?.error?.error_user_msg ||
      payload?.error?.message ||
      `WhatsApp API request failed (${response.status}).`;
    console.error("[WhatsApp]", message, payload);
    return { error: message };
  }

  const messageId = payload?.messages?.[0]?.id?.trim();
  if (!messageId) {
    return { error: "WhatsApp send did not return a message id." };
  }

  return { ok: true, id: messageId };
}
