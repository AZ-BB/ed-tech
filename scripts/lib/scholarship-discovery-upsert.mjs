/**
 * Maps discovery UI scholarship objects to `scholarships` table rows for upsert.
 * Writes `discovery_payload` (full UI shape) plus core columns. Used by JSON and XLSX seed scripts.
 */

export function mapScholarshipType(type) {
  const t = String(type ?? "")
    .trim()
    .toLowerCase();
  if (t === "government") return "government";
  if (t === "university") return "university";
  if (t === "foundation") return "foundation";
  if (t === "corporate") return "corporate";
  return "other";
}

export function mapCompetition(c) {
  const raw = String(c ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (raw === "very_high" || raw === "veryhigh") return "very_high";
  if (raw === "high") return "high";
  if (raw === "low") return "low";
  if (raw === "medium") return "medium";
  return "medium";
}

/**
 * @param {Record<string, unknown> | null} rawExcel — optional raw XLSX row (snake_case keys)
 * @param {Record<string, unknown>} payload — `Scholarship`-shaped object (camelCase)
 */
export function pickNationalityCountryCode(rawExcel, payload) {
  if (rawExcel) {
    const fromEligible = String(rawExcel.eligible_nationalities ?? "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .find((code) => /^[A-Z]{2}$/.test(code));
    if (fromEligible) return fromEligible;
    const cc = String(rawExcel.country_code ?? "")
      .trim()
      .toUpperCase();
    if (/^[A-Z]{2}$/.test(cc)) return cc;
  }
  const list = payload.eligibleNationalities;
  if (Array.isArray(list)) {
    for (const entry of list) {
      const code = String(entry ?? "")
        .trim()
        .toUpperCase();
      if (/^[A-Z]{2}$/.test(code)) return code;
    }
  }
  return "SA";
}

/**
 * @param {Record<string, unknown>} payload — full discovery object (`Scholarship` shape)
 * @param {Record<string, unknown> | null} rawExcel — optional raw XLSX row
 */
export function discoveryScholarshipToDbRow(payload, rawExcel) {
  const nationality_country_code = pickNationalityCountryCode(rawExcel, payload);
  const cov = payload.coverageDetails;
  const details =
    cov && typeof cov === "object"
      ? cov
      : { tuition: null, stipend: null, travel: null, other: null };

  return {
    discovery_slug: String(payload.id ?? "").trim(),
    discovery_payload: payload,
    name: String(payload.name ?? "").trim() || "Scholarship",
    nationality_country_code,
    is_renewable: /yes/i.test(String(payload.renewable ?? "")),
    is_priority: false,
    type: mapScholarshipType(payload.type),
    competition: mapCompetition(payload.competition),
    tuition_type: payload.coverage === "partial" ? "partial" : "full",
    description: String(payload.shortSummary ?? "").trim() || null,
    target_students: String(payload.eligSummary ?? "").trim() || null,
    level: String(payload.degreeLevels ?? "").trim() || null,
    method: String(payload.applicationMethod ?? "").trim() || null,
    deadline: String(payload.deadline ?? "").trim() || null,
    tuition: String(details.tuition ?? "").trim() || null,
    travel: String(details.travel ?? "").trim() || null,
    other_benefits: String(details.other ?? "").trim() || null,
    living_stipend: String(details.stipend ?? "").trim() || null,
    academic_eligibility: String(payload.academicElig ?? "").trim() || null,
  };
}
