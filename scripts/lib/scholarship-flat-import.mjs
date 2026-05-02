/**
 * Maps a flat snake_case row (XLSX row object or CSV record) to the payload shape
 * expected by `discoveryScholarshipToDbRow`.
 */

export function flagFromCountryCode(code) {
  const c = String(code ?? "")
    .trim()
    .toUpperCase();
  if (c.length !== 2 || !/^[A-Z]{2}$/.test(c)) return "🌐";
  const A = 0x1f1e6;
  return (
    String.fromCodePoint(A + (c.charCodeAt(0) - 65)) +
    String.fromCodePoint(A + (c.charCodeAt(1) - 65))
  );
}

export function typeToBadgeClass(type) {
  const t = String(type ?? "")
    .trim()
    .toLowerCase();
  if (t === "government") return "badge-gov";
  if (t === "university") return "badge-uni";
  if (t === "foundation") return "badge-foundation";
  if (t === "corporate") return "badge-ext";
  return "badge-gov";
}

export function parseBool(v) {
  const s = String(v ?? "").trim().toUpperCase();
  return s === "TRUE" || s === "1" || s === "YES";
}

export function splitList(v) {
  return String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function normalizeLinkStatus(v) {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (s === "verified" || s === "missing" || s === "uncertain") return s;
  return "missing";
}

function splitRequiredDocs(v) {
  const s = String(v ?? "").trim();
  if (!s) return [];
  if (s.includes(" | ")) return s.split(" | ").map((x) => x.trim()).filter(Boolean);
  return splitList(s);
}

/** Same keys as XLSX / standard CSV headers (snake_case). */
export function flatSnakeRowToPayload(r) {
  const id = String(r.id ?? "")
    .trim()
    .toLowerCase();
  if (!id) throw new Error("Row missing id");

  const nat = splitList(r.eligible_nationalities).map((x) => x.toLowerCase());
  const destinations = splitList(r.destinations);
  const requiredDocs = splitRequiredDocs(r.required_docs);

  const coverage = String(r.coverage ?? "")
    .trim()
    .toLowerCase();
  const cov =
    coverage === "partial" || coverage === "full" ? coverage : "full";

  return {
    id,
    name: String(r.name ?? "").trim(),
    provider: String(r.provider ?? "").trim(),
    country: String(r.country ?? "").trim(),
    flag: flagFromCountryCode(r.country_code),
    type: String(r.type ?? "Government").trim(),
    badgeClass: typeToBadgeClass(r.type),
    eligibleNationalities: nat.length ? nat : ["other"],
    destinations: destinations.length ? destinations : ["Global"],
    coverage: cov,
    coverageLabel: String(r.coverage_label ?? "").trim() || "Full ride",
    deadline: String(r.deadline ?? "").trim(),
    eligSummary: String(r.eligibility_summary ?? "").trim(),
    shortSummary: String(r.short_summary ?? "").trim(),
    degreeLevels: String(r.degree_levels ?? "").trim(),
    fieldsOfStudy: String(r.fields_of_study ?? "").trim(),
    academicElig: String(r.academic_eligibility ?? "").trim(),
    englishReq: String(r.english_requirement ?? "").trim(),
    otherElig: String(r.other_eligibility ?? "").trim(),
    requiredDocs,
    applicationMethod: String(r.application_method ?? "").trim(),
    coverageDetails: {
      tuition: String(r.cov_tuition ?? "").trim() || "—",
      stipend: String(r.cov_stipend ?? "").trim() || "—",
      travel: String(r.cov_travel ?? "").trim() || "—",
      other: String(r.cov_other ?? "").trim() || "—",
    },
    importantNotes: String(r.important_notes ?? "").trim(),
    competition: String(r.competition ?? "Medium").trim(),
    renewable: String(r.renewable ?? "").trim() || "—",
    applicationUrl: String(r.application_url ?? "").trim(),
    applicationWebsiteName: String(r.application_website_name ?? "").trim(),
    applicationWebsiteDomain: String(r.application_website_domain ?? "").trim(),
    isOfficialSource: parseBool(r.is_official_source),
    linkStatus: normalizeLinkStatus(r.link_status),
    linkNotes: String(r.link_notes ?? "").trim(),
    fallbackUrl: String(r.fallback_url ?? "").trim(),
  };
}
