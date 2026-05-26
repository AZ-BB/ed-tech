export type AdminUniversityDetailTab = "overview" | "shortlisted" | "favorites";

export type AdminUniversityDetailSearchParams = {
  tab: AdminUniversityDetailTab;
  studentsPage: number;
  studentsLimit: number;
};

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseTab(raw: string | string[] | undefined): AdminUniversityDetailTab {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (value === "shortlisted" || value === "favorites") return value;
  return "overview";
}

export function parseAdminUniversityDetailSearchParams(
  sp: Record<string, string | string[] | undefined>,
): AdminUniversityDetailSearchParams {
  return {
    tab: parseTab(sp.tab),
    studentsPage: Math.max(1, parseIntParam(sp.studentsPage, 1)),
    studentsLimit: Math.min(50, Math.max(5, parseIntParam(sp.studentsLimit, 20))),
  };
}
