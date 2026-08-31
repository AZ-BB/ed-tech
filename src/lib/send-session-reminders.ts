import "server-only";

import {
  resolveProviderName,
  resolveStudentFirstNameForEmail,
} from "@/lib/resend/session-cancelled-student-email";
import {
  buildStudentAdvisorSessionsUrl,
  buildStudentPostAdmissionSupportUrl,
} from "@/lib/resend/site-url";
import { isWhatsAppConfigured } from "@/lib/whatsapp/config";
import {
  resolveStudentPhoneForSession,
  sendSessionReminderWhatsApp,
  type SessionReminderKind,
} from "@/lib/whatsapp/session-reminder-message";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type SessionReminderBatchResult = {
  sent: number;
  skipped: number;
  errors: string[];
};

function tomorrowUtcWindow(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2),
  );
  return { start, end };
}

type AdvisorSessionRow = {
  id: number;
  advisor_id: string;
  student_id: string;
  student_name: string | null;
  student_phone: string | null;
  booked_at: string;
  invitee_timezone: string | null;
  meeting_link: string | null;
  status: string | null;
  advisors: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  student_profiles: {
    phone: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
};

type PostAdmissionCaseRow = {
  id: number;
  student_id: string;
  student_name: string | null;
  scheduled_at: string;
  invitee_timezone: string | null;
  meeting_link: string | null;
  scheduled_session_status: string;
  assigned_to: string | null;
  advisors: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  student_profiles: {
    phone: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
};

const ADVISOR_SESSION_SELECT = `
  id,
  advisor_id,
  student_id,
  student_name,
  student_phone,
  booked_at,
  invitee_timezone,
  meeting_link,
  status,
  advisors ( first_name, last_name ),
  student_profiles ( phone, first_name, last_name )
`;

const POST_ADMISSION_CASE_SELECT = `
  id,
  student_id,
  student_name,
  scheduled_at,
  invitee_timezone,
  meeting_link,
  scheduled_session_status,
  assigned_to,
  advisors:assigned_to ( first_name, last_name ),
  student_profiles ( phone, first_name, last_name )
`;

async function sendReminderForRow(input: {
  kind: SessionReminderKind;
  id: number;
  table: "advisor_sessions" | "post_admission_cases";
  phone: string | null;
  studentFirstName: string;
  providerName: string;
  sessionDateTime: string;
  timezone: string | null;
  meetingLink: string | null;
  dashboardUrl: string;
  result: SessionReminderBatchResult;
  secret: Awaited<ReturnType<typeof createSupabaseSecretClient>>;
}): Promise<void> {
  if (!input.phone) {
    input.result.skipped += 1;
    return;
  }

  const meetingLinkOrDashboardUrl =
    input.meetingLink?.trim() || input.dashboardUrl;

  const sendResult = await sendSessionReminderWhatsApp({
    toPhone: input.phone,
    studentFirstName: input.studentFirstName,
    sessionKind: input.kind,
    providerName: input.providerName,
    sessionDateTime: input.sessionDateTime,
    timezone: input.timezone,
    meetingLinkOrDashboardUrl,
  });

  if (!("ok" in sendResult)) {
    input.result.errors.push(
      `${input.kind} ${input.id}: ${sendResult.error ?? "unknown error"}`,
    );
    return;
  }

  const nowIso = new Date().toISOString();
  const { error: updateErr } = await input.secret
    .from(input.table)
    .update({ whatsapp_reminder_sent_at: nowIso })
    .eq("id", input.id);

  if (updateErr) {
    console.error("[sendSessionDayBeforeReminders] update", updateErr);
    input.result.errors.push(
      `Could not mark WhatsApp reminder sent for ${input.kind} ${input.id}.`,
    );
    return;
  }

  input.result.sent += 1;
}

export async function sendSessionDayBeforeReminders(): Promise<SessionReminderBatchResult> {
  const result: SessionReminderBatchResult = { sent: 0, skipped: 0, errors: [] };

  if (!isWhatsAppConfigured()) {
    result.errors.push("WhatsApp is not configured.");
    return result;
  }

  const secret = await createSupabaseSecretClient();
  const { start: tomorrowStart, end: tomorrowEnd } = tomorrowUtcWindow();
  const tomorrowStartIso = tomorrowStart.toISOString();
  const tomorrowEndIso = tomorrowEnd.toISOString();

  const [advisorDashboardUrl, postAdmissionDashboardUrl] = await Promise.all([
    buildStudentAdvisorSessionsUrl(),
    buildStudentPostAdmissionSupportUrl(),
  ]);

  const { data: advisorSessions, error: advisorErr } = await secret
    .from("advisor_sessions")
    .select(ADVISOR_SESSION_SELECT)
    .gte("booked_at", tomorrowStartIso)
    .lt("booked_at", tomorrowEndIso)
    .is("whatsapp_reminder_sent_at", null)
    .neq("status", "cancelled");

  if (advisorErr) {
    console.error("[sendSessionDayBeforeReminders] advisor sessions", advisorErr);
    result.errors.push("Could not load advisor sessions.");
    return result;
  }

  for (const row of (advisorSessions ?? []) as AdvisorSessionRow[]) {
    const phone = resolveStudentPhoneForSession(
      row.student_phone,
      row.student_profiles?.phone,
    );

    await sendReminderForRow({
      kind: "advisor",
      id: row.id,
      table: "advisor_sessions",
      phone,
      studentFirstName: resolveStudentFirstNameForEmail(
        row.student_name,
        row.student_profiles,
      ),
      providerName: resolveProviderName(row.advisors, "your advisor"),
      sessionDateTime: row.booked_at,
      timezone: row.invitee_timezone,
      meetingLink: row.meeting_link,
      dashboardUrl: advisorDashboardUrl,
      result,
      secret,
    });
  }

  const { data: postAdmissionCases, error: postAdmissionErr } = await secret
    .from("post_admission_cases")
    .select(POST_ADMISSION_CASE_SELECT)
    .gte("scheduled_at", tomorrowStartIso)
    .lt("scheduled_at", tomorrowEndIso)
    .is("whatsapp_reminder_sent_at", null)
    .neq("scheduled_session_status", "cancelled");

  if (postAdmissionErr) {
    console.error(
      "[sendSessionDayBeforeReminders] post-admission cases",
      postAdmissionErr,
    );
    result.errors.push("Could not load post-admission cases.");
    return result;
  }

  for (const row of (postAdmissionCases ?? []) as PostAdmissionCaseRow[]) {
    const phone = resolveStudentPhoneForSession(
      null,
      row.student_profiles?.phone,
    );

    await sendReminderForRow({
      kind: "post_admission",
      id: row.id,
      table: "post_admission_cases",
      phone,
      studentFirstName: resolveStudentFirstNameForEmail(
        row.student_name,
        row.student_profiles,
      ),
      providerName: resolveProviderName(row.advisors, "your advisor"),
      sessionDateTime: row.scheduled_at,
      timezone: row.invitee_timezone,
      meetingLink: row.meeting_link,
      dashboardUrl: postAdmissionDashboardUrl,
      result,
      secret,
    });
  }

  return result;
}
