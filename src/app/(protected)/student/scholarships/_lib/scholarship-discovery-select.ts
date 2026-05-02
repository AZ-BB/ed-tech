/**
 * Columns on `scholarships` used for discovery.
 *
 * **Canonical catalog data** lives in `discovery_payload` (JSONB): the full UI
 * `Scholarship` shape. Seeds upsert that plus a subset of core columns for SQL
 * and constraints (`name`, `nationality_country_code`, etc.).
 *
 * Do not add columns here without a matching DB migration — PostgREST will
 * fail the whole select and the page will show empty.
 */
export const SCHOLARSHIPS_DISCOVERY_SELECT_BASE = [
  "id",
  "discovery_slug",
  "name",
  "nationality_country_code",
  "description",
  "target_students",
  "level",
  "fields",
  "is_renewable",
  "coverage",
  "type",
  "competition",
  "tuition_type",
  "tuition",
  "travel",
  "other_benefits",
  "living_stipend",
  "academic_eligibility",
  "method",
  "deadline",
  "city",
  "ielts_min_score",
  "toefl_min_score",
  "sat_policy",
  "documents",
  "intakes",
  "other",
  "application_fee",
  "is_priority",
  "tooltip",
  "deadline_date",
  "docuemnts",
].join(",");

export const SCHOLARSHIPS_DISCOVERY_PAYLOAD_COLUMN = "discovery_payload";

/** Single select list for one-row fetches (same shape as RPC rows). */
export const SCHOLARSHIPS_DISCOVERY_ROW_SELECT = `${SCHOLARSHIPS_DISCOVERY_SELECT_BASE},${SCHOLARSHIPS_DISCOVERY_PAYLOAD_COLUMN}`;

/**
 * Prefer payload + base (see module doc). Fall back to base-only if
 * `discovery_payload` is absent on older databases.
 */
export const SCHOLARSHIPS_DISCOVERY_SELECT_TRIES = [
  SCHOLARSHIPS_DISCOVERY_ROW_SELECT,
  SCHOLARSHIPS_DISCOVERY_SELECT_BASE,
] as const;
