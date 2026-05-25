export type AdminSchoolsStatusFilter = "" | "active" | "inactive";

export type AdminSchoolsPageFilters = {
  q: string;
  status: AdminSchoolsStatusFilter;
  page: number;
  limit: number;
};

export const ADMIN_SCHOOLS_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

const VALID_STATUSES = new Set<string>(
  ADMIN_SCHOOLS_STATUS_FILTER_OPTIONS.map((option) => option.value).filter(Boolean),
);

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseStatusParam(
  raw: string | string[] | undefined,
): AdminSchoolsStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !VALID_STATUSES.has(value)) return "";
  return value as AdminSchoolsStatusFilter;
}

export function parseAdminSchoolsSearchParams(
  sp: Record<string, string | string[] | undefined>,
): AdminSchoolsPageFilters {
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = parseStatusParam(sp.status);
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 20)));

  return { q, status, page, limit };
}
