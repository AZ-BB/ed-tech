export const ADMIN_SESSIONS_HOME = "/admin/sessions";

export type SessionsTabId = "advisor" | "ambassador" | "pending" | "completed";

export type SessionsTabCounts = Record<SessionsTabId, number>;

export type SessionsTab = {
  id: SessionsTabId;
  label: string;
  href: string;
};

export const sessionsTabs: readonly SessionsTab[] = [
  {
    id: "advisor",
    label: "Advisor Sessions",
    href: ADMIN_SESSIONS_HOME,
  },
  {
    id: "ambassador",
    label: "Ambassador requests",
    href: `${ADMIN_SESSIONS_HOME}/ambassador`,
  },
  {
    id: "pending",
    label: "Pending",
    href: `${ADMIN_SESSIONS_HOME}/pending`,
  },
  {
    id: "completed",
    label: "Completed",
    href: `${ADMIN_SESSIONS_HOME}/completed`,
  },
];

function normalizePath(pathname: string) {
  return pathname.replace(/\/$/, "") || "/";
}

export function isAdminSessionsPath(pathname: string): boolean {
  const n = normalizePath(pathname);
  return n === ADMIN_SESSIONS_HOME || n.startsWith(`${ADMIN_SESSIONS_HOME}/`);
}

export function getSessionsTabFromPath(pathname: string): SessionsTabId {
  const n = normalizePath(pathname);
  if (n === ADMIN_SESSIONS_HOME) return "advisor";

  const segment = n.slice(`${ADMIN_SESSIONS_HOME}/`.length).split("/")[0];
  const match = sessionsTabs.find((tab) => tab.id === segment);
  return match?.id ?? "advisor";
}

export function isMergedSessionsTab(tabId: SessionsTabId): boolean {
  return tabId === "pending" || tabId === "completed";
}

export type AdminSessionKind = "advisor" | "ambassador";

const SESSION_DETAIL_KINDS = new Set<AdminSessionKind>(["advisor", "ambassador"]);

export function getAdminSessionDetailHref(
  kind: AdminSessionKind,
  id: number,
): string {
  return `${ADMIN_SESSIONS_HOME}/view/${kind}/${id}`;
}

/** e.g. /admin/sessions/view/advisor/42 — hide list tab chrome. */
export function isAdminSessionDetailPath(pathname: string): boolean {
  const n = normalizePath(pathname);
  const match = n.match(/^\/admin\/sessions\/view\/([^/]+)\/(\d+)$/);
  if (!match) return false;
  return SESSION_DETAIL_KINDS.has(match[1] as AdminSessionKind);
}

export function parseAdminSessionDetailParams(
  kindRaw: string,
  idRaw: string,
): { kind: AdminSessionKind; id: number } | null {
  if (!SESSION_DETAIL_KINDS.has(kindRaw as AdminSessionKind)) return null;
  const id = Number.parseInt(idRaw, 10);
  if (!Number.isFinite(id) || id < 1) return null;
  return { kind: kindRaw as AdminSessionKind, id };
}
