import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { redirect } from "next/navigation";

import { ForceLtrDocument } from "@/lib/i18n/force-ltr-document";
import { permissionsFromUserMetadata } from "@/lib/admin-permissions";
import { fetchAdminRolePermissionTemplates } from "@/lib/admin-role-permissions";

import { AdminPortalShell } from "./_components/admin-portal-shell";

function initialsFromNames(first: string, last: string) {
  const a = first.trim()[0];
  const b = last.trim()[0];
  const pair = `${a ?? ""}${b ?? ""}`.toUpperCase();
  if (pair) return pair.slice(0, 2);
  if (a) return a.toUpperCase();
  return "?";
}

function displayNameFromParts(first: string, last: string, fallback: string) {
  const full = [first, last]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
  return full || fallback;
}

function formatAdminRole(role: string | null | undefined): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "moderator":
      return "Moderator";
    case "admin":
      return "Admin";
    default:
      return "Admin";
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let firstName = "";
  let lastName = "";
  let userRole = "Admin";
  let permissions = permissionsFromUserMetadata(undefined, "admin");
  const roleTemplates = await fetchAdminRolePermissionTemplates();

  if (user?.id) {
    const service = await createSupabaseSecretClient();
    const { data: profile } = await service
      .from("admins")
      .select("first_name, last_name, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.is_active === false) {
      await supabase.auth.signOut();
      redirect("/login?deactivated=1");
    }

    if (profile) {
      firstName = profile.first_name?.trim() ?? "";
      lastName = profile.last_name?.trim() ?? "";
      userRole = formatAdminRole(profile.role);
      permissions = permissionsFromUserMetadata(user.user_metadata, profile.role, roleTemplates);
    }
  }

  const avatarInitials = initialsFromNames(firstName, lastName);
  const displayName = displayNameFromParts(
    firstName,
    lastName,
    user?.email?.split("@")[0]?.trim() || "Admin",
  );

  return (
    <AdminPortalShell
      displayName={displayName}
      avatarInitials={avatarInitials}
      userRole={userRole}
      permissions={permissions}
    >
      <ForceLtrDocument />
      {children}
    </AdminPortalShell>
  );
}
