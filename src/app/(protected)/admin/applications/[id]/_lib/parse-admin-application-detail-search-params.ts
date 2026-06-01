export const ADMIN_APPLICATION_DETAIL_TABS = [
  "intake",
  "profile",
  "documents",
  "notes",
  "activity",
] as const;

export type AdminApplicationDetailTab =
  (typeof ADMIN_APPLICATION_DETAIL_TABS)[number];

export function parseAdminApplicationDetailTab(
  raw: string | string[] | undefined,
): AdminApplicationDetailTab {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (value && ADMIN_APPLICATION_DETAIL_TABS.includes(value as AdminApplicationDetailTab)) {
    return value as AdminApplicationDetailTab;
  }
  return "intake";
}
