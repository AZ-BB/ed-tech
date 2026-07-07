import type { Database } from "@/database.types";

export type AdminPostAdmissionStatusFilter =
  | ""
  | Database["public"]["Enums"]["post_admission_status"];

const VALID_STATUSES = new Set<string>([
  "lead",
  "not_suitable",
  "payment_requested",
  "active",
  "completed",
]);

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function parseAdminPostAdmissionStatusParam(
  raw: string | string[] | undefined,
): AdminPostAdmissionStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (value && VALID_STATUSES.has(value)) {
    return value as AdminPostAdmissionStatusFilter;
  }
  return "";
}

export function parseAdminPostAdmissionSearchParams(
  sp: Record<string, string | string[] | undefined>,
) {
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = parseAdminPostAdmissionStatusParam(sp.status);
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 20)));

  return { q, status, page, limit };
}
