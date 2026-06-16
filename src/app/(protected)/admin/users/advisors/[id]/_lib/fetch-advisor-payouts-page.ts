import { fetchAdvisorPayoutsPage } from "@/lib/advisor-payouts/fetch-application-payouts";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

import type { AdminAdvisorPayoutsTabProps } from "../_components/admin-advisor-payouts-tab";

async function assertAdminAccess() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) return false;

  const secret = await createSupabaseSecretClient();
  const { data: admin } = await secret
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return Boolean(admin);
}

export async function fetchAdminAdvisorPayoutsPanel(
  advisorId: string,
  options?: { page?: number },
): Promise<AdminAdvisorPayoutsTabProps | null> {
  const isAdmin = await assertAdminAccess();
  if (!isAdmin) return null;

  const secret = await createSupabaseSecretClient();
  const result = await fetchAdvisorPayoutsPage(secret, advisorId, {
    page: options?.page ?? 1,
    pageSize: 20,
  });

  return {
    advisorId,
    rows: result.rows,
    summary: result.summary,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  };
}
