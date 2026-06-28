import "server-only";

import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type ApplicationSupportStatus =
  Database["public"]["Enums"]["application_status"];

export const APPLICATION_SUPPORT_STATUSES_AT_OR_PAST_PAYMENT_IN_PROGRESS =
  new Set<ApplicationSupportStatus>([
    "payment_in_progress",
    "payment_completed",
    "in_progress",
    "submitted",
  ]);

export const APPLICATION_SUPPORT_STATUSES_AT_OR_PAST_PAYMENT_COMPLETED =
  new Set<ApplicationSupportStatus>([
    "payment_completed",
    "in_progress",
    "submitted",
  ]);

export function buildApplicationSupportStatusTimestampPatch(
  status: ApplicationSupportStatus,
  now: string,
): Partial<Database["public"]["Tables"]["applications"]["Update"]> {
  switch (status) {
    case "scheduled":
      return { scheduled_at: now };
    case "payment_in_progress":
      return { payment_in_progress_at: now };
    case "payment_completed":
      return { payment_completed_at: now };
    case "in_progress":
      return { in_progress_at: now };
    case "blocked":
      return { blocked_at: now };
    case "submitted":
      return { submitted_at: now };
    default:
      return {};
  }
}

/** First payment request sent → payment_in_progress. */
export async function applyFirstPaymentRequestStatusEffects(
  secret: SecretClient,
  applicationId: number,
  at: string,
): Promise<void> {
  const { data: application, error } = await secret
    .from("applications")
    .select("status, payment_in_progress_at")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !application) {
    console.error("[application-support-status] load application for payment request", error);
    return;
  }

  const currentStatus = (application.status?.trim() || "new") as ApplicationSupportStatus;
  if (APPLICATION_SUPPORT_STATUSES_AT_OR_PAST_PAYMENT_IN_PROGRESS.has(currentStatus)) {
    return;
  }

  const { error: updateErr } = await secret
    .from("applications")
    .update({
      status: "payment_in_progress",
      payment_in_progress_at: application.payment_in_progress_at ?? at,
      updated_at: at,
    })
    .eq("id", applicationId);

  if (updateErr) {
    console.error("[application-support-status] payment_in_progress update", updateErr);
  }
}

/** First payment completed → payment_completed (package lifecycle still updated separately). */
export async function applyFirstPaymentCompletedStatusEffects(
  secret: SecretClient,
  applicationId: number,
  completedAt: string,
  isFirstPayment: boolean,
): Promise<void> {
  if (!isFirstPayment) return;

  const { data: application, error } = await secret
    .from("applications")
    .select("status, payment_completed_at")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !application) {
    console.error("[application-support-status] load application for payment completed", error);
    return;
  }

  const currentStatus = (application.status?.trim() || "new") as ApplicationSupportStatus;
  if (APPLICATION_SUPPORT_STATUSES_AT_OR_PAST_PAYMENT_COMPLETED.has(currentStatus)) {
    return;
  }

  const { error: updateErr } = await secret
    .from("applications")
    .update({
      status: "payment_completed",
      payment_completed_at: application.payment_completed_at ?? completedAt,
      updated_at: completedAt,
    })
    .eq("id", applicationId);

  if (updateErr) {
    console.error("[application-support-status] payment_completed update", updateErr);
  }
}
