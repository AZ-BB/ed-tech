import { usersTabs, type UsersTabId } from "../_data/users-tabs-data";
import { fetchAdminSchoolOptions } from "../_lib/fetch-admin-school-options";
import { fetchSchoolTeacherOptions } from "@/lib/fetch-school-teacher-options";
import { fetchAdminUsersPage } from "../_lib/fetch-admin-users-page";
import { parseAdminUsersSearchParams } from "../_lib/parse-admin-users-search-params";
import { AdminUsersTableClient } from "./admin-users-table-client";

export async function AdminUsersTableLoader({
  tabId,
  searchParams,
  scopedSchoolId,
  embedMode = false,
  embedTabParam,
}: {
  tabId: UsersTabId;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  scopedSchoolId?: string;
  embedMode?: boolean;
  embedTabParam?: string;
}) {
  const sp = await searchParams;
  const filters = parseAdminUsersSearchParams(sp, scopedSchoolId);
  const [{ rows, totalRows }, schoolOptions, teacherFilterOptions] =
    await Promise.all([
      fetchAdminUsersPage(tabId, filters),
      !embedMode && (tabId === "all" || tabId === "students" || tabId === "teachers")
        ? fetchAdminSchoolOptions()
        : Promise.resolve([]),
      tabId === "students" && filters.schoolId.trim()
        ? fetchSchoolTeacherOptions(filters.schoolId, { useSecretClient: true })
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
      teacher={filters.teacher}
      teacherFilterOptions={teacherFilterOptions}
      schoolOptions={schoolOptions}
      embedMode={embedMode}
      embedTabParam={embedTabParam}
    />
  );
}
