import {
  fetchAdminEventCountryOptions,
  fetchAdminEventTypeOptions,
  fetchAdminEventsPage,
} from "../_lib/fetch-admin-events-page";
import { parseAdminEventsSearchParams } from "../_lib/parse-admin-events-search-params";
import { AdminEventsTableClient } from "./admin-events-table-client";

export async function AdminEventsTableLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminEventsSearchParams(sp);

  const [{ rows, totalRows }, eventTypeOptions, countryOptions] =
    await Promise.all([
      fetchAdminEventsPage(filters),
      fetchAdminEventTypeOptions(),
      fetchAdminEventCountryOptions(),
    ]);

  return (
    <AdminEventsTableClient
      rows={rows}
      totalRows={totalRows}
      page={filters.page}
      limit={filters.limit}
      q={filters.q}
      eventType={filters.eventType}
      country={filters.country}
      mode={filters.mode}
      status={filters.status}
      eventTypeOptions={eventTypeOptions}
      countryOptions={countryOptions}
    />
  );
}
