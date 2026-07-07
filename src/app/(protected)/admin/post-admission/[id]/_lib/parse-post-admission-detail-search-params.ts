export const POST_ADMISSION_DETAIL_TABS = [
  "overview",
  "notes",
  "payments",
  "payouts",
  "calls",
  "activity",
] as const;

export type PostAdmissionDetailTab = (typeof POST_ADMISSION_DETAIL_TABS)[number];

export function parsePostAdmissionDetailTab(
  raw: string | string[] | undefined,
): PostAdmissionDetailTab {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (value && POST_ADMISSION_DETAIL_TABS.includes(value as PostAdmissionDetailTab)) {
    return value as PostAdmissionDetailTab;
  }
  return "overview";
}
