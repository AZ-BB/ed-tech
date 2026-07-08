import { fetchAdminInternshipSupportRequestsPage } from "../../../_lib/fetch-admin-internship-support-requests-page";
import { parseAdminInternshipSupportRequestsSearchParams } from "../../../_lib/parse-admin-internship-support-requests-search-params";
import { AdminInternshipSupportRequestsTableClient } from "./admin-internship-support-requests-table-client";

export async function AdminInternshipSupportRequestsTableLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminInternshipSupportRequestsSearchParams(sp);
  const { rows, totalRows } =
    await fetchAdminInternshipSupportRequestsPage(filters);

  return (
    <AdminInternshipSupportRequestsTableClient
      rows={rows}
      totalRows={totalRows}
      page={filters.page}
      limit={filters.limit}
      q={filters.q}
    />
  );
}
