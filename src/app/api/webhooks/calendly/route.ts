import {
  type CalendlyWebhookEnvelope,
  resolveAdvisorSessionIdFromWebhook,
  resolveApplicationIdFromWebhook,
  resolvePostAdmissionCaseIdFromWebhook,
  verifyCalendlyWebhookSignature,
} from "@/lib/calendly-webhook";
import { logCalendly, logCalendlyError, logCalendlyWarn } from "@/lib/calendly-log";
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
    logCalendlyError("webhook", "Failed to write activity log", error, {
      sessionId,
      advisorId,
      studentId,
    });
  }
}

async function handleInviteeCreated(envelope: CalendlyWebhookEnvelope): Promise<void> {
  const sessionId = resolveAdvisorSessionIdFromWebhook(envelope);
  if (sessionId != null) {
    await handleAdvisorSessionInviteeCreated(envelope, sessionId);
    return;
  }

  const applicationId = resolveApplicationIdFromWebhook(envelope);
  if (applicationId != null) {
    await handleApplicationInviteeCreated(envelope, applicationId);
    return;
  }

  const postAdmissionCaseId = resolvePostAdmissionCaseIdFromWebhook(envelope);
  if (postAdmissionCaseId != null) {
    await handlePostAdmissionInviteeCreated(envelope, postAdmissionCaseId);
    return;
  }

  logCalendly("webhook", "invitee.created ignored — no linked session, application, or post-admission case", {
    utmContent: envelope.payload?.tracking?.utm_content ?? null,
  });
}

