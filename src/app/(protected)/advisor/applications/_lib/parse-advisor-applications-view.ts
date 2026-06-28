export type AdvisorApplicationsView = "applications" | "universities";

export function parseAdvisorApplicationsView(
  raw: string | string[] | undefined,
): AdvisorApplicationsView {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (s === "universities") return "universities";
  return "applications";
}

export function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}
