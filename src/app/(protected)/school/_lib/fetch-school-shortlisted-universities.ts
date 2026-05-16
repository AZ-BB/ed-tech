import { createSupabaseServerClient } from "@/utils/supabase-server";

const STUDENT_CHUNK = 150;

export type SchoolShortlistedUniversity = {
  id: string;
  name: string;
  country: string | null;
};

export type SchoolShortlistRankedUniversity = {
  label: string;
  count: number;
};

export type SchoolShortlistStats = {
  shortlistedUniversities: SchoolShortlistedUniversity[];
  topPopularUniversities: SchoolShortlistRankedUniversity[];
};

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type UniEmbed = {
  id: string;
  name: string;
  countries: { name: string } | { name: string }[] | null;
};

type CountEntry = SchoolShortlistedUniversity & { count: number };

function countryFromEmbed(
  countries: UniEmbed["countries"],
): string | null {
  if (!countries) return null;
  const row = Array.isArray(countries) ? countries[0] : countries;
  const name = row?.name?.trim();
  return name || null;
}

function uniKey(id: string | null, name: string): string | null {
  const trimmedName = name.trim();
  if (!trimmedName) return null;
  return id ?? `name:${trimmedName.toLowerCase()}`;
}

function recordShortlist(
  map: Map<string, CountEntry>,
  id: string | null,
  name: string,
  country: string | null,
) {
  const key = uniKey(id, name);
  if (!key) return;

  const trimmedName = name.trim();
  const existing = map.get(key);
  if (existing) {
    existing.count += 1;
    if (!existing.country && country) existing.country = country;
    return;
  }

  map.set(key, {
    id: id ?? key,
    name: trimmedName,
    country: country?.trim() || null,
    count: 1,
  });
}

async function fetchDiscoveryShortlists(
  supabase: SupabaseServer,
  schoolStudentIds: string[],
  map: Map<string, CountEntry>,
) {
  for (let i = 0; i < schoolStudentIds.length; i += STUDENT_CHUNK) {
    const chunk = schoolStudentIds.slice(i, i + STUDENT_CHUNK);
    if (!chunk.length) continue;

    const { data, error } = await supabase
      .from("student_activities")
      .select("uni_id, universities(id, name, countries(name))")
      .in("student_id", chunk)
      .eq("type", "shortlist")
      .eq("entity_type", "university")
      .not("uni_id", "is", null);

    if (error) {
      console.error(
        "[fetchSchoolShortlistedUniversities] discovery:",
        error.message,
      );
      continue;
    }

    for (const row of data ?? []) {
      const uniId = row.uni_id;
      const embed = row.universities as UniEmbed | UniEmbed[] | null;
      const uni = Array.isArray(embed) ? embed[0] : embed;
      if (uni?.name) {
        recordShortlist(
          map,
          uni.id ?? uniId,
          uni.name,
          countryFromEmbed(uni.countries),
        );
      } else if (uniId) {
        recordShortlist(map, uniId, uniId, null);
      }
    }
  }
}

async function fetchApplicationShortlists(
  supabase: SupabaseServer,
  schoolStudentIds: string[],
  map: Map<string, CountEntry>,
) {
  for (let i = 0; i < schoolStudentIds.length; i += STUDENT_CHUNK) {
    const chunk = schoolStudentIds.slice(i, i + STUDENT_CHUNK);
    if (!chunk.length) continue;

    const { data, error } = await supabase
      .from("student_shortlist_universities")
      .select(
        "catalog_university_id, university_name, country, universities(id, name, countries(name))",
      )
      .in("student_id", chunk);

    if (error) {
      console.error(
        "[fetchSchoolShortlistedUniversities] application:",
        error.message,
      );
      continue;
    }

    for (const row of data ?? []) {
      const embed = row.universities as UniEmbed | UniEmbed[] | null;
      const uni = Array.isArray(embed) ? embed[0] : embed;
      if (row.catalog_university_id && uni?.name) {
        recordShortlist(
          map,
          uni.id ?? row.catalog_university_id,
          uni.name,
          countryFromEmbed(uni.countries) ?? row.country?.trim() ?? null,
        );
      } else {
        const name = row.university_name?.trim() ?? "";
        const country = row.country?.trim() ?? null;
        recordShortlist(map, row.catalog_university_id, name, country);
      }
    }
  }
}

async function buildShortlistCountMap(
  supabase: SupabaseServer,
  schoolStudentIds: string[],
): Promise<Map<string, CountEntry>> {
  const map = new Map<string, CountEntry>();
  if (!schoolStudentIds.length) return map;

  await Promise.all([
    fetchDiscoveryShortlists(supabase, schoolStudentIds, map),
    fetchApplicationShortlists(supabase, schoolStudentIds, map),
  ]);

  return map;
}

export async function fetchSchoolShortlistStats(
  supabase: SupabaseServer,
  schoolStudentIds: string[],
  topN = 6,
): Promise<SchoolShortlistStats> {
  const map = await buildShortlistCountMap(supabase, schoolStudentIds);
  const entries = [...map.values()];

  const shortlistedUniversities: SchoolShortlistedUniversity[] = entries
    .map(({ id, name, country }) => ({ id, name, country }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );

  const topPopularUniversities: SchoolShortlistRankedUniversity[] = entries
    .map(({ name, count }) => ({ label: name, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
    })
    .slice(0, Math.max(1, topN));

  return { shortlistedUniversities, topPopularUniversities };
}
