import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type SchoolWebinarRow = {
  id: number;
  title: string;
  description: string;
  scheduledAt: string;
  timezoneLabel: string;
  format: string;
  tags: string[];
  advisorName: string;
  advisorTitle: string;
  registeredCount: number;
  maxStudents: number;
};

export async function fetchSchoolWebinarsPage(): Promise<SchoolWebinarRow[]> {
  const supabase = await createSupabaseSecretClient();
  const now = new Date().toISOString();

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
      tags,
      max_students,
      advisors ( first_name, last_name, title )
    `,
    )
    .in("status", ["upcoming", "live"])
    .gte("scheduled_at", now)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[fetchSchoolWebinarsPage]", error);
    return [];
  }

  const webinarIds = (data ?? []).map((row) => row.id);
  const counts = new Map<number, number>();

  if (webinarIds.length > 0) {
    const { data: registrations, error: regErr } = await supabase
      .from("webinar_registrations")
      .select("webinar_id")
      .in("webinar_id", webinarIds);

    if (!regErr) {
      for (const reg of registrations ?? []) {
        counts.set(reg.webinar_id, (counts.get(reg.webinar_id) ?? 0) + 1);
      }
    }
  }

  return (data ?? []).map((row) => {
    const advisor = Array.isArray(row.advisors) ? row.advisors[0] : row.advisors;
    const advisorName = advisor
      ? [advisor.first_name?.trim(), advisor.last_name?.trim()].filter(Boolean).join(" ")
      : "Advisor";

    return {
      id: row.id,
      title: row.title?.trim() ?? "",
      description: row.description?.trim() ?? "",
      scheduledAt: row.scheduled_at,
      timezoneLabel: row.timezone_label?.trim() ?? "GST",
      format: row.format?.trim() ?? "Live online webinar",
      tags: row.tags ?? [],
      advisorName: advisorName || "Advisor",
      advisorTitle: advisor?.title?.trim() ?? "Univeera Advisor",
      registeredCount: counts.get(row.id) ?? 0,
      maxStudents: row.max_students,
    };
  });
}
