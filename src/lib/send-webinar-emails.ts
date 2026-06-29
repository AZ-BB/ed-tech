import "server-only";

import type { Database } from "@/database.types";
import { isResendConfigured } from "@/lib/resend/config";
import { resolveStudentFirstNameForEmail } from "@/lib/resend/session-cancelled-student-email";
import { sendWebinarMeetingLinkEmail } from "@/lib/resend/webinar-meeting-link-email";
import { sendWebinarRegistrationConfirmationEmail } from "@/lib/resend/webinar-registration-confirmation-email";
import { sendWebinarReminderEmail } from "@/lib/resend/webinar-reminder-email";
import { resolveWebinarHost } from "@/lib/webinar-host";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type WebinarStatus = Database["public"]["Enums"]["webinar_status"];
type WebinarRegistrationType = Database["public"]["Enums"]["webinar_registration_type"];

type WebinarRow = {
  id: number;
  title: string;
  scheduled_at: string;
  timezone_label: string;
  meeting_link: string | null;
  status: WebinarStatus;
  host_name: string | null;
  host_title: string | null;
  host_bio: string | null;
  host_image_url: string | null;
  advisors: {
    first_name: string | null;
    last_name: string | null;
    title?: string | null;
    description?: string | null;
    about?: string | null;
  } | null;
};

type RegistrationRow = {
  id: number;
  webinar_id: number;
  student_id: string | null;
  registration_type: WebinarRegistrationType;
  guest_name: string | null;
  guest_email: string | null;
  reminder_sent_at: string | null;
  meeting_link_sent_at: string | null;
  student_profiles: {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
};

const REGISTRATION_EMAIL_SELECT = `
  id,
  webinar_id,
  student_id,
  registration_type,
  guest_name,
  guest_email,
  reminder_sent_at,
  meeting_link_sent_at,
  student_profiles ( email, first_name, last_name )
`;

function hostNameForEmail(webinar: WebinarRow, fallback = "your advisor"): string {
  return resolveWebinarHost(webinar).hostLabelForEmail || fallback;
}

function firstNameFromGuestName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? "there";
}

function resolveRegistrationRecipient(reg: RegistrationRow): {
  email: string | null;
  firstName: string;
} {
  if (reg.registration_type === "non_platform") {
    return {
      email: reg.guest_email?.trim() ?? null,
      firstName: firstNameFromGuestName(reg.guest_name ?? ""),
    };
  }

  return {
    email: reg.student_profiles?.email?.trim() ?? null,
    firstName: resolveStudentFirstNameForEmail(null, reg.student_profiles),
  };
}

