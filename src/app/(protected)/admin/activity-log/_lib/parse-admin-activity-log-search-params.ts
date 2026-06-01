import type { StudentActivityLogItem } from "@/lib/student-activity-logs";

export type AdminActivityLogActorTypeFilter =
  | ""
  | StudentActivityLogItem["createdByType"];

export type AdminActivityLogPageFilters = {
  q: string;
  action: string;
  entityType: string;
  actorType: AdminActivityLogActorTypeFilter;
  page: number;
  limit: number;
};

export const ADMIN_ACTIVITY_LOG_ACTOR_TYPE_FILTER_OPTIONS = [
  { value: "", label: "All actors" },
  { value: "student", label: "Student" },
  { value: "school_admin", label: "School admin" },
  { value: "admin", label: "Platform admin" },
] as const;

const VALID_ACTOR_TYPES = new Set<string>(
  ADMIN_ACTIVITY_LOG_ACTOR_TYPE_FILTER_OPTIONS.map((option) => option.value).filter(Boolean),
);

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseActorTypeParam(
  raw: string | string[] | undefined,
): AdminActivityLogActorTypeFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !VALID_ACTOR_TYPES.has(value)) return "";
  return value as AdminActivityLogActorTypeFilter;
}

function parseStringParam(raw: string | string[] | undefined): string {
  return typeof raw === "string" ? raw : Array.isArray(raw) ? (raw[0] ?? "") : "";
}

export function parseAdminActivityLogSearchParams(
  sp: Record<string, string | string[] | undefined>,
): AdminActivityLogPageFilters {
  const q = typeof sp.q === "string" ? sp.q : "";
  const action = parseStringParam(sp.action);
  const entityType = parseStringParam(sp.entityType);
  const actorType = parseActorTypeParam(sp.actorType);
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 20)));

  return { q, action, entityType, actorType, page, limit };
}
