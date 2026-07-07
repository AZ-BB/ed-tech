"use server";

import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type PayoutActionResult = { ok: true; updated: number } | { ok: false; error: string };

async function assertAdminAccess() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false as const, error: "You must be signed in." };
  }

  const service = await createSupabaseSecretClient();
  const { data: admin, error: adminError } = await service
    .from("admins")
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[admin-advisor-payouts] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage payouts.",
    };
  }

  if (admin.is_active === false) {
    return { ok: false as const, error: "Your admin account is inactive." };
  }

  return { ok: true as const };
}

function parsePayoutIds(raw: number[]): number[] {
  const ids = new Set<number>();
  for (const value of raw) {
    if (!Number.isFinite(value) || value < 1) continue;
    ids.add(Math.trunc(value));
  }
  return [...ids];
}

function revalidatePayoutPaths(
  rows: {
    application_id: number | null;
    post_admission_case_id?: number | null;
    advisor_id: string;
  }[],
) {
  const applicationIds = new Set<number>();
  const postAdmissionCaseIds = new Set<number>();
  const advisorIds = new Set<string>();

  for (const row of rows) {
    if (row.application_id != null) {
      applicationIds.add(row.application_id);
    }
    if (row.post_admission_case_id != null) {
      postAdmissionCaseIds.add(row.post_admission_case_id);
    }
    advisorIds.add(row.advisor_id);
  }

  for (const applicationId of applicationIds) {
    revalidatePath("/admin/applications");
    revalidatePath(`/admin/applications/${applicationId}`);
    revalidatePath("/advisor/applications");
    revalidatePath(`/advisor/applications/${applicationId}`);
  }

  for (const caseId of postAdmissionCaseIds) {
    revalidatePath("/admin/post-admission");
    revalidatePath(`/admin/post-admission/${caseId}`);
    revalidatePath("/advisor/post-admission");
    revalidatePath(`/advisor/post-admission/${caseId}`);
  }

  for (const advisorId of advisorIds) {
    revalidatePath("/admin/users/advisors");
    revalidatePath(`/admin/users/advisors/${advisorId}`);
  }
}

export async function markAdvisorPayoutsPaid(
  payoutIdsRaw: number[],
): Promise<PayoutActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const payoutIds = parsePayoutIds(payoutIdsRaw);
  if (payoutIds.length === 0) {
    return { ok: false, error: "Select at least one payout." };
  }

  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();

  const { data: pendingRows, error: fetchErr } = await secret
    .from("advisor_payouts")
    .select("id, application_id, post_admission_case_id, advisor_id, status")
    .in("id", payoutIds)
    .eq("status", "pending");

  if (fetchErr) {
    console.error("[markAdvisorPayoutsPaid] fetch", fetchErr);
    return { ok: false, error: "Could not load payouts." };
  }

  if (!pendingRows || pendingRows.length === 0) {
    return { ok: false, error: "No pending payouts selected." };
  }

  const pendingIds = pendingRows.map((row) => row.id);

  const { data: updatedRows, error: updateErr } = await secret
    .from("advisor_payouts")
    .update({
      status: "paid",
      paid_at: now,
      updated_at: now,
    })
    .in("id", pendingIds)
    .eq("status", "pending")
    .select("application_id, post_admission_case_id, advisor_id");

  if (updateErr) {
    console.error("[markAdvisorPayoutsPaid] update", updateErr);
    return { ok: false, error: "Could not mark payouts as paid." };
  }

  revalidatePayoutPaths(updatedRows ?? pendingRows);

  return { ok: true, updated: updatedRows?.length ?? pendingRows.length };
}

export async function cancelAdvisorPayout(
  payoutIdRaw: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const payoutId = Math.trunc(payoutIdRaw);
  if (!Number.isFinite(payoutId) || payoutId < 1) {
    return { ok: false, error: "Invalid payout." };
  }

  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();

  const { data: row, error: fetchErr } = await secret
    .from("advisor_payouts")
    .select("id, application_id, post_admission_case_id, advisor_id, status")
    .eq("id", payoutId)
    .maybeSingle();

  if (fetchErr || !row) {
    return { ok: false, error: "Payout not found." };
  }

  if (row.status !== "pending") {
    return { ok: false, error: "Only pending payouts can be canceled." };
  }

  const { error: updateErr } = await secret
    .from("advisor_payouts")
    .update({
      status: "canceled",
      updated_at: now,
    })
    .eq("id", payoutId)
    .eq("status", "pending");

  if (updateErr) {
    console.error("[cancelAdvisorPayout] update", updateErr);
    return { ok: false, error: "Could not cancel payout." };
  }

  revalidatePayoutPaths([row]);
  return { ok: true };
}
