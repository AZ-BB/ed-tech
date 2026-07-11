import { fetchAdminApplicationsPage } from "../_lib/fetch-admin-applications-page";
import { fetchAdminApplicationsStats } from "../_lib/fetch-admin-applications-stats";
import { fetchAdminApplicationAdminOptions } from "../_lib/fetch-admin-application-admin-options";
import { fetchAdminApplicationAdvisorOptions } from "../_lib/fetch-admin-application-advisor-options";
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

  const [stats, { rows, totalRows }, advisorOptions, schoolOptions] = await Promise.all([
    fetchAdminApplicationsStats(),
    fetchAdminApplicationsPage(filters),
    fetchAdminApplicationAdvisorOptions(),
    fetchAdminSchoolOptions(),
  ]);

  const assignedAdminIds = rows
    .filter(
      (row): row is Extract<typeof row, { kind: "application_support" }> =>
        row.kind === "application_support" &&
        row.assigneeKind === "admin" &&
        Boolean(row.assigneeId),
    )
    .map((row) => row.assigneeId as string);

  const adminOptions = await fetchAdminApplicationAdminOptions({
    includeAdminIds: assignedAdminIds,
  });

  return (
    <>
      <AdminApplicationsStatsGrid {...stats} />
      <AdminApplicationsTableClient
        rows={rows}
        totalRows={totalRows}
        page={filters.page}
        limit={filters.limit}
        q={filters.q}
        type={filters.type}
        status={filters.status}
        assignedTo={filters.assignedTo}
        schoolId={filters.schoolId}
        advisorOptions={advisorOptions}
        adminOptions={adminOptions}
        schoolOptions={schoolOptions}
      />
    </>
  );
}
