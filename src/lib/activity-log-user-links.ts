import type { StudentActivityLogItem } from "@/lib/student-activity-logs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ActivityLogUserRole =
  | "student"
  | "school_admin"
  | "admin"
  | "advisor"
  | "ambassador";

function normalizeEntityType(raw: string): string {
  return raw.trim().toLowerCase();
}

export function getActivityLogUserDetailHref(
  role: ActivityLogUserRole,
  userId: string | null | undefined,
): string | null {
  const id = userId?.trim();
  if (!id || !UUID_RE.test(id)) return null;

  switch (role) {
    case "student":
      return `/admin/users/students/${id}`;
    case "school_admin":
      return `/admin/users/teachers/${id}`;
    case "admin":
      return `/admin/users/admins/${id}`;
    case "advisor":
      return `/admin/users/advisors/${id}`;
    case "ambassador":
      return `/admin/users/ambassadors/${id}`;
  }
}

export function entityTypeToUserRole(entityType: string): ActivityLogUserRole | null {
  switch (normalizeEntityType(entityType)) {
    case "student":
      return "student";
    case "school_admin":
      return "school_admin";
    case "admin":
      return "admin";
    case "advisor":
      return "advisor";
    case "ambassador":
      return "ambassador";
    default:
      return null;
  }
}

export function getActivityLogEntityUserDetailHref(
  entityType: string,
  entityId: string,
): string | null {
  const role = entityTypeToUserRole(entityType);
  if (!role) return null;
  const id = entityId.trim();
  if (!id || id === "—") return null;
  return getActivityLogUserDetailHref(role, id);
}

export function getActivityLogActorUserDetailHref(
  createdByType: StudentActivityLogItem["createdByType"],
  actorUserId: string | null,
): string | null {
  if (!actorUserId) return null;

  switch (createdByType) {
    case "student":
      return getActivityLogUserDetailHref("student", actorUserId);
    case "school_admin":
      return getActivityLogUserDetailHref("school_admin", actorUserId);
    case "admin":
      return getActivityLogUserDetailHref("admin", actorUserId);
  }
}

export function resolveActivityLogActorUserId(
  createdByType: StudentActivityLogItem["createdByType"],
  adminId: string | null | undefined,
  schoolAdminId: string | null | undefined,
  studentId: string | null | undefined,
): string | null {
  switch (createdByType) {
    case "admin":
      return adminId?.trim() || null;
    case "school_admin":
      return schoolAdminId?.trim() || null;
    case "student":
      return studentId?.trim() || null;
  }
}
