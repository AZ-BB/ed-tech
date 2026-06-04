import { orIlikeClause } from "@/app/(protected)/school/_lib/student-search";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AmbassadorPickerRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  university: string;
  major: string | null;
  destinationLabel: string;
  isActive: boolean;
};

type PickerQueryRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  major: string | null;
  university_name: string | null;
  destination_country_code: string;
  is_active: boolean;
  universities: { name: string } | { name: string }[] | null;
};

function ambassadorSearchOrFilter(q: string): string | null {
  const trimmed = q.trim();
  if (!trimmed) return null;

  const nameFilter = orIlikeClause(["first_name", "last_name", "email"], trimmed);
  const extra = orIlikeClause(["university_name", "major"], trimmed);
  return `${nameFilter},${extra}`;
}

function mapPickerRow(row: PickerQueryRow): AmbassadorPickerRow {
  const uniEmbed = Array.isArray(row.universities)
    ? (row.universities[0] ?? null)
    : row.universities;
  const university =
    uniEmbed?.name?.trim() || row.university_name?.trim() || "—";

  return {
    id: row.id,
    firstName: row.first_name?.trim() ?? "",
    lastName: row.last_name?.trim() ?? "",
    email: row.email?.trim() ?? "",
    university,
    major: row.major?.trim() || null,
    destinationLabel:
      getCountryNameByAlpha2(row.destination_country_code) ??
      row.destination_country_code ??
      "—",
    isActive: row.is_active,
  };
}

export async function fetchAmbassadorsForAdminPicker(filters: {
  q: string;
  page: number;
  limit: number;
}): Promise<{ rows: AmbassadorPickerRow[]; totalRows: number }> {
  const supabase = await createSupabaseSecretClient();
  const page = Math.max(1, filters.page);
  const limit = Math.min(50, Math.max(5, filters.limit));
  const offset = (page - 1) * limit;

  let query = supabase
    .from("ambassadors")
    .select(
      `
      id,
      first_name,
      last_name,
      email,
      major,
      university_name,
      destination_country_code,
      is_active,
      universities ( name )
    `,
      { count: "exact" },
    );

  const searchOr = ambassadorSearchOrFilter(filters.q);
  if (searchOr) {
    query = query.or(searchOr);
  }

  const { data, count, error } = await query
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[fetchAmbassadorsForAdminPicker]", error);
    return { rows: [], totalRows: 0 };
  }

  return {
    rows: ((data ?? []) as PickerQueryRow[]).map(mapPickerRow),
    totalRows: count ?? 0,
  };
}
