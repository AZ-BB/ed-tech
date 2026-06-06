export const ADMIN_APPLICATIONS_HOME = "/admin/applications";

function normalizePath(pathname: string) {
  return pathname.replace(/\/$/, "") || "/";
}

export function isAdminApplicationsPath(pathname: string): boolean {
  const n = normalizePath(pathname);
  return n === ADMIN_APPLICATIONS_HOME || n.startsWith(`${ADMIN_APPLICATIONS_HOME}/`);
}

export function isAdminApplicationDetailPath(pathname: string): boolean {
  const n = normalizePath(pathname);
  return /^\/admin\/applications\/\d+$/.test(n);
}

export function isAdminApplicationsListPath(pathname: string): boolean {
  return (
    isAdminApplicationsPath(pathname) && !isAdminApplicationDetailPath(pathname)
  );
}
