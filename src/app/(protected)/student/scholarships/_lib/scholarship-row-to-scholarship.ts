import { flagFromCountryCode } from "@/lib/country-flag-emoji";

import type { Scholarship } from "../_components/types";

function formatFieldsColumn(fields: unknown): string {
  if (fields == null) return "";
  if (typeof fields === "string") return fields.trim();
  try {
    return JSON.stringify(fields);
  } catch {
    return "";
  }
}

/**
 * Row from `scholarships` discovery select: core columns from init + migrations,
 * plus optional `discovery_payload` (canonical UI object).
 */
export type ScholarshipDiscoveryRow = {
  id: string;
  discovery_slug: string | null;
  name: string;
  nationality_country_code: string;
  is_renewable: boolean;
  description: string | null;
  target_students: string | null;
  level: string | null;
  fields: unknown;
  coverage: string | null;
  type: string | null;
  competition: string | null;
  tuition: string | null;
  travel: string | null;
  other_benefits: string | null;
  living_stipend: string | null;
  academic_eligibility: string | null;
  method: string | null;
  deadline: string | null;
  tuition_type: string | null;
  discovery_payload?: unknown;
};

function typeToBadgeClass(type: string | null | undefined): string {
  const t = String(type ?? "")
    .trim()
    .toLowerCase();
  if (t === "government") return "badge-gov";
  if (t === "university") return "badge-uni";
  if (t === "foundation") return "badge-foundation";
  if (t === "corporate") return "badge-ext";
  return "badge-gov";
}

function formatTypeLabel(type: string | null | undefined): string {
  const t = String(type ?? "")
    .trim()
    .toLowerCase();
  if (!t) return "Other";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function coverageFromRow(
  coverage: string | null | undefined,
): "full" | "partial" {
  const v = String(coverage ?? "")
    .trim()
    .toLowerCase();
  return v === "partial" ? "partial" : "full";
}

/**
 * Fallback when `discovery_payload` is null: build a minimal `Scholarship` from
 * core `scholarships` columns only (legacy or incomplete rows).
 */
export function scholarshipDiscoveryRowToScholarship(
  row: ScholarshipDiscoveryRow,
): Scholarship {
  const slug = row.discovery_slug?.trim() || row.id;
  const code = row.nationality_country_code?.trim().toLowerCase();
  const eligibleNationalities = code ? [code] : ["other"];

  return {
    id: slug,
    name: row.name,
    provider: "",
    country: "",
    flag: flagFromCountryCode(row.nationality_country_code),
    type: formatTypeLabel(row.type),
    badgeClass: typeToBadgeClass(row.type),
    eligibleNationalities,
    destinations: ["Global"],
    coverage: coverageFromRow(row.coverage),
    coverageLabel: "Full ride",
    deadline: row.deadline ?? "",
    eligSummary: row.target_students ?? "",
    shortSummary: row.description ?? "",
    degreeLevels: row.level ?? "",
    fieldsOfStudy: formatFieldsColumn(row.fields),
    academicElig: row.academic_eligibility ?? "",
    englishReq: "",
    otherElig: "",
    requiredDocs: ["—"],
    applicationMethod: row.method ?? "",
    coverageDetails: {
      tuition: row.tuition?.trim() || "—",
      stipend: row.living_stipend?.trim() || "—",
      travel: row.travel?.trim() || "—",
      other: row.other_benefits?.trim() || "—",
    },
    importantNotes: "",
    competition: row.competition
      ? String(row.competition)
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : "Medium",
    renewable: row.is_renewable ? "Yes" : "No",
    applicationUrl: "",
    applicationWebsiteName: "",
    applicationWebsiteDomain: "",
    isOfficialSource: false,
    linkStatus: "missing",
    linkNotes: "",
    fallbackUrl: "",
  };
}

/** Map `discovery_payload` (full UI shape) to `Scholarship`. */
export function scholarshipFromPayloadRow(row: {
  id: string;
  discovery_slug: string | null;
  discovery_payload: Record<string, unknown> | null;
}): Scholarship | null {
  if (!row.discovery_payload || typeof row.discovery_payload !== "object")
    return null;
  const payload = row.discovery_payload;
  const id =
    typeof payload.id === "string" && payload.id.length > 0
      ? payload.id
      : (row.discovery_slug ?? row.id);
  return { ...payload, id } as Scholarship;
}

/** Stable UI id for a scholarship row (matches `Scholarship.id` from discovery). */
export function discoveryUiIdFromScholarshipRow(row: {
  id: string;
  discovery_slug: string | null;
  discovery_payload?: unknown;
}): string {
  if (row.discovery_payload && typeof row.discovery_payload === "object") {
    const p = row.discovery_payload as Record<string, unknown>;
    const pid = typeof p.id === "string" ? p.id.trim() : "";
    if (pid) return pid;
  }
  const slug = row.discovery_slug?.trim();
  if (slug) return slug;
  return row.id;
}
