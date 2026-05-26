export type AdminUniversitiesStatusFilter = "" | "active" | "inactive";

export type AdminUniversitiesPageFilters = {
  q: string;
  country: string;
  status: AdminUniversitiesStatusFilter;
  page: number;
  limit: number;
};

export const ADMIN_UNIVERSITIES_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

const VALID_STATUSES = new Set<string>(
  ADMIN_UNIVERSITIES_STATUS_FILTER_OPTIONS.map((option) => option.value).filter(
    Boolean,
  ),
);

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseStatusParam(
  raw: string | string[] | undefined,
): AdminUniversitiesStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !VALID_STATUSES.has(value)) return "";
  return value as AdminUniversitiesStatusFilter;
}

export function parseAdminUniversitiesSearchParams(
  sp: Record<string, string | string[] | undefined>,
): AdminUniversitiesPageFilters {
  const q = typeof sp.q === "string" ? sp.q : "";
  const country = typeof sp.country === "string" ? sp.country : "";
  const status = parseStatusParam(sp.status);
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 20)));

  return { q, country, status, page, limit };
}
