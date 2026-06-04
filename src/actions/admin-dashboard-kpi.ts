"use server";

import {
  fetchAdminDashboardKpiList,
  type AdminDashboardKpiListItem,
} from "@/app/(protected)/admin/_lib/fetch-admin-dashboard-kpi-list";
import type { AdminDashboardKpiKey } from "@/app/(protected)/admin/_lib/fetch-admin-dashboard";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

async function assertAdminAccess(): Promise<{ ok: true } | { ok: false; error: string }> {
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
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[admin-dashboard-kpi] admin lookup", adminError);
    return { ok: false, error: "Could not verify admin access." };
  }

  if (!admin) {
    return { ok: false, error: "You do not have permission to view this data." };
  }

  if (admin.is_active === false) {
    return { ok: false, error: "Your admin account is inactive." };
  }

  return { ok: true };
}

export async function loadAdminDashboardKpiList(
  kpiKey: AdminDashboardKpiKey,
  page: number,
  limit: number,
): Promise<
  | { ok: true; rows: AdminDashboardKpiListItem[]; totalRows: number }
  | { ok: false; error: string }
> {
  const access = await assertAdminAccess();
  if (!access.ok) {
    return { ok: false, error: access.error };
  }

  const validKeys: AdminDashboardKpiKey[] = [
    "students",
    "schools",
    "ambassador_sessions",
    "sessions",
    "applications",
  ];
  if (!validKeys.includes(kpiKey)) {
    return { ok: false, error: "Unknown metric." };
  }

  const result = await fetchAdminDashboardKpiList(kpiKey, page, limit);
  return { ok: true, rows: result.rows, totalRows: result.totalRows };
}
