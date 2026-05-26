import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { fetchScholarshipActivityCounts } from "./fetch-scholarship-activity-counts";
import type { AdminScholarshipsPageFilters } from "./parse-admin-scholarships-search-params";

type ScholarshipType = Database["public"]["Enums"]["scholarship_type"];

export type AdminScholarshipTableRow = {
  id: string;
  name: string;
  typeLabel: string;
  nationalityLabel: string;
  destinationsLabel: string;
  deadlineLabel: string;
  isActive: boolean;
  savedCount: number;
};

const TYPE_LABELS: Record<ScholarshipType, string> = {
  government: "Government",
  university: "University",
  corporate: "Corporate",
  foundation: "Foundation",
  other: "Other",
};

function formatType(type: ScholarshipType | null): string {
  if (!type) return "—";
  return TYPE_LABELS[type] ?? type;
}

function formatDeadline(deadline: string | null, deadlineDate: string | null): string {
  const text = deadline?.trim();
  if (text) return text;
  if (deadlineDate) return deadlineDate;
  return "—";
}

type DestinationRow = {
  country_code: string;
  countries: { name: string } | null;
};

type ScholarshipQueryRow = {
  id: string;
  name: string;
  type: ScholarshipType | null;
  nationality_country_code: string;
  is_active: boolean;
  deadline: string | null;
  deadline_date: string | null;
  discovery_payload: unknown;
  countries: { name: string } | null;
  scholarship_destinations: DestinationRow[] | null;
};

function destinationNamesFromPayload(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const destinations = (payload as { destinations?: unknown }).destinations;
  if (!Array.isArray(destinations)) return [];
  return destinations
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function formatDestinationsLabel(names: string[]): string {
  if (names.length === 0) return "—";
  return names.join(", ");
}

export async function fetchAdminScholarshipsPage(
  filters: AdminScholarshipsPageFilters,
): Promise<{ rows: AdminScholarshipTableRow[]; totalRows: number }> {
  const supabase = await createSupabaseSecretClient();
  const { q, nationality, status, page, limit } = filters;
  const offset = (page - 1) * limit;

  let query = supabase.from("scholarships").select(
    `id, name, type, nationality_country_code, is_active, deadline, deadline_date, discovery_payload,
     countries(name),
     scholarship_destinations(country_code, countries(name))`,
  );

  const trimmed = q.trim();
  if (trimmed) {
    const e = escapeIlike(trimmed);
    query = query.or(`name.ilike.%${e}%,description.ilike.%${e}%`);
  }

  if (nationality) {
    query = query.eq("nationality_country_code", nationality);
  }

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin-content] scholarships page", error);
    return { rows: [], totalRows: 0 };
  }

  const scholarships = data ?? [];
  const savedCounts = await fetchScholarshipActivityCounts(
    scholarships.map((row) => row.id),
    "save",
  );

  const rows: AdminScholarshipTableRow[] = scholarships.map((row) => {
    const typed = row as ScholarshipQueryRow;
    const nationalityLabel =
      typed.countries?.name?.trim() ||
      getCountryNameByAlpha2(typed.nationality_country_code) ||
      typed.nationality_country_code ||
      "—";

    const destinationNamesFromTable =
      typed.scholarship_destinations
        ?.map(
          (d) =>
            d.countries?.name?.trim() ||
            getCountryNameByAlpha2(d.country_code) ||
            d.country_code?.trim(),
        )
        .filter((n): n is string => Boolean(n)) ?? [];

    const destinationNames =
      destinationNamesFromTable.length > 0
        ? destinationNamesFromTable
        : destinationNamesFromPayload(typed.discovery_payload);

    const destinationsLabel = formatDestinationsLabel(destinationNames);

    return {
      id: typed.id,
      name: typed.name.trim(),
      typeLabel: formatType(typed.type),
      nationalityLabel,
      destinationsLabel,
      deadlineLabel: formatDeadline(typed.deadline, typed.deadline_date),
      isActive: typed.is_active,
      savedCount: savedCounts.get(typed.id) ?? 0,
    };
  });

  rows.sort((a, b) => {
    if (b.savedCount !== a.savedCount) {
      return b.savedCount - a.savedCount;
    }
    return a.name.localeCompare(b.name, "en");
  });

  const totalRows = rows.length;
  const pagedRows = rows.slice(offset, offset + limit);

  return { rows: pagedRows, totalRows };
}
