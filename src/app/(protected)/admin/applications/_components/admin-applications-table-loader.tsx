import { fetchAdminApplicationsPage } from "../_lib/fetch-admin-applications-page";
import { fetchAdminApplicationsStats } from "../_lib/fetch-admin-applications-stats";
import { fetchAdminHandlerOptions } from "../_lib/fetch-admin-handler-options";
import { parseAdminApplicationsSearchParams } from "../_lib/parse-admin-applications-search-params";
import { fetchAdminSchoolOptions } from "@/app/(protected)/admin/users/_lib/fetch-admin-school-options";
import { AdminApplicationsStatsGrid } from "./admin-applications-stats-grid";
import { AdminApplicationsTableClient } from "./admin-applications-table-client";

export async function AdminApplicationsTableLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminApplicationsSearchParams(sp);

  const [stats, { rows, totalRows }, handlerOptions, schoolOptions] = await Promise.all([
    fetchAdminApplicationsStats(),
    fetchAdminApplicationsPage(filters),
    fetchAdminHandlerOptions(),
    fetchAdminSchoolOptions(),
  ]);

  return (
    <>
      <AdminApplicationsStatsGrid {...stats} />
      <AdminApplicationsTableClient
        rows={rows}
        totalRows={totalRows}
        page={filters.page}
        limit={filters.limit}
        q={filters.q}
        status={filters.status}
        assignedTo={filters.assignedTo}
        schoolId={filters.schoolId}
        handlerOptions={handlerOptions}
        schoolOptions={schoolOptions}
      />
    </>
  );
}
