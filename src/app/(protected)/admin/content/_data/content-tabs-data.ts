export const ADMIN_CONTENT_HOME = "/admin/content";
export const ADMIN_SCHOLARSHIPS_HOME = `${ADMIN_CONTENT_HOME}/scholarships`;
export const ADMIN_INTERNSHIPS_HOME = `${ADMIN_CONTENT_HOME}/internships`;
export const ADMIN_INTERNSHIP_SUPPORT_REQUESTS_HOME = `${ADMIN_INTERNSHIPS_HOME}/support-requests`;
export const ADMIN_ANNOUNCEMENTS_HOME = `${ADMIN_CONTENT_HOME}/announcements`;
export const ADMIN_NEWS_HOME = `${ADMIN_CONTENT_HOME}/news`;
export const ADMIN_WEBINARS_HOME = `${ADMIN_CONTENT_HOME}/webinars`;
export const ADMIN_STUDENT_STORIES_HOME = `${ADMIN_CONTENT_HOME}/student-stories`;

export type ContentTabId =
  | "universities"
  | "scholarships"
  | "internships"
  | "announcements"
  | "news"
  | "webinars"
  | "student-stories";

export type ContentTabCounts = Record<
  | "universities"
  | "scholarships"
  | "internships"
  | "announcements"
  | "news"
  | "webinars"
  | "student-stories",
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
    id: "internships",
    label: "Internships",
    href: ADMIN_INTERNSHIPS_HOME,
    showCount: true,
  },
  {
    id: "announcements",
    label: "Announcements",
    href: ADMIN_ANNOUNCEMENTS_HOME,
    showCount: true,
  },
  {
    id: "news",
    label: "News & Updates",
    href: ADMIN_NEWS_HOME,
    showCount: true,
  },
  {
    id: "webinars",
    label: "Webinars",
    href: ADMIN_WEBINARS_HOME,
    showCount: true,
  },
  {
    id: "student-stories",
    label: "Student Stories",
    href: ADMIN_STUDENT_STORIES_HOME,
    showCount: true,
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

/** e.g. /admin/content/internships/support-requests */
export function isAdminInternshipSupportRequestsPath(pathname: string): boolean {
  return normalizePath(pathname) === ADMIN_INTERNSHIP_SUPPORT_REQUESTS_HOME;
}

/** e.g. /admin/content/internships/{uuid} — hide list chrome (tabs, header actions). */
export function isAdminInternshipDetailPath(pathname: string): boolean {
  const n = normalizePath(pathname);
  const prefix = `${ADMIN_INTERNSHIPS_HOME}/`;
  if (!n.startsWith(prefix)) return false;
  const id = n.slice(prefix.length).split("/")[0];
  if (!id || n.slice(prefix.length).includes("/")) return false;
  if (id === "support-requests") return false;
  return UUID_RE.test(id);
}

/** e.g. /admin/content/webinars/{id} — hide list chrome (tabs, header actions). */
export function isAdminWebinarDetailPath(pathname: string): boolean {
  const n = normalizePath(pathname);
  const prefix = `${ADMIN_WEBINARS_HOME}/`;
  if (!n.startsWith(prefix)) return false;
  const id = n.slice(prefix.length).split("/")[0];
  if (!id || n.slice(prefix.length).includes("/")) return false;
  return /^\d+$/.test(id);
}

export function isAdminContentListPath(pathname: string): boolean {
  const n = normalizePath(pathname);
  return (
    (n === ADMIN_CONTENT_HOME ||
      n === ADMIN_SCHOLARSHIPS_HOME ||
      n === ADMIN_INTERNSHIPS_HOME ||
      n === ADMIN_INTERNSHIP_SUPPORT_REQUESTS_HOME ||
      n === ADMIN_ANNOUNCEMENTS_HOME ||
      n === ADMIN_NEWS_HOME ||
      n === ADMIN_WEBINARS_HOME ||
      n === ADMIN_STUDENT_STORIES_HOME) &&
    !isAdminUniversityDetailPath(n) &&
    !isAdminScholarshipDetailPath(n) &&
    !isAdminInternshipDetailPath(n) &&
    !isAdminWebinarDetailPath(n)
  );
}

export function getContentTabFromPath(pathname: string): ContentTabId {
  const n = normalizePath(pathname);
  if (n === ADMIN_CONTENT_HOME) return "universities";
  if (isAdminInternshipSupportRequestsPath(n)) return "internships";

  const segment = n.slice(`${ADMIN_CONTENT_HOME}/`.length).split("/")[0];
  const match = contentTabs.find((tab) => tab.id === segment);
  return match?.id ?? "universities";
}
