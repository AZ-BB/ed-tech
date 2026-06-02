import type { Database } from "@/database.types";

export type AdminRole = Database["public"]["Enums"]["admin_role"];

export const ADMIN_PERMISSIONS = [
  "edit_students",
  "edit_teachers",
  "edit_advisors",
  "edit_ambassadors",
  "edit_admins",
  "edit_permissions",
  "edit_system_default",
  "edit_system_features",
  "edit_system_plans",
  "edit_applications",
  "edit_documents",
  "edit_schools",
  "edit_sessions",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

const PERMISSION_SET = new Set<string>(ADMIN_PERMISSIONS);

export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  edit_students: "Edit students",
  edit_teachers: "Edit teachers",
  edit_advisors: "Edit advisors",
  edit_ambassadors: "Edit ambassadors",
  edit_admins: "Edit admins",
  edit_permissions: "Edit permissions",
  edit_system_default: "Edit system defaults",
  edit_system_features: "Edit system feature toggles",
  edit_system_plans: "Edit application plans",
  edit_applications: "Edit applications",
  edit_documents: "Edit documents",
  edit_schools: "Edit schools",
  edit_sessions: "Edit sessions",
};

export const ADMIN_ROLE_DEFAULT_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  super_admin: [...ADMIN_PERMISSIONS],
  admin: [
    "edit_students",
    "edit_teachers",
    "edit_advisors",
    "edit_ambassadors",
    "edit_system_default",
    "edit_system_features",
    "edit_system_plans",
    "edit_applications",
    "edit_documents",
    "edit_schools",
    "edit_sessions",
  ],
  moderator: [
    "edit_students",
    "edit_applications",
    "edit_documents",
    "edit_sessions",
  ],
};

export function isAdminPermission(value: string): value is AdminPermission {
  return PERMISSION_SET.has(value);
}

export function parseAdminPermissions(raw: unknown): AdminPermission[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<AdminPermission>();
  for (const item of raw) {
    if (typeof item !== "string" || !isAdminPermission(item)) continue;
    seen.add(item);
  }
  return [...seen];
}

export function hasAdminPermission(
  permissions: readonly AdminPermission[],
  permission: AdminPermission,
): boolean {
  return permissions.includes(permission);
}

export function adminPermissionsFromRole(role: AdminRole | string | null | undefined): AdminPermission[] {
  const key = role?.trim();
  if (key === "super_admin" || key === "admin" || key === "moderator") {
    return [...ADMIN_ROLE_DEFAULT_PERMISSIONS[key]];
  }
  return [...ADMIN_ROLE_DEFAULT_PERMISSIONS.admin];
}

export function resolveAdminPermissions(
  metadataPermissions: unknown,
  role: AdminRole | string | null | undefined,
  roleTemplates?: Record<AdminRole, AdminPermission[]>,
): AdminPermission[] {
  const parsed = parseAdminPermissions(metadataPermissions);
  if (parsed.length > 0) return parsed;
  if (roleTemplates) {
    const key = role?.trim();
    if (key === "super_admin" || key === "admin" || key === "moderator") {
      return [...roleTemplates[key]];
    }
    return [...roleTemplates.admin];
  }
  return adminPermissionsFromRole(role);
}

export type AdminUserMetadata = {
  type?: string;
  firstName?: string;
  lastName?: string;
  permissions?: unknown;
};

export function permissionsFromUserMetadata(
  metadata: AdminUserMetadata | null | undefined,
  role: AdminRole | string | null | undefined,
  roleTemplates?: Record<AdminRole, AdminPermission[]>,
): AdminPermission[] {
  return resolveAdminPermissions(metadata?.permissions, role, roleTemplates);
}
