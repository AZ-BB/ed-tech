import {
  ADMIN_ROLE_DEFAULT_PERMISSIONS,
  type AdminPermission,
  type AdminRole,
  parseAdminPermissions,
} from "@/lib/admin-permissions";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export const SUPER_ADMIN_ROLE: AdminRole = "super_admin";

export const EDITABLE_ADMIN_ROLES: AdminRole[] = ["admin", "moderator"];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  moderator: "Moderator",
};

export const ADMIN_ROLE_PERMISSION_SYSTEM_KEYS: Record<AdminRole, string> = {
  super_admin: "role_permissions_super_admin",
  admin: "role_permissions_admin",
  moderator: "role_permissions_moderator",
};

const ALL_ROLES: AdminRole[] = ["super_admin", "admin", "moderator"];

export type AdminRolePermissionTemplates = Record<AdminRole, AdminPermission[]>;

function isAdminRole(value: string | null | undefined): value is AdminRole {
  return value === "super_admin" || value === "admin" || value === "moderator";
}

export function isSuperAdminRole(role: AdminRole | string | null | undefined): boolean {
  return role?.trim() === SUPER_ADMIN_ROLE;
}

function templatesFromDefaults(): AdminRolePermissionTemplates {
  return {
    super_admin: [...ADMIN_ROLE_DEFAULT_PERMISSIONS.super_admin],
    admin: [...ADMIN_ROLE_DEFAULT_PERMISSIONS.admin],
    moderator: [...ADMIN_ROLE_DEFAULT_PERMISSIONS.moderator],
  };
}

export function mergeRolePermissionTemplates(
  partial: Partial<AdminRolePermissionTemplates>,
): AdminRolePermissionTemplates {
  const defaults = templatesFromDefaults();
  return {
    super_admin: partial.super_admin ?? defaults.super_admin,
    admin: partial.admin ?? defaults.admin,
    moderator: partial.moderator ?? defaults.moderator,
  };
}

export function permissionsForRoleFromTemplates(
  templates: AdminRolePermissionTemplates,
  role: AdminRole | string | null | undefined,
): AdminPermission[] {
  const key = role?.trim();
  if (key === "super_admin" || key === "admin" || key === "moderator") {
    return [...templates[key]];
  }
  return [...templates.admin];
}

export async function fetchAdminRolePermissionTemplates(): Promise<AdminRolePermissionTemplates> {
  const service = await createSupabaseSecretClient();
  const keys = ALL_ROLES.map((role) => ADMIN_ROLE_PERMISSION_SYSTEM_KEYS[role]);

  const { data, error } = await service.from("system").select("key, value").in("key", keys);

  if (error) {
    console.error("[admin-role-permissions] fetch", error);
    return templatesFromDefaults();
  }

  const byKey = new Map((data ?? []).map((row) => [row.key, row.value]));
  const partial: Partial<AdminRolePermissionTemplates> = {};

  for (const role of ALL_ROLES) {
    const raw = byKey.get(ADMIN_ROLE_PERMISSION_SYSTEM_KEYS[role]);
    if (raw === undefined) continue;
    try {
      partial[role] = parseAdminPermissions(JSON.parse(raw));
    } catch {
      partial[role] = parseAdminPermissions(raw.split(",").map((item) => item.trim()));
    }
  }

  return mergeRolePermissionTemplates(partial);
}

export function parseRolePermissionsFormValue(raw: FormDataEntryValue | null): AdminPermission[] {
  if (typeof raw !== "string") return [];
  try {
    return parseAdminPermissions(JSON.parse(raw));
  } catch {
    return parseAdminPermissions(raw.split(",").map((item) => item.trim()));
  }
}
