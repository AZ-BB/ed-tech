import { fetchAdminActivityLogPage } from "../_lib/fetch-admin-activity-log-page";
import { parseAdminActivityLogSearchParams } from "../_lib/parse-admin-activity-log-search-params";
import { AdminActivityLogTableClient } from "./admin-activity-log-table-client";

export async function AdminActivityLogTableLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminActivityLogSearchParams(sp);
  const { rows, totalRows, actionOptions, entityTypeOptions } =
    await fetchAdminActivityLogPage(filters);

  return (
    <AdminActivityLogTableClient
      rows={rows}
      totalRows={totalRows}
      page={filters.page}
      limit={filters.limit}
      q={filters.q}
      action={filters.action}
      entityType={filters.entityType}
      actorType={filters.actorType}
      actionOptions={actionOptions}
      entityTypeOptions={entityTypeOptions}
    />
  );
}
