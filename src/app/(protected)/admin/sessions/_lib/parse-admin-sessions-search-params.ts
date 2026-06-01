import type { SessionsTabId } from "../_data/sessions-tabs-data";
import {
  parseAdminAdvisorSessionStatusParam,
  type AdminAdvisorSessionStatusFilter,
} from "./session-status-labels";
import {
  parseAdminAmbassadorSessionStatusParam,
  type AdminAmbassadorSessionStatusFilter,
} from "./session-status-labels";

export type AdminSessionKindFilter = "" | "advisor" | "ambassador";

export type AdminSessionsPageFilters = {
  q: string;
  status: AdminAdvisorSessionStatusFilter | AdminAmbassadorSessionStatusFilter;
  kind: AdminSessionKindFilter;
  schoolId: string;
  page: number;
  limit: number;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseSchoolParam(raw: string | string[] | undefined): string {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !UUID_RE.test(value)) return "";
  return value;
}

function parseKindParam(raw: string | string[] | undefined): AdminSessionKindFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (value === "advisor" || value === "ambassador") return value;
  return "";
}

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function parseAdminSessionsSearchParams(
  sp: Record<string, string | string[] | undefined>,
  tabId: SessionsTabId,
): AdminSessionsPageFilters {
  const q = typeof sp.q === "string" ? sp.q : "";
  const schoolId = parseSchoolParam(sp.school);
  const kind = parseKindParam(sp.kind);
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 20)));

  const status =
    tabId === "ambassador"
      ? parseAdminAmbassadorSessionStatusParam(sp.status)
      : parseAdminAdvisorSessionStatusParam(sp.status);

  return { q, status, kind, schoolId, page, limit };
}

export function getEffectiveSessionsFilters(
  tabId: SessionsTabId,
  filters: AdminSessionsPageFilters,
): AdminSessionsPageFilters {
  if (tabId === "pending") {
    return { ...filters, status: "pending", kind: filters.kind };
  }
  if (tabId === "completed") {
    return { ...filters, status: "completed", kind: filters.kind };
  }
  return { ...filters, kind: "" };
}
