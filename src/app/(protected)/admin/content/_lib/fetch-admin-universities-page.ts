import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { fetchUniversityShortlistCounts } from "./fetch-university-shortlist-counts";
import type { AdminUniversitiesPageFilters } from "./parse-admin-universities-search-params";

export type AdminUniversityTableRow = {
  id: string;
  name: string;
  locationLabel: string;
  countryLabel: string;
  typeLabel: "Public" | "Private";
  tuitionLabel: string;
  isActive: boolean;
  shortlistedCount: number;
};

const DB_PAGE_SIZE = 1000;

const LIST_SELECT =
  "id, name, city, country_code, is_public, is_active, tuition_per_year, countries(name)";

const tuitionFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatTuition(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${tuitionFormatter.format(value)}/yr`;
}

function formatLocation(city: string, countryCode: string): string {
  const country = getCountryNameByAlpha2(countryCode);
  const cityTrimmed = city.trim();
  if (cityTrimmed && country) return `${cityTrimmed}, ${country}`;
  if (cityTrimmed) return cityTrimmed;
  if (country) return country;
  return "—";
}

type UniversityQueryRow = {
  id: string;
  name: string;
  city: string;
  country_code: string;
  is_public: boolean;
  is_active: boolean;
  tuition_per_year: number | null;
  countries: { name: string } | null;
};

type UniversityListFilters = Pick<
  AdminUniversitiesPageFilters,
  "q" | "country" | "status"
>;

function applyUniversityListFilters<
  T extends {
    or: (filter: string) => T;
    eq: (column: string, value: string | boolean) => T;
  },
>(query: T, { q, country, status }: UniversityListFilters): T {
  const trimmed = q.trim();
  if (trimmed) {
    const e = escapeIlike(trimmed);
    query = query.or(`name.ilike.%${e}%,city.ilike.%${e}%`);
  }

  if (country) {
    query = query.eq("country_code", country);
  }

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  return query;
}

async function countFilteredUniversities(
  filters: UniversityListFilters,
): Promise<number> {
  const supabase = await createSupabaseSecretClient();
  let query = supabase
    .from("universities")
    .select("id", { count: "exact", head: true });
  query = applyUniversityListFilters(query, filters);

  const { count, error } = await query;

  if (error) {
    console.error("[admin-content] universities count", error);
    return 0;
  }

  return count ?? 0;
}

async function fetchFilteredUniversitySortKeys(
  filters: UniversityListFilters,
): Promise<{ id: string; name: string }[]> {
  const supabase = await createSupabaseSecretClient();
  const keys: { id: string; name: string }[] = [];
  let from = 0;

  for (;;) {
    let query = supabase.from("universities").select("id, name");
    query = applyUniversityListFilters(query, filters);

    const { data, error } = await query
      .order("name", { ascending: true })
      .range(from, from + DB_PAGE_SIZE - 1);

    if (error) {
      console.error("[admin-content] universities sort keys", error);
      break;
    }

    if (!data?.length) break;

    for (const row of data) {
      keys.push({ id: row.id, name: row.name.trim() });
    }

    if (data.length < DB_PAGE_SIZE) break;
    from += DB_PAGE_SIZE;
  }

  return keys;
}

async function fetchUniversitiesByIds(
  ids: string[],
): Promise<UniversityQueryRow[]> {
  if (ids.length === 0) return [];

  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("universities")
    .select(LIST_SELECT)
    .in("id", ids);

  if (error) {
    console.error("[admin-content] universities by ids", error);
    return [];
  }

  const byId = new Map<string, UniversityQueryRow>();
  for (const row of data ?? []) {
    byId.set(row.id, row as UniversityQueryRow);
  }

  return ids
    .map((id) => byId.get(id))
    .filter((row): row is UniversityQueryRow => row != null);
}

function toTableRow(
  row: UniversityQueryRow,
  shortlistCounts: Map<string, number>,
): AdminUniversityTableRow {
  const countryLabel =
    row.countries?.name?.trim() ||
    getCountryNameByAlpha2(row.country_code) ||
    row.country_code ||
    "—";

  return {
    id: row.id,
    name: row.name.trim(),
    locationLabel: formatLocation(row.city, row.country_code),
    countryLabel,
    typeLabel: row.is_public ? "Public" : "Private",
    tuitionLabel: formatTuition(row.tuition_per_year),
    isActive: row.is_active,
    shortlistedCount: shortlistCounts.get(row.id) ?? 0,
  };
}

export async function fetchAdminUniversitiesPage(
  filters: AdminUniversitiesPageFilters,
): Promise<{ rows: AdminUniversityTableRow[]; totalRows: number }> {
  const { page, limit } = filters;
  const offset = (page - 1) * limit;

  const [totalRows, sortKeys] = await Promise.all([
    countFilteredUniversities(filters),
    fetchFilteredUniversitySortKeys(filters),
  ]);

  if (totalRows === 0 || sortKeys.length === 0) {
    return { rows: [], totalRows };
  }

  const shortlistCounts = await fetchUniversityShortlistCounts(
    sortKeys.map((row) => row.id),
  );

  const sortedKeys = [...sortKeys].sort((a, b) => {
    const aCount = shortlistCounts.get(a.id) ?? 0;
    const bCount = shortlistCounts.get(b.id) ?? 0;
    if (bCount !== aCount) return bCount - aCount;
    return a.name.localeCompare(b.name, "en");
  });

  const pageIds = sortedKeys.slice(offset, offset + limit).map((row) => row.id);
  const universities = await fetchUniversitiesByIds(pageIds);
  const rows = universities.map((row) => toTableRow(row, shortlistCounts));

  return { rows, totalRows };
}
