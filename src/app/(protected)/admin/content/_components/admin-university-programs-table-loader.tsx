import {
  fetchAdminProgramDiscoveryOptions,
  fetchAdminUniversityProgramsPage,
} from "../_lib/fetch-admin-university-programs-page";
import { parseAdminUniversityProgramsSearchParams } from "../_lib/parse-admin-university-programs-search-params";
import { AdminUniversityProgramsTableClient } from "./admin-university-programs-table-client";

export async function AdminUniversityProgramsTableLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseAdminUniversityProgramsSearchParams(await searchParams);

  const [{ rows, totalRows }, programOptions] = await Promise.all([
    fetchAdminUniversityProgramsPage(filters),
    fetchAdminProgramDiscoveryOptions(),
  ]);

  return (
    <AdminUniversityProgramsTableClient
      rows={rows}
      totalRows={totalRows}
      page={filters.page}
      limit={filters.limit}
      q={filters.q}
      programSlug={filters.programSlug}
      status={filters.status}
      programOptions={programOptions}
    />
  );
}
