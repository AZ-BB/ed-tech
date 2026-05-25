import { getCountryNameByAlpha2 } from "@/lib/countries";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { formatDistanceToNow } from "date-fns";

function jsonArrayToMultiline(raw: unknown): string {
  if (!raw) return "";
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join("\n");
  }
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return "";
}

export type AdminAmbassadorDetailPayload = {
  ambassador: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    destinationCountryCode: string;
    destinationName: string;
    nationalityCountryCode: string;
    nationalityName: string;
    universityId: string | null;
    universityName: string;
    major: string | null;
    startYear: number | null;
    graduationYear: number | null;
    isCurrentStudent: boolean;
    hasMsc: boolean;
    hasPhd: boolean;
    about: string | null;
    helpIn: string;
    helpInLabel: string;
    tags: string;
    tagsLabel: string;
    avatarUrl: string | null;
    isActive: boolean;
    joinedLabel: string;
    lastSessionLabel: string;
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
  if (!iso) return "No sessions yet";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "No sessions yet";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "No sessions yet";
  }
}

function formatHelpIn(raw: unknown): string {
  if (!raw) return "—";
  if (Array.isArray(raw)) {
    const items = raw
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    return items.length > 0 ? items.join(", ") : "—";
  }
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return "—";
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

export async function fetchAdminAmbassadorDetail(
  ambassadorId: string,
): Promise<AdminAmbassadorDetailPayload | null> {
  const isAdmin = await assertAdminAccess();
  if (!isAdmin) return null;

  const secret = await createSupabaseSecretClient();

  const { data: row, error } = await secret
    .from("ambassadors")
    .select(
      `
      id,
      first_name,
      last_name,
      email,
      destination_country_code,
      nationality_country_code,
      university_id,
      university_name,
      major,
      start_year,
      graduation_year,
      is_current_student,
      has_msc,
      has_phd,
      about,
      help_in,
      avatar_url,
      is_active,
      created_at,
      destination:countries!ambassadors_destination_country_code_fkey ( name ),
      nationality:countries!ambassadors_nationality_country_code_fkey ( name ),
      universities ( name ),
      ambassador_tags_joint ( ambassador_tags ( text ) )
    `,
    )
    .eq("id", ambassadorId)
    .maybeSingle();

  if (error || !row) {
    console.error("[fetchAdminAmbassadorDetail]", error);
    return null;
  }

  const { data: latestSession } = await secret
    .from("ambassador_session_requests")
    .select("created_at")
    .eq("ambassador_id", ambassadorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const tags =
    row.ambassador_tags_joint
      ?.map((joint) => {
        const embed = joint.ambassador_tags as
          | { text?: string }
          | { text?: string }[]
          | null;
        const tag = Array.isArray(embed) ? embed[0] : embed;
        return tag?.text?.trim();
      })
      .filter((tag): tag is string => Boolean(tag)) ?? [];

  const destinationEmbed = row.destination as { name?: string } | { name?: string }[] | null;
  const nationalityEmbed = row.nationality as { name?: string } | { name?: string }[] | null;
  const universityEmbed = row.universities as { name?: string } | { name?: string }[] | null;

  const destinationName =
    (Array.isArray(destinationEmbed)
      ? destinationEmbed[0]?.name
      : destinationEmbed?.name) ??
    getCountryNameByAlpha2(row.destination_country_code) ??
    row.destination_country_code ??
    "—";

  const nationalityName =
    (Array.isArray(nationalityEmbed)
      ? nationalityEmbed[0]?.name
      : nationalityEmbed?.name) ??
    getCountryNameByAlpha2(row.nationality_country_code) ??
    row.nationality_country_code ??
    "—";

  const universityFromJoin = Array.isArray(universityEmbed)
    ? universityEmbed[0]?.name?.trim()
    : universityEmbed?.name?.trim();
  const universityName =
    (universityFromJoin && universityFromJoin.length > 0
      ? universityFromJoin
      : row.university_name?.trim()) || "—";

  return {
    ambassador: {
      id: row.id,
      firstName: row.first_name?.trim() ?? "",
      lastName: row.last_name?.trim() ?? "",
      email: row.email?.trim() ?? "",
      destinationCountryCode: row.destination_country_code?.trim().toUpperCase() ?? "",
      destinationName,
      nationalityCountryCode: row.nationality_country_code?.trim().toUpperCase() ?? "",
      nationalityName,
      universityId: row.university_id,
      universityName,
      major: row.major?.trim() || null,
      startYear: row.start_year,
      graduationYear: row.graduation_year,
      isCurrentStudent: row.is_current_student,
      hasMsc: row.has_msc,
      hasPhd: row.has_phd,
      about: row.about?.trim() || null,
      helpIn: jsonArrayToMultiline(row.help_in),
      helpInLabel: formatHelpIn(row.help_in),
      tags: tags.join("\n"),
      tagsLabel: tags.length > 0 ? tags.join(", ") : "—",
      avatarUrl: row.avatar_url?.trim() || null,
      isActive: row.is_active,
      joinedLabel: formatJoined(row.created_at),
      lastSessionLabel: formatLastActive(latestSession?.created_at),
    },
  };
}
