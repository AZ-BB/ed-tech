import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { AdvisorCsvExportRow } from "./admin-advisors-csv";

type AdvisorQueryRow = {
  email: string;
  first_name: string;
  last_name: string;
  nationality_country_code: string;
  phone: string | null;
  title: string | null;
  experience_years: number | null;
  languages: string | null;
  avatar_url: string | null;
  description: string | null;
  best_for: string | null;
  session_for: string | null;
  session_coverage: AdvisorCsvExportRow["session_coverage"];
  about: string | null;
  questions: AdvisorCsvExportRow["questions"];
  is_active: boolean;
  advisor_tags_joint: { advisor_tags: { text: string } | null }[] | null;
  advisor_specializations_countries: { country_code: string }[] | null;
};

export async function fetchAdminAdvisorsExportRows(
  q: string,
): Promise<AdvisorCsvExportRow[]> {
  const supabase = await createSupabaseSecretClient();
  let query = supabase.from("advisors").select(`
      email,
      first_name,
      last_name,
      nationality_country_code,
      phone,
      title,
      experience_years,
      languages,
      avatar_url,
      description,
      best_for,
      session_for,
      session_coverage,
      about,
      questions,
      is_active,
      advisor_tags_joint ( advisor_tags ( text ) ),
      advisor_specializations_countries ( country_code )
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
    console.error("[admin-users] advisors export", error);
    return [];
  }

  return ((data ?? []) as AdvisorQueryRow[]).map((row) => ({
    email: row.email?.trim() ?? "",
    first_name: row.first_name?.trim() ?? "",
    last_name: row.last_name?.trim() ?? "",
    nationality_country_code: row.nationality_country_code?.trim() ?? "",
    specialization_country_codes:
      row.advisor_specializations_countries
        ?.map((entry) => entry.country_code?.trim().toUpperCase())
        .filter((code): code is string => typeof code === "string" && code.length > 0) ??
      [],
    tags:
      row.advisor_tags_joint
        ?.map((joint) => joint.advisor_tags?.text)
        .filter((tag): tag is string => typeof tag === "string" && tag.length > 0) ?? [],
    phone: row.phone,
    title: row.title,
    experience_years: row.experience_years,
    languages: row.languages,
    avatar_url: row.avatar_url,
    description: row.description,
    best_for: row.best_for,
    session_for: row.session_for,
    session_coverage: row.session_coverage,
    about: row.about,
    questions: row.questions,
    is_active: row.is_active,
  }));
}
