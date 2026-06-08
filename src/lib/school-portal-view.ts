import type { StudentTeacherFilterValue } from "@/lib/student-teacher-assignment";

export const SCHOOL_VIEW_MY = "my_view" as const;
export const SCHOOL_VIEW_ALL = "all_view" as const;

export type SchoolPortalView = typeof SCHOOL_VIEW_MY | typeof SCHOOL_VIEW_ALL;

export const SCHOOL_VIEW_STORAGE_KEY = "school-portal-view";

/** Navigate sidebar routes that carry the global view param. */
export const SCHOOL_VIEW_NAV_PATHS = [
  "/school",
  "/school/students",
  "/school/applications",
  "/school/documents",
  "/school/tasks",
  "/school/reports",
] as const;

export const SCHOOL_SEARCHABLE_PATHS = [
  "/school/students",
  "/school/applications",
  "/school/tasks",
  "/school/documents",
] as const;

function normalizePath(pathname: string): string {
  return pathname.replace(/\/$/, "") || "/";
}

export function isSchoolViewNavPath(pathname: string): boolean {
  const n = normalizePath(pathname);
  return (SCHOOL_VIEW_NAV_PATHS as readonly string[]).includes(n);
}

export function isSchoolSearchablePath(pathname: string): boolean {
  const n = normalizePath(pathname);
  return (SCHOOL_SEARCHABLE_PATHS as readonly string[]).includes(n);
}

export function parseSchoolPortalView(
  raw: string | string[] | undefined,
): SchoolPortalView {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (value === SCHOOL_VIEW_MY) return SCHOOL_VIEW_MY;
  return SCHOOL_VIEW_ALL;
}

/** Maps global view to the existing teacher filter used by list/dashboard queries. */
export function resolveTeacherFilterFromView(
  view: SchoolPortalView,
  currentUserId: string | null | undefined,
): StudentTeacherFilterValue {
  if (view === SCHOOL_VIEW_MY && currentUserId?.trim()) {
    return currentUserId.trim();
  }
  return "";
}

export function readStoredSchoolPortalView(): SchoolPortalView {
  if (typeof window === "undefined") return SCHOOL_VIEW_ALL;
  try {
    const stored = sessionStorage.getItem(SCHOOL_VIEW_STORAGE_KEY);
    return stored === SCHOOL_VIEW_MY ? SCHOOL_VIEW_MY : SCHOOL_VIEW_ALL;
  } catch {
    return SCHOOL_VIEW_ALL;
  }
}

export function writeStoredSchoolPortalView(view: SchoolPortalView) {
  if (typeof window === "undefined") return;
  try {
    if (view === SCHOOL_VIEW_MY) {
      sessionStorage.setItem(SCHOOL_VIEW_STORAGE_KEY, SCHOOL_VIEW_MY);
    } else {
      sessionStorage.removeItem(SCHOOL_VIEW_STORAGE_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

export type SchoolNavHrefOptions = {
  studentQ?: string;
  view?: SchoolPortalView;
};

/** Carry navbar student filter and global view when navigating via the sidebar. */
export function buildSchoolNavHref(
  href: string,
  options: SchoolNavHrefOptions = {},
): string {
  const path = normalizePath(href);
  const params = new URLSearchParams();

  const trimmedStudentQ = options.studentQ?.trim() ?? "";
  if (trimmedStudentQ && isSchoolSearchablePath(path)) {
    params.set("studentQ", trimmedStudentQ);
    params.set("page", "1");
  }

  if (options.view === SCHOOL_VIEW_MY && isSchoolViewNavPath(path)) {
    params.set("view", SCHOOL_VIEW_MY);
  }

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** @deprecated Use {@link buildSchoolNavHref} */
export function buildNavHrefWithStudentQ(href: string, studentQ: string): string {
  return buildSchoolNavHref(href, { studentQ });
}
