import { fetchAdminInternshipsPage } from "../_lib/fetch-admin-internships-page";
import { fetchAdminInternshipCountryOptions } from "../_lib/fetch-admin-internship-country-options";
import { parseAdminInternshipsSearchParams } from "../_lib/parse-admin-internships-search-params";
import { AdminInternshipsTableClient } from "./admin-internships-table-client";

export async function AdminInternshipsTableLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminInternshipsSearchParams(sp);

  const [{ rows, totalRows }, countryOptions] = await Promise.all([
    fetchAdminInternshipsPage(filters),
    fetchAdminInternshipCountryOptions(),
  ]);

  return (
    <AdminInternshipsTableClient
      rows={rows}
      totalRows={totalRows}
      page={filters.page}
      limit={filters.limit}
      q={filters.q}
      section={filters.section}
      country={filters.country}
      format={filters.format}
      payTier={filters.payTier}
      status={filters.status}
      countryOptions={countryOptions}
    />
  );
}
