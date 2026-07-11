import { ADMIN_APPLICATIONS_UNASSIGNED_FILTER } from "./fetch-admin-application-advisor-options";
import { parseAdminApplicationStatusParam } from "./application-status-labels";
import type { AdminApplicationStatusFilter } from "./application-status-labels";
import { parseAdminAdvisorSessionStatusParam } from "@/app/(protected)/admin/sessions/_lib/session-status-labels";
import type { AdminAdvisorSessionStatusFilter } from "@/app/(protected)/admin/sessions/_lib/session-status-labels";

export type AdminApplicationsAssignedToFilter =
  | ""
  | typeof ADMIN_APPLICATIONS_UNASSIGNED_FILTER
  | string;

export type AdminApplicationSupportTypeFilter =
  | ""
  | "application_support"
  | "advisor_session";

export type AdminApplicationsPageFilters = {
  q: string;
  type: AdminApplicationSupportTypeFilter;
  status: AdminApplicationStatusFilter | AdminAdvisorSessionStatusFilter;
  assignedTo: AdminApplicationsAssignedToFilter;
  schoolId: string;
  page: number;
  limit: number;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TYPE_VALUES = new Set<string>(["", "application_support", "advisor_session"]);

function parseTypeParam(
  raw: string | string[] | undefined,
): AdminApplicationSupportTypeFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !TYPE_VALUES.has(value)) return "";
  return value as AdminApplicationSupportTypeFilter;
}

function parseAssignedToParam(
  raw: string | string[] | undefined,
): AdminApplicationsAssignedToFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value) return "";
  if (value === ADMIN_APPLICATIONS_UNASSIGNED_FILTER) {
    return ADMIN_APPLICATIONS_UNASSIGNED_FILTER;
  }
  if (UUID_RE.test(value)) return value;
  return "";
}

function parseSchoolParam(raw: string | string[] | undefined): string {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !UUID_RE.test(value)) return "";
  return value;
}

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseStatusParam(
  type: AdminApplicationSupportTypeFilter,
  raw: string | string[] | undefined,
): AdminApplicationStatusFilter | AdminAdvisorSessionStatusFilter {
  if (type === "application_support") {
    return parseAdminApplicationStatusParam(raw);
  }
  if (type === "advisor_session") {
    return parseAdminAdvisorSessionStatusParam(raw);
  }
  return "";
}

export function parseAdminApplicationsSearchParams(
  sp: Record<string, string | string[] | undefined>,
): AdminApplicationsPageFilters {
  const q = typeof sp.q === "string" ? sp.q : "";
  const type = parseTypeParam(sp.type);
  const status = parseStatusParam(type, sp.status);
  const assignedTo = parseAssignedToParam(sp.assignedTo);
  const schoolId = parseSchoolParam(sp.school);
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 20)));

  return { q, type, status, assignedTo, schoolId, page, limit };
}
