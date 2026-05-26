export type AdminScholarshipDetailTab = "overview" | "saved" | "shortlisted";

export type AdminScholarshipDetailSearchParams = {
  tab: AdminScholarshipDetailTab;
  studentsPage: number;
  studentsLimit: number;
};

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseTab(raw: string | string[] | undefined): AdminScholarshipDetailTab {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (value === "saved" || value === "shortlisted") return value;
  return "overview";
}

export function parseAdminScholarshipDetailSearchParams(
  sp: Record<string, string | string[] | undefined>,
): AdminScholarshipDetailSearchParams {
  return {
    tab: parseTab(sp.tab),
    studentsPage: Math.max(1, parseIntParam(sp.studentsPage, 1)),
    studentsLimit: Math.min(50, Math.max(5, parseIntParam(sp.studentsLimit, 20))),
  };
}
