export type AdminUniversityProgramsStatusFilter = "all" | "featured" | "not-featured";

export function parseAdminUniversityProgramsSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const rawPage = Number(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page);
  const rawLimit = Number(
    Array.isArray(searchParams.limit) ? searchParams.limit[0] : searchParams.limit,
  );

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit =
    Number.isFinite(rawLimit) && [10, 20, 30, 50].includes(rawLimit)
      ? rawLimit
      : 20;

  const q = String(
    Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q ?? "",
  ).trim();

  const programSlug = String(
    Array.isArray(searchParams.program)
      ? searchParams.program[0]
      : searchParams.program ?? "",
  ).trim();

  const statusRaw = String(
    Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status ?? "all",
  ).trim() as AdminUniversityProgramsStatusFilter;

  const status: AdminUniversityProgramsStatusFilter =
    statusRaw === "featured" || statusRaw === "not-featured" ? statusRaw : "all";

  return { page, limit, q, programSlug, status };
}
