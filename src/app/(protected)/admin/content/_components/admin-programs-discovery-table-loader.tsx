import { fetchAdminProgramDiscoveryCategoryOptions } from "../_lib/fetch-admin-programs-discovery-page";
import { fetchAdminProgramsDiscoveryPage } from "../_lib/fetch-admin-programs-discovery-page";
import { parseAdminProgramsDiscoverySearchParams } from "../_lib/parse-admin-programs-discovery-search-params";
import { AdminProgramsDiscoveryTableClient } from "./admin-programs-discovery-table-client";

export async function AdminProgramsDiscoveryTableLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseAdminProgramsDiscoverySearchParams(await searchParams);

  const [{ rows, totalRows }, categoryOptions] = await Promise.all([
    fetchAdminProgramsDiscoveryPage(filters),
    fetchAdminProgramDiscoveryCategoryOptions(),
  ]);

  return (
    <AdminProgramsDiscoveryTableClient
      rows={rows}
      totalRows={totalRows}
      page={filters.page}
      limit={filters.limit}
      q={filters.q}
      category={filters.category}
      status={filters.status}
      categoryOptions={categoryOptions}
    />
  );
}
