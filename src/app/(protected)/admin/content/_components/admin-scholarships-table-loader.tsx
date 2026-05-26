import { fetchAdminScholarshipsPage } from "../_lib/fetch-admin-scholarships-page";
import { fetchAdminScholarshipNationalityOptions } from "../_lib/fetch-admin-scholarship-nationality-options";
import { parseAdminScholarshipsSearchParams } from "../_lib/parse-admin-scholarships-search-params";
import { AdminScholarshipsTableClient } from "./admin-scholarships-table-client";

export async function AdminScholarshipsTableLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminScholarshipsSearchParams(sp);

  const [{ rows, totalRows }, nationalityOptions] = await Promise.all([
    fetchAdminScholarshipsPage(filters),
    fetchAdminScholarshipNationalityOptions(),
  ]);

  return (
    <AdminScholarshipsTableClient
      rows={rows}
      totalRows={totalRows}
      page={filters.page}
      limit={filters.limit}
      q={filters.q}
      nationality={filters.nationality}
      status={filters.status}
      nationalityOptions={nationalityOptions}
    />
  );
}
