"use server";

import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

import { fetchAdminReportsOverview } from "../_lib/fetch-admin-reports-overview";
import { reportDateBoundsFromInputs } from "../_lib/report-date-range";
import type { AdminReportsOverview } from "../_lib/report-payloads";

export type FetchOverviewInput = {
  schoolId: string;
  startDate: string;
  endDate: string;
};

export type FetchOverviewResult =
  | { ok: true; overview: AdminReportsOverview }
  | { ok: false; error: string };

async function assertActiveAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return false;
  const service = await createSupabaseSecretClient();
  const { data: profile } = await service
    .from("admins")
    .select("is_active")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.is_active !== false;
}

export async function fetchAdminReportsOverviewAction(
  input: FetchOverviewInput,
): Promise<FetchOverviewResult> {
  if (!(await assertActiveAdmin())) {
    return { ok: false, error: "Unauthorized" };
  }
  const bounds = reportDateBoundsFromInputs(
    input.startDate?.trim() ?? "",
    input.endDate?.trim() ?? "",
  );
  if (!bounds) {
    return { ok: false, error: "Invalid date range" };
  }
  const overview = await fetchAdminReportsOverview(
    input.schoolId?.trim() ?? "",
    bounds,
  );
  return { ok: true, overview };
}
