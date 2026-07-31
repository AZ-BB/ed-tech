import { fetchPlatformSettings, type PlatformSettings } from "@/lib/platform-settings";
import {
  fetchAdminRolePermissionTemplates,
  type AdminRolePermissionTemplates,
} from "@/lib/admin-role-permissions";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminSettingsAdminRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
};

export type AdminSettingsPageData = {
  settings: PlatformSettings;
  admins: AdminSettingsAdminRow[];
  rolePermissions: AdminRolePermissionTemplates;
};

function formatAdminRole(role: string | null | undefined): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "moderator":
      return "Moderator";
    case "admin":
      return "Admin";
    default:
      return role?.trim() || "Admin";
  }
}

export async function fetchAdminSettingsPage(): Promise<AdminSettingsPageData> {
  const service = await createSupabaseSecretClient();

  const [settings, rolePermissions, adminsResult] = await Promise.all([
    fetchPlatformSettings(),
    fetchAdminRolePermissionTemplates(),
    service
      .from("admins")
      .select("id, first_name, last_name, email, role, is_active")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true }),
  ]);

  if (adminsResult.error) {
    console.error("[admin-settings] admins", adminsResult.error);
  }

  return {
    settings,
    rolePermissions,
    admins: (adminsResult.data ?? []).map((admin) => ({
      id: admin.id,
      firstName: admin.first_name?.trim() ?? "",
      lastName: admin.last_name?.trim() ?? "",
      email: admin.email?.trim() ?? "",
      role: formatAdminRole(admin.role),
      isActive: admin.is_active !== false,
    })),
  };
}
