export type AdminAmbassadorSpecificRequestStatusFilter = "" | "pending";

export type AdminAmbassadorSpecificRequestsPageFilters = {
  q: string;
  status: AdminAmbassadorSpecificRequestStatusFilter;
  schoolId: string;
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

function parseStatusParam(
  raw: string | string[] | undefined,
): AdminAmbassadorSpecificRequestStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (value === "pending") return "pending";
  return "";
}

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function parseAdminAmbassadorSpecificRequestsSearchParams(
  sp: Record<string, string | string[] | undefined>,
): AdminAmbassadorSpecificRequestsPageFilters {
  const q = typeof sp.q === "string" ? sp.q : "";
  const schoolId = parseSchoolParam(sp.school);
  const status = parseStatusParam(sp.status);
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 20)));

  return { q, status, schoolId, page, limit };
}

export const ADMIN_AMBASSADOR_SPECIFIC_REQUEST_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
] as const;
