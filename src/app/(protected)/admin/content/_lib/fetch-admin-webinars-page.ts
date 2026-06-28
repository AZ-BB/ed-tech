import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type WebinarStatus = Database["public"]["Enums"]["webinar_status"];

export type AdminWebinarTableRow = {
  id: number;
  title: string;
  description: string;
  scheduledAt: string;
  timezoneLabel: string;
  format: string;
  advisorId: string;
  advisorName: string;
  maxStudents: number;
  registeredCount: number;
  tags: string[];
  agenda: string[];
  status: WebinarStatus;
  meetingLink: string | null;
};

export type AdminAdvisorOption = {
  id: string;
  name: string;
};

export async function fetchAdminAdvisorOptions(): Promise<AdminAdvisorOption[]> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("advisors")
    .select("id, first_name, last_name")
    .eq("is_active", true)
    .order("last_name");

  if (error) {
    console.error("[fetchAdminAdvisorOptions]", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: [row.first_name?.trim(), row.last_name?.trim()].filter(Boolean).join(" ") || "Advisor",
  }));
}

function parseAgenda(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

export async function fetchAdminWebinarsPage(): Promise<AdminWebinarTableRow[]> {
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
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[fetchAdminWebinarsPage]", error);
    return [];
  }

  const webinarIds = (data ?? []).map((row) => row.id);
  const counts = new Map<number, number>();

  if (webinarIds.length > 0) {
    const { data: registrations, error: regErr } = await supabase
      .from("webinar_registrations")
      .select("webinar_id")
      .in("webinar_id", webinarIds);

    if (regErr) {
      console.error("[fetchAdminWebinarsPage] registrations", regErr);
    } else {
      for (const reg of registrations ?? []) {
        counts.set(reg.webinar_id, (counts.get(reg.webinar_id) ?? 0) + 1);
      }
    }
  }

  return (data ?? []).map((row) => {
    const advisor = Array.isArray(row.advisors) ? row.advisors[0] : row.advisors;
    const advisorName = advisor
      ? [advisor.first_name?.trim(), advisor.last_name?.trim()].filter(Boolean).join(" ")
      : "—";

    return {
      id: row.id,
      title: row.title?.trim() ?? "",
      description: row.description?.trim() ?? "",
      scheduledAt: row.scheduled_at,
      timezoneLabel: row.timezone_label?.trim() ?? "GST",
      format: row.format?.trim() ?? "Live online webinar",
      advisorId: row.advisor_id,
      advisorName: advisorName || "—",
      maxStudents: row.max_students,
      registeredCount: counts.get(row.id) ?? 0,
      tags: row.tags ?? [],
      agenda: parseAgenda(row.agenda),
      status: row.status,
      meetingLink: row.meeting_link,
    };
  });
}
