const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AdminDocumentsStatusFilter = "" | "missing" | "uploaded";

export type AdminDocumentsPageFilters = {
  q: string;
  studentQ: string;
  status: AdminDocumentsStatusFilter;
  schoolId: string;
  page: number;
  limit: number;
};

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseStatusParam(
  raw: string | string[] | undefined,
): AdminDocumentsStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (value === "missing" || value === "uploaded") return value;
  return "";
}

function parseSchoolIdParam(raw: string | string[] | undefined): string {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const trimmed = value?.trim() ?? "";
  if (!trimmed || !UUID_RE.test(trimmed)) return "";
  return trimmed;
}

export function parseAdminDocumentsSearchParams(
  sp: Record<string, string | string[] | undefined>,
): AdminDocumentsPageFilters {
  const q = typeof sp.q === "string" ? sp.q : "";
  const studentQ = typeof sp.studentQ === "string" ? sp.studentQ : "";
  const status = parseStatusParam(sp.status);
  const schoolId = parseSchoolIdParam(sp.school);
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 12)));

  return { q, studentQ, status, schoolId, page, limit };
}
