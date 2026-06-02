import { fetchPlatformSettings, type PlatformSettings } from "@/lib/platform-settings";
import {
  fetchAdminRolePermissionTemplates,
  type AdminRolePermissionTemplates,
} from "@/lib/admin-role-permissions";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminSettingsPlanRow = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  universitiesCount: number;
  isMostPopular: boolean;
  isActive: boolean;
};

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
  plans: AdminSettingsPlanRow[];
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

  const [settings, rolePermissions, plansResult, adminsResult] = await Promise.all([
    fetchPlatformSettings(),
    fetchAdminRolePermissionTemplates(),
    service
      .from("applications_plans")
      .select(
        "id, name, description, price, universities_count, is_most_popular, is_active",
      )
      .order("universities_count", { ascending: true }),
    service
      .from("admins")
      .select("id, first_name, last_name, email, role, is_active")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true }),
  ]);

  if (plansResult.error) {
    console.error("[admin-settings] plans", plansResult.error);
  }

  if (adminsResult.error) {
    console.error("[admin-settings] admins", adminsResult.error);
  }

  return {
    settings,
    rolePermissions,
    plans: (plansResult.data ?? []).map((plan) => ({
      id: plan.id,
      name: plan.name.trim(),
      description: plan.description?.trim() ?? null,
      price: plan.price,
      universitiesCount: plan.universities_count,
      isMostPopular: plan.is_most_popular,
      isActive: plan.is_active,
    })),
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
