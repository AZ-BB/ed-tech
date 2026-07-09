export const PROGRAM_DISCOVERY_PAGE_SIZE = 12;

export type ProgramDiscoveryResolvedQuery = {
  q: string;
  category: string;
  featuredOnly: boolean;
  page: number;
  programSlug: string | null;
};

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

export function parseProgramDiscoverySearchParams(
  searchParams: Record<string, string | string[] | undefined> = {},
): ProgramDiscoveryResolvedQuery {
  const featuredRaw = firstString(searchParams.featured);

  return {
    q: firstString(searchParams.q)?.trim() ?? "",
    category: firstString(searchParams.category)?.trim() ?? "",
    featuredOnly: featuredRaw === "1" || featuredRaw === "true",
    page: parsePositiveInt(firstString(searchParams.page), 1),
    programSlug: firstString(searchParams.program)?.trim() || null,
  };
}
