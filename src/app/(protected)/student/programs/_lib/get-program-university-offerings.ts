import "server-only";

import { createSupabaseServerClient } from "@/utils/supabase-server";

import {
  countryCodeDisplayLabel,
  getCountryDisplayName,
  getUniversityProgramRegion,
  type ProgramUniversityOfferingRegion,
} from "./program-university-region";

export type ProgramUniversityOffering = {
  linkId: string;
  universityId: string;
  name: string;
  city: string;
  countryCode: string;
  countryCodeLabel: string;
  countryName: string;
  region: ProgramUniversityOfferingRegion | null;
  rankingNote: string;
  tuitionNote: string;
  shortDescription: string;
  programSchoolNote: string;
  featured: boolean;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  admissionsPageUrl: string | null;
  detailHref: string;
};

type UniversityRelation = {
  id: string;
  name: string;
  city: string;
  country_code: string;
  email: string | null;
  phone: string | null;
  website_url: string | null;
  admission_page_url: string | null;
  description: string | null;
  tuition_display: string | null;
  ranking: number | null;
  is_active: boolean;
};

type UniversityProgramListRow = {
  id: string;
  ranking_note: string | null;
  tuition_note: string | null;
  short_description: string | null;
  program_school_note: string | null;
  featured: boolean;
  universities: UniversityRelation | UniversityRelation[] | null;
};

function relationUniversity(
  value: UniversityRelation | UniversityRelation[] | null | undefined,
): UniversityRelation | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function rankingLabel(
  rankingNote: string | null,
  universityRanking: number | null,
): string {
  const note = rankingNote?.trim();
  if (note) return note;
  if (universityRanking != null) return `#${universityRanking}`;
  return "—";
}

function tuitionLabel(
  tuitionNote: string | null,
  tuitionDisplay: string | null,
): string {
  const note = tuitionNote?.trim();
  if (note) return note;
  const display = tuitionDisplay?.trim();
  if (display) return display;
  return "—";
}

export async function getProgramUniversityOfferings(
  programSlug: string,
): Promise<ProgramUniversityOffering[]> {
  const supabase = await createSupabaseServerClient();

  const { data: program, error: programError } = await supabase
    .from("programs_discovery")
    .select("id")
    .eq("slug", programSlug)
    .maybeSingle();

  if (programError) {
    console.error("[program-university-offerings] program lookup", programError);
    return [];
  }

  if (!program?.id) return [];

  const { data, error } = await supabase
    .from("university_programs")
    .select(
      `
      id,
      ranking_note,
      tuition_note,
      short_description,
      program_school_note,
      featured,
      universities (
        id,
        name,
        city,
        country_code,
        email,
        phone,
        website_url,
        admission_page_url,
        description,
        tuition_display,
        ranking,
        is_active
      )
    `,
    )
    .eq("program_id", program.id)
    .order("featured", { ascending: false });

  if (error) {
    console.error("[program-university-offerings] list", error);
    return [];
  }

  const offerings: ProgramUniversityOffering[] = [];

  for (const row of (data ?? []) as UniversityProgramListRow[]) {
    const university = relationUniversity(row.universities);
    if (!university?.is_active) continue;

    const countryCode = university.country_code.trim().toUpperCase();

    offerings.push({
      linkId: row.id,
      universityId: university.id,
      name: university.name.trim(),
      city: university.city.trim(),
      countryCode,
      countryCodeLabel: countryCodeDisplayLabel(countryCode),
      countryName: getCountryDisplayName(countryCode),
      region: getUniversityProgramRegion(countryCode),
      rankingNote: rankingLabel(row.ranking_note, university.ranking),
      tuitionNote: tuitionLabel(row.tuition_note, university.tuition_display),
      shortDescription:
        row.short_description?.trim() ||
        university.description?.trim() ||
        "",
      programSchoolNote: row.program_school_note?.trim() || "",
      featured: row.featured ?? false,
      email: university.email,
      phone: university.phone,
      websiteUrl: university.website_url,
      admissionsPageUrl: university.admission_page_url,
      detailHref: `/student/universities/${university.id}`,
    });
  }

  offerings.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return offerings;
}
