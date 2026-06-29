import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { resolveWebinarHost } from "@/lib/webinar-host";

export type StudentWebinarCard = {
  id: number;
  title: string;
  description: string;
  scheduledAt: string;
  timezoneLabel: string;
  format: string;
  tags: string[];
  agenda: string[];
  maxStudents: number;
  registeredCount: number;
  isRegistered: boolean;
  isFull: boolean;
  speakerName: string;
  speakerTitle: string;
  speakerBio: string;
  speakerInitials: string;
  speakerImageUrl: string | null;
  avatarColorClass: string;
};

const AVATAR_COLORS = [
  "av-1",
  "av-2",
  "av-3",
  "av-4",
  "av-5",
  "av-6",
  "av-7",
  "av-8",
  "av-9",
  "av-10",
] as const;

function parseAgenda(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

export async function fetchStudentWebinarsPage(
  studentId: string | null,
): Promise<StudentWebinarCard[]> {
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
      agenda,
      max_students,
      host_name,
      host_title,
      host_bio,
      host_image_url,
      advisors (
        first_name,
        last_name,
        title,
        description,
        about
      )
    `,
    )
    .eq("status", "upcoming")
    .gte("scheduled_at", now)
    .order("is_featured", { ascending: false })
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[fetchStudentWebinarsPage]", error);
    return [];
  }

  const webinarIds = (data ?? []).map((row) => row.id);
  const counts = new Map<number, number>();
  const registeredIds = new Set<number>();

  if (webinarIds.length > 0) {
    const { data: registrations, error: regErr } = await supabase
      .from("webinar_registrations")
      .select("webinar_id, student_id, registration_type")
      .in("webinar_id", webinarIds);

    if (regErr) {
      console.error("[fetchStudentWebinarsPage] registrations", regErr);
    } else {
      for (const reg of registrations ?? []) {
        counts.set(reg.webinar_id, (counts.get(reg.webinar_id) ?? 0) + 1);
        if (
          studentId &&
          reg.registration_type === "platform" &&
          reg.student_id === studentId
        ) {
          registeredIds.add(reg.webinar_id);
        }
      }
    }
  }

  return (data ?? []).map((row, index) => {
    const advisor = Array.isArray(row.advisors) ? row.advisors[0] : row.advisors;
    const registeredCount = counts.get(row.id) ?? 0;
    const maxStudents = row.max_students;
    const avatarColorClass = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const host = resolveWebinarHost({
      host_name: row.host_name,
      host_title: row.host_title,
      host_bio: row.host_bio,
      host_image_url: row.host_image_url,
      advisors: advisor,
    });

    return {
      id: row.id,
      title: row.title?.trim() ?? "",
      description: row.description?.trim() ?? "",
      scheduledAt: row.scheduled_at,
      timezoneLabel: row.timezone_label?.trim() ?? "GST",
      format: row.format?.trim() ?? "Live online webinar",
      tags: row.tags ?? [],
      agenda: parseAgenda(row.agenda),
      maxStudents,
      registeredCount,
      isRegistered: registeredIds.has(row.id),
      isFull: registeredCount >= maxStudents,
      speakerName: host.speakerName,
      speakerTitle: host.speakerTitle,
      speakerBio: host.speakerBio,
      speakerInitials: host.speakerInitials,
      speakerImageUrl: host.speakerImageUrl,
      avatarColorClass,
    };
  });
}

export async function getStudentIdForWebinars(): Promise<string | null> {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user?.id) return null;

  const secret = await createSupabaseSecretClient();
  const { data: profile } = await secret
    .from("student_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.id ?? null;
}
