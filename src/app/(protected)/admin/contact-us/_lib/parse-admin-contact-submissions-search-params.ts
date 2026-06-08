import type { Database } from "@/database.types";

export type ContactSubmissionStatus =
  Database["public"]["Enums"]["contact_submission_status"];

export type AdminContactSubmissionsStatusFilter = ContactSubmissionStatus | "";

export type AdminContactSubmissionsPageFilters = {
  q: string;
  status: AdminContactSubmissionsStatusFilter;
  page: number;
  limit: number;
};

const STATUS_VALUES = new Set<string>(["new", "read", "archived"]);

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseStatusParam(
  raw: string | string[] | undefined,
): AdminContactSubmissionsStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !STATUS_VALUES.has(value)) return "";
  return value as ContactSubmissionStatus;
}

export function parseAdminContactSubmissionsSearchParams(
  sp: Record<string, string | string[] | undefined>,
): AdminContactSubmissionsPageFilters {
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = parseStatusParam(sp.status);
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 20)));

  return { q, status, page, limit };
}

export const ADMIN_CONTACT_SUBMISSION_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "archived", label: "Archived" },
] as const;
