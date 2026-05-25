import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { AmbassadorCsvExportRow } from "./admin-ambassadors-csv";

type AmbassadorQueryRow = {
  email: string;
  first_name: string;
  last_name: string;
  destination_country_code: string;
  nationality_country_code: string;
  university_id: string | null;
  university_name: string | null;
  avatar_url: string | null;
  start_year: number | null;
  graduation_year: number | null;
  is_current_student: boolean;
  major: string | null;
  has_msc: boolean;
  has_phd: boolean;
  about: string | null;
  help_in: AmbassadorCsvExportRow["help_in"];
  is_active: boolean;
  ambassador_tags_joint: { ambassador_tags: { text: string } | null }[] | null;
};

export async function fetchAdminAmbassadorsExportRows(
  q: string,
): Promise<AmbassadorCsvExportRow[]> {
  const supabase = await createSupabaseSecretClient();
  let query = supabase.from("ambassadors").select(`
      email,
      first_name,
      last_name,
      destination_country_code,
      nationality_country_code,
      university_id,
      university_name,
      avatar_url,
      start_year,
      graduation_year,
      is_current_student,
      major,
      has_msc,
      has_phd,
      about,
      help_in,
      is_active,
      ambassador_tags_joint ( ambassador_tags ( text ) )
    `);

  const trimmed = q.trim();
  if (trimmed) {
    const e = escapeIlike(trimmed);
    query = query.or(
      `first_name.ilike.%${e}%,last_name.ilike.%${e}%,email.ilike.%${e}%`,
    );
  }

  const { data, error } = await query
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("[admin-users] ambassadors export", error);
    return [];
  }

  return ((data ?? []) as AmbassadorQueryRow[]).map((row) => ({
    email: row.email?.trim() ?? "",
    first_name: row.first_name?.trim() ?? "",
    last_name: row.last_name?.trim() ?? "",
    destination_country_code: row.destination_country_code?.trim() ?? "",
    nationality_country_code: row.nationality_country_code?.trim() ?? "",
    university_id: row.university_id,
    university_name: row.university_name,
    avatar_url: row.avatar_url,
    start_year: row.start_year,
    graduation_year: row.graduation_year,
    is_current_student: row.is_current_student,
    major: row.major,
    has_msc: row.has_msc,
    has_phd: row.has_phd,
    about: row.about,
    help_in: row.help_in,
    tags:
      row.ambassador_tags_joint
        ?.map((joint) => joint.ambassador_tags?.text)
        .filter((tag): tag is string => typeof tag === "string" && tag.length > 0) ??
      [],
    is_active: row.is_active,
  }));
}
