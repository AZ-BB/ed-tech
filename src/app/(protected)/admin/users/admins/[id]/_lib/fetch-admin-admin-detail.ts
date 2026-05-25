import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { formatDistanceToNow } from "date-fns";

export type AdminPlatformAdminDetailPayload = {
  admin: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    role: string;
    roleValue: string;
    isActive: boolean;
    joinedLabel: string;
    lastActiveLabel: string;
  };
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
      return "Admin";
  }
}

function formatJoined(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatLastActive(iso: string | null | undefined): string {
  if (!iso) return "Never";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Never";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "Never";
  }
}

async function assertAdminAccess() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) return false;

  const secret = await createSupabaseSecretClient();
  const { data: admin } = await secret
    .from("admins")
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  return Boolean(admin?.is_active);
}

export async function fetchAdminPlatformAdminDetail(
  adminId: string,
): Promise<AdminPlatformAdminDetailPayload | null> {
  const isAdmin = await assertAdminAccess();
  if (!isAdmin) return null;

  const secret = await createSupabaseSecretClient();

  const { data: row, error } = await secret
    .from("admins")
    .select(
      "id, first_name, last_name, email, phone, role, is_active, created_at",
    )
    .eq("id", adminId)
    .maybeSingle();

  if (error || !row) {
    console.error("[fetchAdminPlatformAdminDetail]", error);
    return null;
  }

  const { data: latestLog } = await secret
    .from("acitivity_logs")
    .select("created_at")
    .eq("admin_id", adminId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const roleValue = row.role?.trim() || "admin";

  return {
    admin: {
      id: row.id,
      firstName: row.first_name?.trim() ?? "",
      lastName: row.last_name?.trim() ?? "",
      email: row.email?.trim() ?? "",
      phone: row.phone?.trim() || null,
      role: formatAdminRole(roleValue),
      roleValue,
      isActive: row.is_active,
      joinedLabel: formatJoined(row.created_at),
      lastActiveLabel: formatLastActive(latestLog?.created_at),
    },
  };
}
