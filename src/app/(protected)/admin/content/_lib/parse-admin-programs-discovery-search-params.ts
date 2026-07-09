export type AdminProgramsDiscoveryStatusFilter = "all" | "active" | "inactive";

export type AdminProgramsDiscoverySearchParams = {
  q: string;
  category: string;
  status: AdminProgramsDiscoveryStatusFilter;
  page: number;
  limit: number;
};

const DEFAULT_LIMIT = 20;

function firstString(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const value = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function parseAdminProgramsDiscoverySearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): AdminProgramsDiscoverySearchParams {
  const statusRaw = firstString(searchParams.status);
  const status: AdminProgramsDiscoveryStatusFilter =
    statusRaw === "active" || statusRaw === "inactive" ? statusRaw : "all";

  return {
    q: firstString(searchParams.q)?.trim() ?? "",
    category: firstString(searchParams.category)?.trim() ?? "",
    status,
    page: parsePositiveInt(firstString(searchParams.page), 1),
    limit: parsePositiveInt(firstString(searchParams.limit), DEFAULT_LIMIT),
  };
}
