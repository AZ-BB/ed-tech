import {
  type CalendlyWebhookEnvelope,
  resolveAdvisorSessionIdFromWebhook,
  verifyCalendlyWebhookSignature,
} from "@/lib/calendly-webhook";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { NextResponse } from "next/server";

async function appendAdvisorSessionActivityLog(
  secret: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  studentId: string,
  advisorId: string,
  sessionId: number,
  message: string,
): Promise<void> {
  const { error } = await secret.from("acitivity_logs").insert({
    entitiy_type: "advisor",
    entity_id: advisorId,
    action: "advisor_session_calendly_booked",
    message,
    created_by_type: "student",
    student_id: studentId,
    admin_id: null,
    school_admin_id: null,
  });
  if (error) {
    console.error("[calendly webhook] activity log:", error);
  }
}

async function handleInviteeCreated(envelope: CalendlyWebhookEnvelope): Promise<void> {
  const sessionId = resolveAdvisorSessionIdFromWebhook(envelope);
  if (sessionId == null) {
    return;
  }

  const startTime = envelope.payload?.scheduled_event?.start_time?.trim();
  if (!startTime) {
    console.warn("[calendly webhook] invitee.created missing start_time for session", sessionId);
    return;
  }

  const bookedAt = new Date(startTime);
  if (Number.isNaN(bookedAt.getTime())) {
    console.warn("[calendly webhook] invalid start_time for session", sessionId, startTime);
    return;
  }

  const secret = await createSupabaseSecretClient();
  const { data: existing, error: fetchErr } = await secret
    .from("advisor_sessions")
    .select("id, advisor_id, student_id, status, booked_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (fetchErr) {
    console.error("[calendly webhook] fetch session:", fetchErr);
    throw new Error("Could not load advisor session.");
  }

  if (!existing) {
    console.warn("[calendly webhook] unknown advisor session id", sessionId);
    return;
  }

  if (existing.booked_at != null) {
    return;
  }

  if (existing.status === "cancelled") {
    console.warn("[calendly webhook] session cancelled, skipping", sessionId);
    return;
  }

  const { error: updateErr } = await secret
    .from("advisor_sessions")
    .update({
      booked_at: bookedAt.toISOString(),
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (updateErr) {
    console.error("[calendly webhook] update session:", updateErr);
    throw new Error("Could not update advisor session.");
  }

  await appendAdvisorSessionActivityLog(
    secret,
    existing.student_id,
    existing.advisor_id,
    sessionId,
    `Calendly booking confirmed for advisor session #${sessionId}.`,
  );
}

export async function POST(request: Request) {
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY?.trim();
  if (!signingKey) {
    console.error("[calendly webhook] CALENDLY_WEBHOOK_SIGNING_KEY is not set");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("calendly-webhook-signature");

  if (!verifyCalendlyWebhookSignature(rawBody, signatureHeader, signingKey)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let envelope: CalendlyWebhookEnvelope;
  try {
    envelope = JSON.parse(rawBody) as CalendlyWebhookEnvelope;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    if (envelope.event === "invitee.created") {
      await handleInviteeCreated(envelope);
    }
  } catch (err) {
    console.error("[calendly webhook] handler error:", err);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