async function handleAdvisorSessionInviteeCreated(
  envelope: CalendlyWebhookEnvelope,
  sessionId: number,
): Promise<void> {
  logCalendly("webhook", "Processing invitee.created for advisor session", {
    sessionId,
    inviteeUri: envelope.payload?.uri ?? null,
    eventUri: envelope.payload?.scheduled_event?.uri ?? null,
  });

  const startTime = envelope.payload?.scheduled_event?.start_time?.trim();
  if (!startTime) {
    logCalendlyWarn("webhook", "invitee.created missing start_time", { sessionId });
    return;
  }

  const bookedAt = new Date(startTime);
  if (Number.isNaN(bookedAt.getTime())) {
    logCalendlyWarn("webhook", "invitee.created has invalid start_time", { sessionId, startTime });
    return;
  }

  const secret = await createSupabaseSecretClient();
  const { data: existing, error: fetchErr } = await secret
    .from("advisor_sessions")
    .select("id, advisor_id, student_id, status, booked_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (fetchErr) {
    logCalendlyError("webhook", "Failed to fetch advisor session", fetchErr, { sessionId });
    throw new Error("Could not load advisor session.");
  }

  if (!existing) {
    logCalendlyWarn("webhook", "Unknown advisor session id", { sessionId });
    return;
  }

  if (existing.booked_at != null) {
    logCalendly("webhook", "Session already booked — skipping", {
      sessionId,
      bookedAt: existing.booked_at,
    });
    return;
  }

  if (existing.status === "cancelled") {
    logCalendlyWarn("webhook", "Session cancelled — skipping booking update", {
      sessionId,
      status: existing.status,
    });
    return;
  }

  const { error: updateErr } = await secret
    .from("advisor_sessions")
    .update({
      booked_at: bookedAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (updateErr) {
    logCalendlyError("webhook", "Failed to update advisor session", updateErr, { sessionId });
    throw new Error("Could not update advisor session.");
  }

  logCalendly("webhook", "Advisor session booked_at recorded (status unchanged)", {
    sessionId,
    advisorId: existing.advisor_id,
    studentId: existing.student_id,
    bookedAt: bookedAt.toISOString(),
    status: existing.status,
  });

  await appendAdvisorSessionActivityLog(
    secret,
    existing.student_id,
    existing.advisor_id,
    sessionId,
    `Calendly slot booked for advisor session #${sessionId}.`,
  );
}

async function handleApplicationInviteeCreated(
  envelope: CalendlyWebhookEnvelope,
  applicationId: number,
): Promise<void> {
  logCalendly("webhook", "Processing invitee.created for application", {
    applicationId,
    inviteeUri: envelope.payload?.uri ?? null,
    eventUri: envelope.payload?.scheduled_event?.uri ?? null,
  });

  const startTime = envelope.payload?.scheduled_event?.start_time?.trim();
  if (!startTime) {
    logCalendlyWarn("webhook", "invitee.created missing start_time", { applicationId });
    return;
  }

  const scheduledAt = new Date(startTime);
  if (Number.isNaN(scheduledAt.getTime())) {
    logCalendlyWarn("webhook", "invitee.created has invalid start_time", {
      applicationId,
      startTime,
    });
    return;
  }

  const secret = await createSupabaseSecretClient();
  const { data: existing, error: fetchErr } = await secret
    .from("applications")
    .select("id, student_id, status, scheduled_at")
    .eq("id", applicationId)
    .maybeSingle();

  if (fetchErr) {
    logCalendlyError("webhook", "Failed to fetch application", fetchErr, { applicationId });
    throw new Error("Could not load application.");
  }

  if (!existing) {
    logCalendlyWarn("webhook", "Unknown application id", { applicationId });
    return;
  }

  if (existing.scheduled_at != null) {
    logCalendly("webhook", "Application already scheduled — skipping", {
      applicationId,
      scheduledAt: existing.scheduled_at,
    });
    return;
  }

  const { error: updateErr } = await secret
    .from("applications")
    .update({
      scheduled_at: scheduledAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (updateErr) {
    logCalendlyError("webhook", "Failed to update application scheduled_at", updateErr, {
      applicationId,
    });
    throw new Error("Could not update application.");
  }

  logCalendly("webhook", "Application scheduled_at recorded", {
    applicationId,
    studentId: existing.student_id,
    scheduledAt: scheduledAt.toISOString(),
    status: existing.status,
  });
}

async function handlePostAdmissionInviteeCreated(
  envelope: CalendlyWebhookEnvelope,
  caseId: number,
): Promise<void> {
  logCalendly("webhook", "Processing invitee.created for post-admission case", {
    caseId,
    inviteeUri: envelope.payload?.uri ?? null,
    eventUri: envelope.payload?.scheduled_event?.uri ?? null,
  });

  const startTime = envelope.payload?.scheduled_event?.start_time?.trim();
  if (!startTime) {
    logCalendlyWarn("webhook", "invitee.created missing start_time", { caseId });
    return;
  }

  const scheduledAt = new Date(startTime);
  if (Number.isNaN(scheduledAt.getTime())) {
    logCalendlyWarn("webhook", "invitee.created has invalid start_time", {
      caseId,
      startTime,
    });
    return;
  }

  const secret = await createSupabaseSecretClient();
  const { data: existing, error: fetchErr } = await secret
    .from("post_admission_cases")
    .select("id, student_id, status, scheduled_at")
    .eq("id", caseId)
    .maybeSingle();

  if (fetchErr) {
    logCalendlyError("webhook", "Failed to fetch post-admission case", fetchErr, { caseId });
    throw new Error("Could not load post-admission case.");
  }

  if (!existing) {
    logCalendlyWarn("webhook", "Unknown post-admission case id", { caseId });
    return;
  }

  if (existing.scheduled_at != null) {
    logCalendly("webhook", "Post-admission case already scheduled — skipping", {
      caseId,
      scheduledAt: existing.scheduled_at,
    });
    return;
  }

  const { error: updateErr } = await secret
    .from("post_admission_cases")
    .update({
      scheduled_at: scheduledAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  if (updateErr) {
    logCalendlyError("webhook", "Failed to update post-admission scheduled_at", updateErr, {
      caseId,
    });
    throw new Error("Could not update post-admission case.");
  }

  logCalendly("webhook", "Post-admission scheduled_at recorded", {
    caseId,
    studentId: existing.student_id,
    scheduledAt: scheduledAt.toISOString(),
    status: existing.status,
  });
}

export async function POST(request: Request) {
  logCalendly("webhook", "Incoming webhook request");

  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY?.trim();
  if (!signingKey) {
    logCalendlyError("webhook", "CALENDLY_WEBHOOK_SIGNING_KEY is not set");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("calendly-webhook-signature");

  if (!verifyCalendlyWebhookSignature(rawBody, signatureHeader, signingKey)) {
    logCalendlyError("webhook", "Invalid webhook signature", undefined, {
      hasSignatureHeader: Boolean(signatureHeader),
      bodyLength: rawBody.length,
    });
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let envelope: CalendlyWebhookEnvelope;
  try {
    envelope = JSON.parse(rawBody) as CalendlyWebhookEnvelope;
  } catch (err) {
    logCalendlyError("webhook", "Invalid JSON payload", err, { bodyLength: rawBody.length });
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  logCalendly("webhook", "Webhook signature verified", {
    event: envelope.event ?? null,
    createdAt: envelope.created_at ?? null,
  });

  try {
    if (envelope.event === "invitee.created") {
      await handleInviteeCreated(envelope);
    } else {
      logCalendly("webhook", "Unhandled event type — acknowledged", {
        event: envelope.event ?? null,
      });
    }
  } catch (err) {
    logCalendlyError("webhook", "Handler error", err, { event: envelope.event ?? null });
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }

  logCalendly("webhook", "Webhook processed successfully", { event: envelope.event ?? null });
  return NextResponse.json({ received: true });
}
