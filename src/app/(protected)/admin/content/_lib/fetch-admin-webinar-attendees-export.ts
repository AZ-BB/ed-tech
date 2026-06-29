import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { AdminWebinarEnrollmentRow } from "./fetch-admin-webinar-detail";

export type AdminWebinarAttendeeExportRow = {
  type: string;
  name: string;
  email: string;
  phone: string;
  school: string;
  registered_at: string;
  reminder_sent_at: string;
  meeting_link_sent_at: string;
};

function formatExportDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function mapEnrollmentToExportRow(row: AdminWebinarEnrollmentRow): AdminWebinarAttendeeExportRow {
  return {
    type: row.registrationType === "platform" ? "Platform" : "Non-platform",
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    school: row.schoolName,
    registered_at: formatExportDateTime(row.registeredAt),
    reminder_sent_at: formatExportDateTime(row.reminderSentAt),
    meeting_link_sent_at: formatExportDateTime(row.meetingLinkSentAt),
  };
}

export async function fetchAdminWebinarAttendeesExport(
  webinarId: number,
): Promise<AdminWebinarAttendeeExportRow[]> {
  const supabase = await createSupabaseSecretClient();

  const { data, error } = await supabase
    .from("webinar_registrations")
    .select(
      `
      id,
      registration_type,
      student_id,
      guest_name,
      guest_email,
      guest_phone,
      registered_at,
      reminder_sent_at,
      meeting_link_sent_at,
      student_profiles (
        first_name,
        last_name,
        email,
        schools ( name )
      )
    `,
    )
    .eq("webinar_id", webinarId)
    .order("registered_at", { ascending: false });

  if (error) {
    console.error("[fetchAdminWebinarAttendeesExport]", error);
    throw new Error("Could not load webinar attendees for export.");
  }

  const rows: AdminWebinarEnrollmentRow[] = (data ?? []).map((row) => {
    const registrationType = row.registration_type as "platform" | "non_platform";

    if (registrationType === "non_platform") {
      return {
        id: row.id,
        registrationType,
        studentId: null,
        name: row.guest_name?.trim() || "—",
        email: row.guest_email?.trim() ?? "—",
        phone: row.guest_phone?.trim() || null,
        schoolName: "—",
        registeredAt: row.registered_at,
        reminderSentAt: row.reminder_sent_at,
        meetingLinkSentAt: row.meeting_link_sent_at,
      };
    }

    const profile = Array.isArray(row.student_profiles)
      ? row.student_profiles[0]
      : row.student_profiles;
    const school = profile?.schools
      ? Array.isArray(profile.schools)
        ? profile.schools[0]
        : profile.schools
      : null;

    const studentName = profile
      ? [profile.first_name?.trim(), profile.last_name?.trim()].filter(Boolean).join(" ")
      : "—";

    return {
      id: row.id,
      registrationType,
      studentId: row.student_id,
      name: studentName || "—",
      email: profile?.email?.trim() ?? "—",
      phone: null,
      schoolName: school?.name?.trim() ?? "—",
      registeredAt: row.registered_at,
      reminderSentAt: row.reminder_sent_at,
      meetingLinkSentAt: row.meeting_link_sent_at,
    };
  });

  return rows.map(mapEnrollmentToExportRow);
}
