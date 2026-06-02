"use server";

import {
  type AdminPermission,
  isAdminPermission,
  parseAdminPermissions,
  type AdminRole,
  type AdminUserMetadata,
} from "@/lib/admin-permissions";
import {
  ADMIN_ROLE_PERMISSION_SYSTEM_KEYS,
  isSuperAdminRole,
} from "@/lib/admin-role-permissions";
import { assertAdminPermission } from "@/lib/assert-admin-permission";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AdminPermissionsActionResult = { ok: true } | { ok: false; error: string };

export async function updateAdminUserPermissions(
  adminId: string,
  permissions: AdminPermission[],
): Promise<AdminPermissionsActionResult> {
  const access = await assertAdminPermission("edit_permissions");
  if (!access.ok) return access;

  const id = adminId.trim();
  if (!UUID_RE.test(id)) {
    return { ok: false, error: "Invalid admin." };
  }

  const unique = [...new Set(permissions)];
  if (unique.some((permission) => !isAdminPermission(permission))) {
    return { ok: false, error: "Invalid permission value." };
  }

  const service = await createSupabaseSecretClient();

  const { data: adminRow, error: adminRowError } = await service
    .from("admins")
    .select("role")
    .eq("id", id)
    .maybeSingle();

  if (adminRowError || !adminRow) {
    return { ok: false, error: "Admin account not found." };
  }

  if (isSuperAdminRole(adminRow.role)) {
    return { ok: false, error: "Super Admin permissions cannot be changed." };
  }

  const { data: existingUser, error: fetchError } =
    await service.auth.admin.getUserById(id);

  if (fetchError || !existingUser.user) {
    console.error("[admin-permissions] getUserById", fetchError);
    return { ok: false, error: "Admin account not found." };
  }

  const currentMeta = (existingUser.user.user_metadata ?? {}) as AdminUserMetadata;

  const { error: updateError } = await service.auth.admin.updateUserById(id, {
    user_metadata: {
      ...currentMeta,
      permissions: unique,
    },
  });

  if (updateError) {
    console.error("[admin-permissions] updateUserById", updateError);
    return { ok: false, error: "Could not update permissions." };
  }

  revalidatePath("/admin/users/admins");
  revalidatePath(`/admin/users/admins/${id}`);

  return { ok: true };
}

export async function updateAdminUserPermissionsFromForm(
  adminId: string,
  formData: FormData,
): Promise<AdminPermissionsActionResult> {
  const raw = formData.getAll("permissions");
  const permissions = parseAdminPermissions(raw);
  return updateAdminUserPermissions(adminId, permissions);
}

export async function refreshCurrentAdminSessionAfterPermissionChange(): Promise<
  AdminPermissionsActionResult
> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.refreshSession();
  if (error) {
    console.error("[admin-permissions] refreshSession", error);
    return { ok: false, error: "Permissions saved but session could not be refreshed." };
  }
  return { ok: true };
}

export async function updateAdminRolePermissions(
  role: AdminRole,
  permissions: AdminPermission[],
): Promise<AdminPermissionsActionResult> {
  const access = await assertAdminPermission("edit_permissions");
  if (!access.ok) return access;

  if (isSuperAdminRole(role)) {
    return { ok: false, error: "Super Admin role permissions cannot be changed." };
  }

  if (role !== "admin" && role !== "moderator") {
    return { ok: false, error: "Invalid role." };
  }

  const unique = [...new Set(permissions)];
  if (unique.some((permission) => !isAdminPermission(permission))) {
    return { ok: false, error: "Invalid permission value." };
  }

  const service = await createSupabaseSecretClient();
  const key = ADMIN_ROLE_PERMISSION_SYSTEM_KEYS[role];
  const now = new Date().toISOString();

  const { error } = await service.from("system").upsert(
    { key, value: JSON.stringify(unique), updated_at: now },
    { onConflict: "key" },
  );

  if (error) {
    console.error("[admin-permissions] update role permissions", error);
    return { ok: false, error: "Could not save role permissions." };
  }

  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function updateAdminRolePermissionsFromForm(
  formData: FormData,
): Promise<AdminPermissionsActionResult> {
  const roleRaw = String(formData.get("role") ?? "").trim();
  if (roleRaw !== "admin" && roleRaw !== "moderator") {
    return { ok: false, error: "Invalid role." };
  }

  const permissions = parseAdminPermissions(formData.getAll("permissions"));
  return updateAdminRolePermissions(roleRaw, permissions);
}
