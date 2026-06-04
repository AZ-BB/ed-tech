import "server-only";

import type { CreateEmailOptions } from "resend";
import { getResendFromEmail, isResendConfigured } from "@/lib/resend/config";
import { getResendClient } from "@/lib/resend/client";

export type SendResendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Overrides `RESEND_FROM_EMAIL` when set. */
  from?: string;
  replyTo?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  tags?: CreateEmailOptions["tags"];
};

export type SendResendEmailResult =
  | { ok: true; id: string }
  | { error: string };

function normalizeRecipients(value: string | string[]): string[] {
  const list = Array.isArray(value) ? value : [value];
  return list.map((entry) => entry.trim()).filter(Boolean);
}

/**
 * Sends a transactional email via Resend.
 * Returns a configuration error when `RESEND_API_KEY` or the from address is missing.
 */
export async function sendResendEmail(
  input: SendResendEmailInput,
): Promise<SendResendEmailResult> {
  if (!isResendConfigured()) {
    return {
      error:
        "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    };
  }

  const client = getResendClient();
  if (!client) {
    return { error: "Resend client is not available." };
  }

  const to = normalizeRecipients(input.to);
  if (to.length === 0) {
    return { error: "At least one recipient is required." };
  }

  const from = (input.from ?? getResendFromEmail())?.trim();
  if (!from) {
    return { error: "Sender address is not configured." };
  }

  const { data, error } = await client.emails.send({
    from,
    to,
    subject: input.subject.trim(),
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
    cc: input.cc,
    bcc: input.bcc,
    tags: input.tags,
  });

  if (error) {
    console.error("[Resend]", error);
    return { error: error.message || "Failed to send email." };
  }

  if (!data?.id) {
    return { error: "Email send did not return an id." };
  }

  return { ok: true, id: data.id };
}
