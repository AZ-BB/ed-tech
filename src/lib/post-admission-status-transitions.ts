import "server-only";

import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { PostAdmissionStatus } from "@/lib/post-admission-status-labels";

export type { PostAdmissionStatus } from "@/lib/post-admission-status-labels";
export { ACTIVE_POST_ADMISSION_STATUSES } from "@/lib/post-admission-status-labels";

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export const POST_ADMISSION_STATUSES_AT_OR_PAST_PAYMENT_REQUESTED =
  new Set<PostAdmissionStatus>(["payment_requested", "active", "completed"]);

export const POST_ADMISSION_STATUSES_AT_OR_PAST_ACTIVE = new Set<PostAdmissionStatus>([
  "active",
  "completed",
]);

export function buildPostAdmissionStatusTimestampPatch(
  status: PostAdmissionStatus,
  now: string,
): Partial<Database["public"]["Tables"]["post_admission_cases"]["Update"]> {
  switch (status) {
    case "payment_requested":
      return { payment_in_progress_at: now };
    case "active":
      return { payment_completed_at: now };
    case "completed":
      return { completed_at: now };
    case "not_suitable":
      return { blocked_at: now };
    default:
      return {};
  }
}

export async function applyFirstPostAdmissionPaymentRequestStatusEffects(
  secret: SecretClient,
  caseId: number,
  at: string,
): Promise<void> {
  const { data: row, error } = await secret
    .from("post_admission_cases")
    .select("status, payment_in_progress_at")
    .eq("id", caseId)
    .maybeSingle();

  if (error || !row) {
    console.error("[post-admission-status] load case for payment request", error);
    return;
  }

  const currentStatus = (row.status?.trim() || "lead") as PostAdmissionStatus;
  if (
    currentStatus === "not_suitable" ||
    POST_ADMISSION_STATUSES_AT_OR_PAST_PAYMENT_REQUESTED.has(currentStatus)
  ) {
    return;
  }

  const { error: updateErr } = await secret
    .from("post_admission_cases")
    .update({
      status: "payment_requested",
      payment_in_progress_at: row.payment_in_progress_at ?? at,
      updated_at: at,
    })
    .eq("id", caseId);

  if (updateErr) {
    console.error("[post-admission-status] payment_requested update", updateErr);
  }
}

export async function applyFirstPostAdmissionPaymentCompletedStatusEffects(
  secret: SecretClient,
  caseId: number,
  completedAt: string,
  isFirstPayment: boolean,
): Promise<void> {
  if (!isFirstPayment) return;

  const { data: row, error } = await secret
    .from("post_admission_cases")
    .select("status, payment_completed_at")
    .eq("id", caseId)
    .maybeSingle();

  if (error || !row) {
    console.error("[post-admission-status] load case for payment completed", error);
    return;
  }

  const currentStatus = (row.status?.trim() || "lead") as PostAdmissionStatus;
  if (
    currentStatus === "not_suitable" ||
    POST_ADMISSION_STATUSES_AT_OR_PAST_ACTIVE.has(currentStatus)
  ) {
    return;
  }

  const { error: updateErr } = await secret
    .from("post_admission_cases")
    .update({
      status: "active",
      payment_completed_at: row.payment_completed_at ?? completedAt,
      updated_at: completedAt,
    })
    .eq("id", caseId);

  if (updateErr) {
    console.error("[post-admission-status] active update", updateErr);
  }
}
