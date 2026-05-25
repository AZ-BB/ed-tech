import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { formatDistanceToNow } from "date-fns";

export type AdminTeacherDetailPayload = {
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    gender: "male" | "female" | null;
    titleLabel: string;
    isActive: boolean;
    schoolId: string;
    schoolName: string;
    joinedLabel: string;
    lastActiveLabel: string;
  };
};

function formatJoined(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatLastActive(iso: string | null | undefined): string {
  if (!iso) return "Never";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Never";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "Never";
  }
}

function genderToTitle(gender: "male" | "female" | null): string {
  if (gender === "female") return "Ms.";
  if (gender === "male") return "Mr.";
  return "—";
}

function schoolNameFromEmbed(schools: unknown): string {
  const embed = schools as { name?: string } | { name?: string }[] | null;
  if (Array.isArray(embed)) return embed[0]?.name?.trim() || "—";
  return embed?.name?.trim() || "—";
}

async function assertAdminAccess() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) return false;

  const secret = await createSupabaseSecretClient();
  const { data: admin } = await secret
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return Boolean(admin);
}

export async function fetchAdminTeacherDetail(
  teacherId: string,
): Promise<AdminTeacherDetailPayload | null> {
  const isAdmin = await assertAdminAccess();
  if (!isAdmin) return null;

  const secret = await createSupabaseSecretClient();

  const { data: profile, error } = await secret
    .from("school_admin_profiles")
    .select(
      `
      id,
      first_name,
      last_name,
      email,
      phone,
      gender,
      is_active,
      school_id,
      created_at,
      schools ( name )
    `,
    )
    .eq("id", teacherId)
    .maybeSingle();

  if (error || !profile) {
    console.error("[fetchAdminTeacherDetail]", error);
    return null;
  }

  const { data: latestLog } = await secret
    .from("acitivity_logs")
    .select("created_at")
    .eq("school_admin_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const gender = profile.gender as "male" | "female" | null;

  return {
    teacher: {
      id: profile.id,
      firstName: profile.first_name?.trim() ?? "",
      lastName: profile.last_name?.trim() ?? "",
      email: profile.email?.trim() ?? "",
      phone: profile.phone?.trim() || null,
      gender,
      titleLabel: genderToTitle(gender),
      isActive: profile.is_active,
      schoolId: profile.school_id,
      schoolName: schoolNameFromEmbed(profile.schools),
      joinedLabel: formatJoined(profile.created_at),
      lastActiveLabel: formatLastActive(latestLog?.created_at),
    },
  };
}
