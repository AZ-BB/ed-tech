import { fetchAdminSchoolOptions } from "@/app/(protected)/admin/users/_lib/fetch-admin-school-options";

import { AdminAmbassadorSpecificRequestsTableClient } from "./_components/admin-ambassador-specific-requests-table-client";
import { fetchAdminAmbassadorSpecificRequestsPage } from "./_lib/fetch-admin-ambassador-specific-requests-page";
import { parseAdminAmbassadorSpecificRequestsSearchParams } from "./_lib/parse-admin-ambassador-specific-requests-search-params";

export default async function AdminAmbassadorSpecificRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminAmbassadorSpecificRequestsSearchParams(sp);

  const [{ rows, totalRows }, schoolOptions] = await Promise.all([
    fetchAdminAmbassadorSpecificRequestsPage(filters),
    fetchAdminSchoolOptions(),
  ]);

  return (
    <AdminAmbassadorSpecificRequestsTableClient
      rows={rows}
      totalRows={totalRows}
      page={filters.page}
      limit={filters.limit}
      q={filters.q}
      status={filters.status}
      schoolId={filters.schoolId}
      schoolOptions={schoolOptions}
    />
  );
}