const WEBINAR_EMAIL_SELECT = `
  id,
  title,
  scheduled_at,
  timezone_label,
  meeting_link,
  status,
  host_name,
  host_title,
  host_bio,
  host_image_url,
  advisors ( first_name, last_name, title, description, about )
`;

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
    .select(WEBINAR_EMAIL_SELECT)
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
    .select(REGISTRATION_EMAIL_SELECT)
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
    const recipient = resolveRegistrationRecipient(reg);
    if (!webinar || !recipient.email) {
      result.skipped += 1;
      continue;
    }

    const sendResult = await sendWebinarReminderEmail({
      to: recipient.email,
      studentFirstName: recipient.firstName,
      webinarTitle: webinar.title,
      scheduledAt: webinar.scheduled_at,
      timezoneLabel: webinar.timezone_label,
      advisorName: hostNameForEmail(webinar),
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
    .select(WEBINAR_EMAIL_SELECT)
    .eq("id", webinarId)
    .maybeSingle();

  if (webinarErr || !webinar) {
    result.errors.push("Webinar not found.");
    return result;
  }

  const webinarRow = webinar as WebinarRow;

  const { data: registrations, error: regErr } = await secret
    .from("webinar_registrations")
    .select(REGISTRATION_EMAIL_SELECT)
    .eq("webinar_id", webinarId)
    .is("meeting_link_sent_at", null);

  if (regErr) {
    console.error("[sendWebinarMeetingLinks] registrations", regErr);
    result.errors.push("Could not load registrations.");
    return result;
  }

  const nowIso = new Date().toISOString();

  for (const reg of (registrations ?? []) as RegistrationRow[]) {
    const recipient = resolveRegistrationRecipient(reg);
    if (!recipient.email) {
      result.skipped += 1;
      continue;
    }

    const sendResult = await sendWebinarMeetingLinkEmail({
      to: recipient.email,
      studentFirstName: recipient.firstName,
      webinarTitle: webinarRow.title,
      scheduledAt: webinarRow.scheduled_at,
      timezoneLabel: webinarRow.timezone_label,
      advisorName: hostNameForEmail(webinarRow),
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

async function sendMeetingLinkForRegistration(
  webinarId: number,
  registrationId: number,
): Promise<{ ok: true; sent: boolean } | { ok: false; error: string }> {
  if (!isResendConfigured()) {
    return { ok: false, error: "Resend is not configured." };
  }

  const secret = await createSupabaseSecretClient();

  const { data: webinar, error: webinarErr } = await secret
    .from("webinars")
    .select(WEBINAR_EMAIL_SELECT)
    .eq("id", webinarId)
    .maybeSingle();

  if (webinarErr || !webinar) {
    return { ok: false, error: "Webinar not found." };
  }

  const webinarRow = webinar as WebinarRow;
  const meetingLink = webinarRow.meeting_link?.trim();
  if (!meetingLink) {
    return { ok: true, sent: false };
  }

  const { data: registration, error: regErr } = await secret
    .from("webinar_registrations")
    .select(REGISTRATION_EMAIL_SELECT)
    .eq("id", registrationId)
    .eq("webinar_id", webinarId)
    .maybeSingle();

  if (regErr || !registration) {
    return { ok: false, error: "Could not load registration." };
  }

  const regRow = registration as RegistrationRow;

  if (regRow.meeting_link_sent_at) {
    return { ok: true, sent: false };
  }

  const recipient = resolveRegistrationRecipient(regRow);
  if (!recipient.email) {
    return { ok: true, sent: false };
  }

  const sendResult = await sendWebinarMeetingLinkEmail({
    to: recipient.email,
    studentFirstName: recipient.firstName,
    webinarTitle: webinarRow.title,
    scheduledAt: webinarRow.scheduled_at,
    timezoneLabel: webinarRow.timezone_label,
    advisorName: hostNameForEmail(webinarRow),
    meetingLink,
  });

  if (!("ok" in sendResult)) {
    return {
      ok: false,
      error: sendResult.error ?? "Could not send meeting link email.",
    };
  }

  const nowIso = new Date().toISOString();
  const { error: updateErr } = await secret
    .from("webinar_registrations")
    .update({ meeting_link_sent_at: nowIso })
    .eq("id", regRow.id);

  if (updateErr) {
    console.error("[sendMeetingLinkForRegistration] update", updateErr);
    return { ok: false, error: "Could not mark meeting link as sent." };
  }

  return { ok: true, sent: true };
}

export async function sendWebinarMeetingLinkForNewRegistration(
  webinarId: number,
  studentId: string,
): Promise<{ ok: true; sent: boolean } | { ok: false; error: string }> {
  const secret = await createSupabaseSecretClient();

  const { data: registration, error: regErr } = await secret
    .from("webinar_registrations")
    .select("id")
    .eq("webinar_id", webinarId)
    .eq("student_id", studentId)
    .eq("registration_type", "platform")
    .maybeSingle();

  if (regErr || !registration) {
    return { ok: false, error: "Could not load registration." };
  }

  return sendMeetingLinkForRegistration(webinarId, registration.id);
}

export async function sendWebinarMeetingLinkForNewGuestRegistration(
  webinarId: number,
  registrationId: number,
): Promise<{ ok: true; sent: boolean } | { ok: false; error: string }> {
  return sendMeetingLinkForRegistration(webinarId, registrationId);
}

async function sendRegistrationConfirmationForRegistration(
  webinarId: number,
  registrationId: number,
): Promise<{ ok: true; sent: boolean } | { ok: false; error: string }> {
  if (!isResendConfigured()) {
    return { ok: false, error: "Resend is not configured." };
  }

  const secret = await createSupabaseSecretClient();

  const { data: webinar, error: webinarErr } = await secret
    .from("webinars")
    .select(WEBINAR_EMAIL_SELECT)
    .eq("id", webinarId)
    .maybeSingle();

  if (webinarErr || !webinar) {
    return { ok: false, error: "Webinar not found." };
  }

  const webinarRow = webinar as WebinarRow;

  const { data: registration, error: regErr } = await secret
    .from("webinar_registrations")
    .select(REGISTRATION_EMAIL_SELECT)
    .eq("id", registrationId)
    .eq("webinar_id", webinarId)
    .maybeSingle();

  if (regErr || !registration) {
    return { ok: false, error: "Could not load registration." };
  }

  const regRow = registration as RegistrationRow;
  const recipient = resolveRegistrationRecipient(regRow);
  if (!recipient.email) {
    return { ok: true, sent: false };
  }

  const meetingLink = webinarRow.meeting_link?.trim() || null;

  const sendResult = await sendWebinarRegistrationConfirmationEmail({
    to: recipient.email,
    studentFirstName: recipient.firstName,
    webinarTitle: webinarRow.title,
    scheduledAt: webinarRow.scheduled_at,
    timezoneLabel: webinarRow.timezone_label,
    advisorName: hostNameForEmail(webinarRow),
    meetingLink,
  });

  if (!("ok" in sendResult)) {
    return {
      ok: false,
      error: sendResult.error ?? "Could not send registration confirmation email.",
    };
  }

  if (meetingLink) {
    const nowIso = new Date().toISOString();
    const { error: updateErr } = await secret
      .from("webinar_registrations")
      .update({ meeting_link_sent_at: nowIso })
      .eq("id", regRow.id);

    if (updateErr) {
      console.error("[sendRegistrationConfirmationForRegistration] update", updateErr);
      return { ok: false, error: "Could not mark meeting link as sent." };
    }
  }

  return { ok: true, sent: true };
}

export async function sendWebinarRegistrationConfirmationForNewRegistration(
  webinarId: number,
  studentId: string,
): Promise<{ ok: true; sent: boolean } | { ok: false; error: string }> {
  const secret = await createSupabaseSecretClient();

  const { data: registration, error: regErr } = await secret
    .from("webinar_registrations")
    .select("id")
    .eq("webinar_id", webinarId)
    .eq("student_id", studentId)
    .eq("registration_type", "platform")
    .maybeSingle();

  if (regErr || !registration) {
    return { ok: false, error: "Could not load registration." };
  }

  return sendRegistrationConfirmationForRegistration(webinarId, registration.id);
}

export async function sendWebinarRegistrationConfirmationForNewGuestRegistration(
  webinarId: number,
  registrationId: number,
): Promise<{ ok: true; sent: boolean } | { ok: false; error: string }> {
  return sendRegistrationConfirmationForRegistration(webinarId, registrationId);
}
