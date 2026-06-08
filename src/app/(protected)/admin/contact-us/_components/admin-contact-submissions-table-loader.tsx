import { fetchAdminContactSubmissionsPage } from "../_lib/fetch-admin-contact-submissions-page";
import { parseAdminContactSubmissionsSearchParams } from "../_lib/parse-admin-contact-submissions-search-params";
import { AdminContactSubmissionsTableClient } from "./admin-contact-submissions-table-client";

export async function AdminContactSubmissionsTableLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminContactSubmissionsSearchParams(sp);
  const { rows, totalRows } = await fetchAdminContactSubmissionsPage(filters);

  return (
    <AdminContactSubmissionsTableClient
      rows={rows}
      totalRows={totalRows}
      page={filters.page}
      limit={filters.limit}
      q={filters.q}
      status={filters.status}
    />
  );
}
