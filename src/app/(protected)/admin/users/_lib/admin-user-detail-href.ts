import type { UsersTabId } from "../_data/users-tabs-data";
import type { AdminUserTableRow } from "./fetch-admin-users-page";

function hrefFromRoleSegment(
  segment: "students" | "teachers" | "advisors" | "ambassadors" | "admins",
  id: string,
): string {
  return `/admin/users/${segment}/${id}`;
}

function hrefFromDisplayRole(row: AdminUserTableRow): string | null {
  switch (row.role) {
    case "Student":
      return hrefFromRoleSegment("students", row.id);
    case "Teacher":
      return hrefFromRoleSegment("teachers", row.id);
    case "Advisor":
      return hrefFromRoleSegment("advisors", row.id);
    case "Ambassador":
      return hrefFromRoleSegment("ambassadors", row.id);
    case "Admin":
    case "Super Admin":
    case "Moderator":
      return hrefFromRoleSegment("admins", row.id);
    default:
      return null;
  }
}

export function getAdminUserDetailHref(
  row: AdminUserTableRow,
  tabId: UsersTabId,
): string | null {
  if (tabId === "all") {
    return hrefFromDisplayRole(row);
  }

  if (
    tabId === "students" ||
    tabId === "teachers" ||
    tabId === "advisors" ||
    tabId === "ambassadors" ||
    tabId === "admins"
  ) {
    return hrefFromRoleSegment(tabId, row.id);
  }

  return null;
}
