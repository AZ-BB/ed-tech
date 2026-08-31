import { getWhatsAppWebhookVerifyToken } from "@/lib/whatsapp/config";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type WhatsAppWebhookBody = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: string;
        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };
        statuses?: Array<{
          id?: string;
          status?: string;
          timestamp?: string;
          recipient_id?: string;
          errors?: Array<{ code?: number; title?: string; message?: string }>;
        }>;
        messages?: unknown[];
      };
    }>;
  }>;
};

export async function GET(request: Request) {
  const verifyToken = getWhatsAppWebhookVerifyToken();
  if (!verifyToken) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden." }, { status: 403 });
}

export async function POST(request: Request) {
  let body: WhatsAppWebhookBody;
  try {
    body = (await request.json()) as WhatsAppWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (body.object !== "whatsapp_business_account") {
    return NextResponse.json({ received: true });
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      for (const status of value.statuses ?? []) {
        if (status.status === "failed") {
          console.error("[WhatsApp webhook] message delivery failed", {
            messageId: status.id ?? null,
            recipientId: status.recipient_id ?? null,
            errors: status.errors ?? [],
          });
        } else {
          console.info("[WhatsApp webhook] message status", {
            messageId: status.id ?? null,
            status: status.status ?? null,
            recipientId: status.recipient_id ?? null,
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
