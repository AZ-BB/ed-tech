import "server-only";

import { logCalendly, logCalendlyError, logCalendlyWarn } from "@/lib/calendly-log";
import type { CalendlyWebhookEnvelope } from "@/lib/calendly-webhook";
import { isResendConfigured } from "@/lib/resend/config";
import {
  resolveProviderName,
  resolveStudentEmailForSession,
  resolveStudentFirstNameForEmail,
} from "@/lib/resend/session-cancelled-student-email";
import {
  sendSessionBookedStudentEmail,
  type SessionBookedKind,
} from "@/lib/resend/session-booked-student-email";
import {
  buildStudentAdvisorSessionsUrl,
  buildStudentPostAdmissionSupportUrl,
} from "@/lib/resend/site-url";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export function extractCalendlyMeetingLink(
  envelope: CalendlyWebhookEnvelope,
): string | null {
  const location = envelope.payload?.scheduled_event?.location;
  const joinUrl = location?.join_url?.trim();
  if (joinUrl) return joinUrl;
  const locationText = location?.location?.trim();
  if (locationText?.startsWith("http://") || locationText?.startsWith("https://")) {
    return locationText;
  }
  return null;
}

export function extractCalendlyInviteeTimezone(
  envelope: CalendlyWebhookEnvelope,
): string | null {
  return envelope.payload?.timezone?.trim() || null;
}

async function notifySessionBooked(input: {
  kind: SessionBookedKind;
  to: string | null;
  studentFirstName: string;
  providerName: string;
  sessionDateTime: string;
  timezone: string | null;
  meetingLink: string | null;
  context: Record<string, unknown>;
}): Promise<void> {
  if (!isResendConfigured()) {
    logCalendlyWarn("webhook", "Resend not configured — skipping booking email", input.context);
    return;
  }

  if (!input.to) {
    logCalendlyWarn("webhook", "No student email for booking confirmation", input.context);
    return;
  }

  const dashboardUrl =
    input.kind === "advisor"
      ? await buildStudentAdvisorSessionsUrl()
      : await buildStudentPostAdmissionSupportUrl();

  const result = await sendSessionBookedStudentEmail({
    to: input.to,
    studentFirstName: input.studentFirstName,
    sessionKind: input.kind,
    providerName: input.providerName,
    sessionDateTime: input.sessionDateTime,
    timezone: input.timezone,
    meetingLink: input.meetingLink,
    dashboardUrl,
  });

  if ("error" in result) {
    logCalendlyError("webhook", "Failed to send booking confirmation email", result.error, {
      ...input.context,
      kind: input.kind,
    });
    return;
  }

  logCalendly("webhook", "Booking confirmation email sent", {
    ...input.context,
    kind: input.kind,
    emailId: result.id,
  });
}

export async function sendAdvisorSessionBookedEmail(input: {
  sessionId: number;
  advisorId: string;
  studentId: string;
  bookedAtIso: string;
  envelope: CalendlyWebhookEnvelope;
}): Promise<void> {
  const secret = await createSupabaseSecretClient();

  const [{ data: session }, { data: advisor }, { data: profile }] = await Promise.all([
    secret
      .from("advisor_sessions")
      .select("student_name, student_email")
      .eq("id", input.sessionId)
      .maybeSingle(),
    secret
      .from("advisors")
      .select("first_name, last_name")
      .eq("id", input.advisorId)
      .maybeSingle(),
    secret
      .from("student_profiles")
      .select("first_name, last_name, email")
      .eq("id", input.studentId)
      .maybeSingle(),
  ]);

  const inviteeEmail = input.envelope.payload?.email?.trim() || null;

  await notifySessionBooked({
    kind: "advisor",
    to:
      resolveStudentEmailForSession(session?.student_email, profile) ?? inviteeEmail,
    studentFirstName: resolveStudentFirstNameForEmail(session?.student_name, profile),
    providerName: resolveProviderName(advisor, "your advisor"),
    sessionDateTime: input.bookedAtIso,
    timezone: extractCalendlyInviteeTimezone(input.envelope),
    meetingLink: extractCalendlyMeetingLink(input.envelope),
    context: {
      sessionId: input.sessionId,
      advisorId: input.advisorId,
      studentId: input.studentId,
    },
  });
}

export async function sendPostAdmissionSessionBookedEmail(input: {
  caseId: number;
  studentId: string;
  scheduledAtIso: string;
  envelope: CalendlyWebhookEnvelope;
}): Promise<void> {
  const secret = await createSupabaseSecretClient();

  const { data: caseRow } = await secret
    .from("post_admission_cases")
    .select(
      `
      student_name,
      student_email,
      assigned_to,
      advisors:assigned_to ( first_name, last_name )
    `,
    )
    .eq("id", input.caseId)
    .maybeSingle();

  const { data: profile } = await secret
    .from("student_profiles")
    .select("first_name, last_name, email")
    .eq("id", input.studentId)
    .maybeSingle();

  const inviteeEmail = input.envelope.payload?.email?.trim() || null;

  await notifySessionBooked({
    kind: "post_admission",
    to:
      resolveStudentEmailForSession(caseRow?.student_email, profile) ?? inviteeEmail,
    studentFirstName: resolveStudentFirstNameForEmail(caseRow?.student_name, profile),
    providerName: resolveProviderName(caseRow?.advisors, "your advisor"),
    sessionDateTime: input.scheduledAtIso,
    timezone: extractCalendlyInviteeTimezone(input.envelope),
    meetingLink: extractCalendlyMeetingLink(input.envelope),
    context: {
      caseId: input.caseId,
      studentId: input.studentId,
      assignedTo: caseRow?.assigned_to ?? null,
    },
  });
}
