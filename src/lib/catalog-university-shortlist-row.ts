import type { Database } from "@/database.types";
import { APPLICATION_METHOD_OPTIONS } from "@/app/(protected)/student/my-applications/_lib/my-applications-defaults";

export type CatalogUniversityShortlistEmbed = {
  id: string;
  name: string;
  country_code: string;
  method: string | null;
  deadline_date: string | null;
  countries: { name: string } | null;
};

export function resolveApplicationMethodFromCatalog(
  catalogMethod: string | null,
): string {
  const m = catalogMethod?.trim() ?? "";
  if (m && (APPLICATION_METHOD_OPTIONS as readonly string[]).includes(m)) {
    return m;
  }
  return "Direct application via university website";
}

export function catalogDeadlineToApplicationYmd(
  value: string | null,
): string | null {
  if (!value?.trim()) return null;
  const s = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  try {
    const d = new Date(s.includes("T") ? s : `${s}T12:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return null;
  }
}

export function buildShortlistInsertFromCatalogUniversity(args: {
  studentId: string;
  uni: CatalogUniversityShortlistEmbed;
  sortOrder: number;
}): Database["public"]["Tables"]["student_shortlist_universities"]["Insert"] {
  const { studentId, uni, sortOrder } = args;
  const countryLabel =
    uni.countries?.name?.trim() || uni.country_code || "";
  return {
    student_id: studentId,
    university_name: uni.name,
    country: countryLabel || null,
    major_program: "Undecided",
    application_method: resolveApplicationMethodFromCatalog(uni.method),
    application_deadline: catalogDeadlineToApplicationYmd(uni.deadline_date),
    status: "considering",
    decision: null,
    sort_order: sortOrder,
    catalog_university_id: uni.id,
  };
}
