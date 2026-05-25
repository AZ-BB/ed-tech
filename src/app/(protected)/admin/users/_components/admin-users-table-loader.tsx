import { usersTabs, type UsersTabId } from "../_data/users-tabs-data";
import { fetchAdminSchoolOptions } from "../_lib/fetch-admin-school-options";
import { fetchAdminUsersPage } from "../_lib/fetch-admin-users-page";
import { parseAdminUsersSearchParams } from "../_lib/parse-admin-users-search-params";
import { AdminUsersTableClient } from "./admin-users-table-client";

export async function AdminUsersTableLoader({
  tabId,
  searchParams,
}: {
  tabId: UsersTabId;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminUsersSearchParams(sp);
  const [{ rows, totalRows }, schoolOptions] = await Promise.all([
    fetchAdminUsersPage(tabId, filters),
    tabId === "all" || tabId === "students" || tabId === "teachers"
      ? fetchAdminSchoolOptions()
      : Promise.resolve([]),
  ]);
  const tabLabel = usersTabs.find((tab) => tab.id === tabId)?.label ?? "Users";

  return (
    <AdminUsersTableClient
      tabId={tabId}
      tabLabel={tabLabel}
      rows={rows}
      totalRows={totalRows}
      page={filters.page}
      limit={filters.limit}
      q={filters.q}
      role={filters.role}
      schoolId={filters.schoolId}
      status={filters.status}
      schoolOptions={schoolOptions}
    />
  );
}
