export const ADMIN_USERS_HOME = "/admin/users";

export type UsersTabId =
  | "all"
  | "students"
  | "teachers"
  | "advisors"
  | "ambassadors"
  | "admins"
  | "handlers";

export type UsersTabCounts = Record<UsersTabId, number>;

export type UsersHeaderAction = {
  id: string;
  label: string;
  variant: "default" | "primary";
  icon: "export" | "import" | "add" | "download";
};

export type UsersTab = {
  id: UsersTabId;
  label: string;
  href: string;
};

export const usersTabs: readonly UsersTab[] = [
  { id: "all", label: "All Users", href: ADMIN_USERS_HOME },
  { id: "students", label: "Students", href: `${ADMIN_USERS_HOME}/students` },
  { id: "teachers", label: "Teachers", href: `${ADMIN_USERS_HOME}/teachers` },
  { id: "advisors", label: "Advisors", href: `${ADMIN_USERS_HOME}/advisors` },
  {
    id: "ambassadors",
    label: "Ambassadors",
    href: `${ADMIN_USERS_HOME}/ambassadors`,
  },
  { id: "admins", label: "Admins", href: `${ADMIN_USERS_HOME}/admins` },
  { id: "handlers", label: "Handlers", href: `${ADMIN_USERS_HOME}/handlers` },
];

function normalizePath(pathname: string) {
  return pathname.replace(/\/$/, "") || "/";
}

export function isAdminUsersPath(pathname: string): boolean {
  const n = normalizePath(pathname);
  return n === ADMIN_USERS_HOME || n.startsWith(`${ADMIN_USERS_HOME}/`);
}

const ADMIN_USER_DETAIL_SEGMENT = new Set<UsersTabId>([
  "students",
  "teachers",
  "advisors",
  "ambassadors",
  "admins",
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** e.g. /admin/users/students/{uuid} — hide list chrome (tabs, header actions). */
export function isAdminUserDetailPath(pathname: string): boolean {
  const n = normalizePath(pathname);
  if (!n.startsWith(`${ADMIN_USERS_HOME}/`)) return false;

  const rest = n.slice(`${ADMIN_USERS_HOME}/`.length);
  const [segment, id] = rest.split("/");
  if (!segment || !id || rest.split("/").length !== 2) return false;
  if (!ADMIN_USER_DETAIL_SEGMENT.has(segment as UsersTabId)) return false;

  return UUID_RE.test(id);
}

export function getUsersTabFromPath(pathname: string): UsersTabId {
  const n = normalizePath(pathname);
  if (n === ADMIN_USERS_HOME) return "all";

  const segment = n.slice(`${ADMIN_USERS_HOME}/`.length).split("/")[0];
  const match = usersTabs.find((tab) => tab.id === segment);
  return match?.id ?? "all";
}

export function getUsersHeaderActions(tabId: UsersTabId): UsersHeaderAction[] {
  switch (tabId) {
    case "all":
      return [{ id: "export", label: "Export", variant: "default", icon: "export" }];
    case "students":
      return [
        { id: "export", label: "Export", variant: "default", icon: "export" },
        {
          id: "download-sample",
          label: "Download Sample",
          variant: "default",
          icon: "download",
        },
        {
          id: "bulk-import",
          label: "Bulk Import",
          variant: "default",
          icon: "import",
        },
        {
          id: "add-student",
          label: "Add Student",
          variant: "primary",
          icon: "add",
        },
      ];
    case "teachers":
      return [
        { id: "export", label: "Export", variant: "default", icon: "export" },
        {
          id: "add-teacher",
          label: "Add Teacher",
          variant: "primary",
          icon: "add",
        },
      ];
    case "advisors":
      return [
        { id: "export", label: "Export", variant: "default", icon: "export" },
        {
          id: "download-sample",
          label: "Download Sample",
          variant: "default",
          icon: "download",
        },
        {
          id: "bulk-import",
          label: "Bulk Import",
          variant: "default",
          icon: "import",
        },
        {
          id: "add-advisor",
          label: "Add Advisor",
          variant: "primary",
          icon: "add",
        },
      ];
    case "ambassadors":
      return [
        { id: "export", label: "Export", variant: "default", icon: "export" },
        {
          id: "download-sample",
          label: "Download Sample",
          variant: "default",
          icon: "download",
        },
        {
          id: "bulk-import",
          label: "Bulk Import",
          variant: "default",
          icon: "import",
        },
        {
          id: "add-ambassador",
          label: "Add Ambassador",
          variant: "primary",
          icon: "add",
        },
      ];
    case "admins":
      return [
        { id: "export", label: "Export", variant: "default", icon: "export" },
        {
          id: "add-admin",
          label: "Add Admin",
          variant: "primary",
          icon: "add",
        },
      ];
    case "handlers":
      return [
        {
          id: "add-handler",
          label: "Add Handler",
          variant: "primary",
          icon: "add",
        },
      ];
  }
}
