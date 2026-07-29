import { fetchAdminPaymentsPage } from "../_lib/fetch-admin-payments-page";
import { parseAdminPaymentsSearchParams } from "../_lib/parse-admin-payments-search-params";
import { AdminPaymentsTableClient } from "./admin-payments-table-client";

export async function AdminPaymentsTableLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminPaymentsSearchParams(sp);
  const { rows, totalRows } = await fetchAdminPaymentsPage(filters);

  return (
    <AdminPaymentsTableClient
      rows={rows}
      totalRows={totalRows}
      page={filters.page}
      limit={filters.limit}
      q={filters.q}
      status={filters.status}
      type={filters.type}
    />
  );
}
