export type AdminUsersRoleFilter =
  | ""
  | "student"
  | "teacher"
  | "advisor"
  | "ambassador"
  | "admin";

export type AdminUsersStatusFilter = "" | "active" | "inactive";

import {
  parseStudentTeacherFilterParam,
  type StudentTeacherFilterValue,
} from "@/lib/student-teacher-assignment";

export type AdminUsersPageFilters = {
  q: string;
  role: AdminUsersRoleFilter;
  schoolId: string;
  status: AdminUsersStatusFilter;
  teacher: StudentTeacherFilterValue;
  page: number;
  limit: number;
};

export const ADMIN_USERS_ROLE_FILTER_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
  { value: "advisor", label: "Advisor" },
  { value: "ambassador", label: "Ambassador" },
  { value: "admin", label: "Admin" },
] as const;

export const ADMIN_USERS_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

const VALID_ROLES = new Set<string>(
  ADMIN_USERS_ROLE_FILTER_OPTIONS.map((option) => option.value).filter(Boolean),
);

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseRoleParam(
  raw: string | string[] | undefined,
): AdminUsersRoleFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !VALID_ROLES.has(value)) return "";
  return value as AdminUsersRoleFilter;
}

const VALID_STATUSES = new Set<string>(
  ADMIN_USERS_STATUS_FILTER_OPTIONS.map((option) => option.value).filter(Boolean),
);

function parseStatusParam(
  raw: string | string[] | undefined,
): AdminUsersStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !VALID_STATUSES.has(value)) return "";
  return value as AdminUsersStatusFilter;
}

export function parseAdminUsersSearchParams(
  sp: Record<string, string | string[] | undefined>,
  scopedSchoolId?: string,
): AdminUsersPageFilters {
  const q = typeof sp.q === "string" ? sp.q : "";
  const role = parseRoleParam(sp.role);
  const schoolId =
    scopedSchoolId?.trim() ||
    (typeof sp.school === "string" ? sp.school : "");
  const status = parseStatusParam(sp.status);
  const teacher = parseStudentTeacherFilterParam(sp.teacher);
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 20)));

  return { q, role, schoolId, status, teacher, page, limit };
}
