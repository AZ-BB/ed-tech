import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { AdminWebinarTableRow } from "./fetch-admin-webinars-page";

export type AdminWebinarEnrollmentRow = {
  id: number;
  studentId: string;
  studentName: string;
  email: string;
  schoolName: string;
  registeredAt: string | null;
  reminderSentAt: string | null;
  meetingLinkSentAt: string | null;
};

export async function fetchAdminWebinarDetail(
  webinarId: number,
): Promise<AdminWebinarTableRow | null> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("webinars")
    .select(
      `
      id,
      title,
      description,
      scheduled_at,
      timezone_label,
      format,
      advisor_id,
      max_students,
      tags,
      agenda,
      status,
      meeting_link,
      advisors ( first_name, last_name )
    `,
    )
    .eq("id", webinarId)
    .maybeSingle();

  if (error || !data) {
    console.error("[fetchAdminWebinarDetail]", error);
    return null;
  }

  const { count } = await supabase
    .from("webinar_registrations")
    .select("id", { count: "exact", head: true })
    .eq("webinar_id", webinarId);

  const advisor = Array.isArray(data.advisors) ? data.advisors[0] : data.advisors;
  const advisorName = advisor
    ? [advisor.first_name?.trim(), advisor.last_name?.trim()].filter(Boolean).join(" ")
    : "—";

  const agenda = Array.isArray(data.agenda)
    ? data.agenda.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];

  return {
    id: data.id,
    title: data.title?.trim() ?? "",
    description: data.description?.trim() ?? "",
    scheduledAt: data.scheduled_at,
    timezoneLabel: data.timezone_label?.trim() ?? "GST",
    format: data.format?.trim() ?? "Live online webinar",
    advisorId: data.advisor_id,
    advisorName: advisorName || "—",
    maxStudents: data.max_students,
    registeredCount: count ?? 0,
    tags: data.tags ?? [],
    agenda,
    status: data.status,
    meetingLink: data.meeting_link,
  };
}

export async function fetchAdminWebinarEnrollments(
  webinarId: number,
): Promise<AdminWebinarEnrollmentRow[]> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("webinar_registrations")
    .select(
      `
      id,
      student_id,
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
    console.error("[fetchAdminWebinarEnrollments]", error);
    return [];
  }

  return (data ?? []).map((row) => {
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
      studentId: row.student_id,
      studentName: studentName || "—",
      email: profile?.email?.trim() ?? "—",
      schoolName: school?.name?.trim() ?? "—",
      registeredAt: row.registered_at,
      reminderSentAt: row.reminder_sent_at,
      meetingLinkSentAt: row.meeting_link_sent_at,
    };
  });
}
