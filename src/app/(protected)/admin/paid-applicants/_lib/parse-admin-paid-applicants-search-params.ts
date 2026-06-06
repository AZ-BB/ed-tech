export type AdminPaidApplicantsPageFilters = {
  q: string;
  schoolId: string;
  planId: string;
  page: number;
  limit: number;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseSchoolParam(raw: string | string[] | undefined): string {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !UUID_RE.test(value)) return "";
  return value;
}

function parsePlanParam(raw: string | string[] | undefined): string {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value) return "";
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return "";
  return String(n);
}

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function parseAdminPaidApplicantsSearchParams(
  sp: Record<string, string | string[] | undefined>,
): AdminPaidApplicantsPageFilters {
  const q = typeof sp.q === "string" ? sp.q : "";
  const schoolId = parseSchoolParam(sp.school);
  const planId = parsePlanParam(sp.package);
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 20)));

  return { q, schoolId, planId, page, limit };
}
