export type AdminPaidApplicantsPageFilters = {
  search: string;
  page: number;
  limit: number;
};

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function parseAdminPaidApplicantsSearchParams(
  sp: Record<string, string | string[] | undefined>,
): AdminPaidApplicantsPageFilters {
  const search =
    typeof sp.search === "string"
      ? sp.search.trim()
      : Array.isArray(sp.search)
        ? (sp.search[0]?.trim() ?? "")
        : "";
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 20)));

  return { search, page, limit };
}
