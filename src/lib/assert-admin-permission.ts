import {
  type AdminPermission,
  permissionsFromUserMetadata,
  type AdminUserMetadata,
} from "@/lib/admin-permissions";
import { fetchAdminRolePermissionTemplates } from "@/lib/admin-role-permissions";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

type AssertAdminPermissionResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

export async function assertAdminPermission(
  permission: AdminPermission,
): Promise<AssertAdminPermissionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, error: "You must be signed in." };
  }

  const service = await createSupabaseSecretClient();
  const { data: admin, error: adminError } = await service
    .from("admins")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[assert-admin-permission] admin lookup", adminError);
    return { ok: false, error: "Could not verify admin access." };
  }

  if (!admin) {
    return { ok: false, error: "You do not have permission." };
  }

  if (admin.is_active === false) {
    return { ok: false, error: "Your admin account is inactive." };
  }

  const metadata = user.user_metadata as AdminUserMetadata | undefined;
  const roleTemplates = await fetchAdminRolePermissionTemplates();
  const permissions = permissionsFromUserMetadata(metadata, admin.role, roleTemplates);

  if (!permissions.includes(permission)) {
    return { ok: false, error: "You do not have permission." };
  }

  return { ok: true, userId: user.id };
}
