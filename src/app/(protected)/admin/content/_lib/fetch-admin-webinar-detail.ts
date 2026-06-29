import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { AdminWebinarTableRow } from "./fetch-admin-webinars-page";
import { displayHostName as resolveDisplayHostName } from "@/lib/webinar-host";

export type AdminWebinarEnrollmentRow = {
  id: number;
  registrationType: "platform" | "non_platform";
  studentId: string | null;
  name: string;
  email: string;
  phone: string | null;
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
      is_featured,
      host_name,
      host_title,
      host_bio,
      host_image_url,
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
    hostName: data.host_name,
    hostTitle: data.host_title,
    hostBio: data.host_bio,
    hostImageUrl: data.host_image_url,
    displayHostName: resolveDisplayHostName({
      host_name: data.host_name,
      host_title: data.host_title,
      host_bio: data.host_bio,
      host_image_url: data.host_image_url,
      advisors: advisor,
    }),
    maxStudents: data.max_students,
    registeredCount: count ?? 0,
    tags: data.tags ?? [],
    agenda,
    status: data.status,
    meetingLink: data.meeting_link,
    isFeatured: data.is_featured ?? false,
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
    console.error("[fetchAdminWebinarEnrollments]", error);
    return [];
  }

  return (data ?? []).map((row) => {
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
}
