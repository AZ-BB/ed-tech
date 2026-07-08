export type AdminInternshipSupportRequestsPageFilters = {
  q: string;
  page: number;
  limit: number;
};

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function parseAdminInternshipSupportRequestsSearchParams(
  sp: Record<string, string | string[] | undefined>,
): AdminInternshipSupportRequestsPageFilters {
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 20)));

  return { q, page, limit };
}
