import { fetchAdminSchoolsPage } from "../_lib/fetch-admin-schools-page";
import { fetchAdminSchoolsStats } from "../_lib/fetch-admin-schools-stats";
import { parseAdminSchoolsSearchParams } from "../_lib/parse-admin-schools-search-params";
import { AdminSchoolsStatsGrid } from "./admin-schools-stats-grid";
import { AdminSchoolsTableClient } from "./admin-schools-table-client";

export async function AdminSchoolsTableLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminSchoolsSearchParams(sp);

  const [stats, { rows, totalRows }] = await Promise.all([
    fetchAdminSchoolsStats(),
    fetchAdminSchoolsPage(filters),
  ]);

  return (
    <>
      <AdminSchoolsStatsGrid {...stats} />
      <AdminSchoolsTableClient
        rows={rows}
        totalRows={totalRows}
        page={filters.page}
        limit={filters.limit}
        q={filters.q}
        status={filters.status}
      />
    </>
  );
}
