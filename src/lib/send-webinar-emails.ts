import "server-only";

import type { Database } from "@/database.types";
import { isResendConfigured } from "@/lib/resend/config";
import { resolveStudentFirstNameForEmail } from "@/lib/resend/session-cancelled-student-email";
import { sendWebinarMeetingLinkEmail } from "@/lib/resend/webinar-meeting-link-email";
import { sendWebinarReminderEmail } from "@/lib/resend/webinar-reminder-email";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type WebinarStatus = Database["public"]["Enums"]["webinar_status"];

type WebinarRow = {
  id: number;
  title: string;
  scheduled_at: string;
  timezone_label: string;
  meeting_link: string | null;
  status: WebinarStatus;
  advisors: {
    first_name: string | null;
    last_name: string | null;
  } | null;
};

type RegistrationRow = {
  id: number;
  webinar_id: number;
  student_id: string;
  reminder_sent_at: string | null;
  meeting_link_sent_at: string | null;
  student_profiles: {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
};

function advisorDisplayName(
  advisor: WebinarRow["advisors"],
  fallback = "your advisor",
): string {
  if (!advisor) return fallback;
  const name = [advisor.first_name?.trim(), advisor.last_name?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || fallback;
}

export type WebinarEmailBatchResult = {
  sent: number;
  skipped: number;
  errors: string[];
};

export async function sendWebinarDayBeforeReminders(): Promise<WebinarEmailBatchResult> {
  const result: WebinarEmailBatchResult = { sent: 0, skipped: 0, errors: [] };

  if (!isResendConfigured()) {
    result.errors.push("Resend is not configured.");
    return result;
  }

  const secret = await createSupabaseSecretClient();
  const now = new Date();
  const tomorrowStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  const tomorrowEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2),
  );

  const { data: webinars, error: webinarsErr } = await secret
    .from("webinars")
    .select(
      `
      id,
      title,
      scheduled_at,
      timezone_label,
      meeting_link,
      status,
      advisors ( first_name, last_name )
    `,
    )
    .in("status", ["upcoming", "live"])
    .gte("scheduled_at", tomorrowStart.toISOString())
    .lt("scheduled_at", tomorrowEnd.toISOString());

  if (webinarsErr) {
    console.error("[sendWebinarDayBeforeReminders] webinars", webinarsErr);
    result.errors.push("Could not load webinars.");
    return result;
  }

  const webinarRows = (webinars ?? []) as WebinarRow[];
  if (webinarRows.length === 0) {
    return result;
  }

  const webinarIds = webinarRows.map((w) => w.id);
  const webinarById = new Map(webinarRows.map((w) => [w.id, w]));

  const { data: registrations, error: regErr } = await secret
    .from("webinar_registrations")
    .select(
      `
      id,
      webinar_id,
      student_id,
      reminder_sent_at,
      meeting_link_sent_at,
      student_profiles ( email, first_name, last_name )
    `,
    )
    .in("webinar_id", webinarIds)
    .is("reminder_sent_at", null);

  if (regErr) {
    console.error("[sendWebinarDayBeforeReminders] registrations", regErr);
    result.errors.push("Could not load registrations.");
    return result;
  }

  const nowIso = new Date().toISOString();

  for (const reg of (registrations ?? []) as RegistrationRow[]) {
    const webinar = webinarById.get(reg.webinar_id);
    const email = reg.student_profiles?.email?.trim();
    if (!webinar || !email) {
      result.skipped += 1;
      continue;
    }

    const sendResult = await sendWebinarReminderEmail({
      to: email,
      studentFirstName: resolveStudentFirstNameForEmail(null, reg.student_profiles),
      webinarTitle: webinar.title,
      scheduledAt: webinar.scheduled_at,
      timezoneLabel: webinar.timezone_label,
      advisorName: advisorDisplayName(webinar.advisors),
    });

    if (!("ok" in sendResult)) {
      result.errors.push(
        `Reminder failed for registration ${reg.id}: ${sendResult.error ?? "unknown error"}`,
      );
      continue;
    }

    const { error: updateErr } = await secret
      .from("webinar_registrations")
      .update({ reminder_sent_at: nowIso })
      .eq("id", reg.id);

    if (updateErr) {
      console.error("[sendWebinarDayBeforeReminders] update", updateErr);
      result.errors.push(`Could not mark reminder sent for registration ${reg.id}.`);
      continue;
    }

    result.sent += 1;
  }

  return result;
}

export async function sendWebinarMeetingLinks(
  webinarId: number,
  meetingLink: string,
): Promise<WebinarEmailBatchResult> {
  const result: WebinarEmailBatchResult = { sent: 0, skipped: 0, errors: [] };

  if (!isResendConfigured()) {
    result.errors.push("Resend is not configured.");
    return result;
  }

  const trimmedLink = meetingLink.trim();
  if (!trimmedLink) {
    result.errors.push("Meeting link is required.");
    return result;
  }

  const secret = await createSupabaseSecretClient();

  const { data: webinar, error: webinarErr } = await secret
    .from("webinars")
    .select(
      `
      id,
      title,
      scheduled_at,
      timezone_label,
      meeting_link,
      status,
      advisors ( first_name, last_name )
    `,
    )
    .eq("id", webinarId)
    .maybeSingle();

  if (webinarErr || !webinar) {
    result.errors.push("Webinar not found.");
    return result;
  }

  const webinarRow = webinar as WebinarRow;

  const { data: registrations, error: regErr } = await secret
    .from("webinar_registrations")
    .select(
      `
      id,
      webinar_id,
      student_id,
      reminder_sent_at,
      meeting_link_sent_at,
      student_profiles ( email, first_name, last_name )
    `,
    )
    .eq("webinar_id", webinarId)
    .is("meeting_link_sent_at", null);

  if (regErr) {
    console.error("[sendWebinarMeetingLinks] registrations", regErr);
    result.errors.push("Could not load registrations.");
    return result;
  }

  const nowIso = new Date().toISOString();

  for (const reg of (registrations ?? []) as RegistrationRow[]) {
    const email = reg.student_profiles?.email?.trim();
    if (!email) {
      result.skipped += 1;
      continue;
    }

    const sendResult = await sendWebinarMeetingLinkEmail({
      to: email,
      studentFirstName: resolveStudentFirstNameForEmail(null, reg.student_profiles),
      webinarTitle: webinarRow.title,
      scheduledAt: webinarRow.scheduled_at,
      timezoneLabel: webinarRow.timezone_label,
      advisorName: advisorDisplayName(webinarRow.advisors),
      meetingLink: trimmedLink,
    });

    if (!("ok" in sendResult)) {
      result.errors.push(
        `Meeting link email failed for registration ${reg.id}: ${sendResult.error ?? "unknown error"}`,
      );
      continue;
    }

    const { error: updateErr } = await secret
      .from("webinar_registrations")
      .update({ meeting_link_sent_at: nowIso })
      .eq("id", reg.id);

    if (updateErr) {
      console.error("[sendWebinarMeetingLinks] update", updateErr);
      result.errors.push(
        `Could not mark meeting link sent for registration ${reg.id}.`,
      );
      continue;
    }

    result.sent += 1;
  }

  return result;
}
