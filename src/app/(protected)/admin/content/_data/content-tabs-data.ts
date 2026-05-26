export const ADMIN_CONTENT_HOME = "/admin/content";
export const ADMIN_SCHOLARSHIPS_HOME = `${ADMIN_CONTENT_HOME}/scholarships`;

export type ContentTabId =
  | "universities"
  | "scholarships"
  | "announcements"
  | "news";

export type ContentTabCounts = Record<
  "universities" | "scholarships",
  number
>;

export type ContentTab = {
  id: ContentTabId;
  label: string;
  href: string;
  showCount: boolean;
};

export const contentTabs: readonly ContentTab[] = [
  { id: "universities", label: "Universities", href: ADMIN_CONTENT_HOME, showCount: true },
  {
    id: "scholarships",
    label: "Scholarships",
    href: `${ADMIN_CONTENT_HOME}/scholarships`,
    showCount: true,
  },
  {
    id: "announcements",
    label: "Announcements",
    href: `${ADMIN_CONTENT_HOME}/announcements`,
    showCount: false,
  },
  {
    id: "news",
    label: "News & Updates",
    href: `${ADMIN_CONTENT_HOME}/news`,
    showCount: false,
  },
];

function normalizePath(pathname: string) {
  return pathname.replace(/\/$/, "") || "/";
}

export function isAdminContentPath(pathname: string): boolean {
  const n = normalizePath(pathname);
  return n === ADMIN_CONTENT_HOME || n.startsWith(`${ADMIN_CONTENT_HOME}/`);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** e.g. /admin/content/universities/{uuid} — hide list chrome (tabs, header actions). */
export function isAdminUniversityDetailPath(pathname: string): boolean {
  const n = normalizePath(pathname);
  const prefix = `${ADMIN_CONTENT_HOME}/universities/`;
  if (!n.startsWith(prefix)) return false;
  const id = n.slice(prefix.length).split("/")[0];
  if (!id || n.slice(prefix.length).includes("/")) return false;
  return UUID_RE.test(id);
}

/** e.g. /admin/content/scholarships/{uuid} — hide list chrome (tabs, header actions). */
export function isAdminScholarshipDetailPath(pathname: string): boolean {
  const n = normalizePath(pathname);
  const prefix = `${ADMIN_SCHOLARSHIPS_HOME}/`;
  if (!n.startsWith(prefix)) return false;
  const id = n.slice(prefix.length).split("/")[0];
  if (!id || n.slice(prefix.length).includes("/")) return false;
  return UUID_RE.test(id);
}

export function isAdminContentListPath(pathname: string): boolean {
  const n = normalizePath(pathname);
  return (
    (n === ADMIN_CONTENT_HOME || n === ADMIN_SCHOLARSHIPS_HOME) &&
    !isAdminUniversityDetailPath(n) &&
    !isAdminScholarshipDetailPath(n)
  );
}

export function getContentTabFromPath(pathname: string): ContentTabId {
  const n = normalizePath(pathname);
  if (n === ADMIN_CONTENT_HOME) return "universities";

  const segment = n.slice(`${ADMIN_CONTENT_HOME}/`.length).split("/")[0];
  const match = contentTabs.find((tab) => tab.id === segment);
  return match?.id ?? "universities";
}
