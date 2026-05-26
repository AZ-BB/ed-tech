import { fetchAdminUniversitiesPage } from "../_lib/fetch-admin-universities-page";
import { fetchAdminUniversityCountryOptions } from "../_lib/fetch-admin-university-country-options";
import { parseAdminUniversitiesSearchParams } from "../_lib/parse-admin-universities-search-params";
import { AdminUniversitiesTableClient } from "./admin-universities-table-client";

export async function AdminUniversitiesTableLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminUniversitiesSearchParams(sp);

  const [{ rows, totalRows }, countryOptions] = await Promise.all([
    fetchAdminUniversitiesPage(filters),
    fetchAdminUniversityCountryOptions(),
  ]);

  return (
    <AdminUniversitiesTableClient
      rows={rows}
      totalRows={totalRows}
      page={filters.page}
      limit={filters.limit}
      q={filters.q}
      country={filters.country}
      status={filters.status}
      countryOptions={countryOptions}
    />
  );
}
