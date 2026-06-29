import "server-only";

import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type ApplicationSupportStatus =
  Database["public"]["Enums"]["application_status"];

export const APPLICATION_SUPPORT_STATUSES_AT_OR_PAST_PAYMENT_REQUESTED =
  new Set<ApplicationSupportStatus>([
    "payment_requested",
    "active_package",
  ]);

export const APPLICATION_SUPPORT_STATUSES_AT_OR_PAST_ACTIVE_PACKAGE =
  new Set<ApplicationSupportStatus>(["active_package"]);

export function buildApplicationSupportStatusTimestampPatch(
  status: ApplicationSupportStatus,
  now: string,
): Partial<Database["public"]["Tables"]["applications"]["Update"]> {
  switch (status) {
    case "payment_requested":
      return { payment_in_progress_at: now };
    case "active_package":
      return { payment_completed_at: now };
    case "not_suitable":
      return { blocked_at: now };
    default:
      return {};
  }
}

/** First payment request sent → payment_requested. */
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

  const currentStatus = (application.status?.trim() || "lead") as ApplicationSupportStatus;
  if (
    currentStatus === "not_suitable" ||
    APPLICATION_SUPPORT_STATUSES_AT_OR_PAST_PAYMENT_REQUESTED.has(currentStatus)
  ) {
    return;
  }

  const { error: updateErr } = await secret
    .from("applications")
    .update({
      status: "payment_requested",
      payment_in_progress_at: application.payment_in_progress_at ?? at,
      updated_at: at,
    })
    .eq("id", applicationId);

  if (updateErr) {
    console.error("[application-support-status] payment_requested update", updateErr);
  }
}

/** First payment completed → active_package (package lifecycle still updated separately). */
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

  const currentStatus = (application.status?.trim() || "lead") as ApplicationSupportStatus;
  if (
    currentStatus === "not_suitable" ||
    APPLICATION_SUPPORT_STATUSES_AT_OR_PAST_ACTIVE_PACKAGE.has(currentStatus)
  ) {
    return;
  }

  const { error: updateErr } = await secret
    .from("applications")
    .update({
      status: "active_package",
      payment_completed_at: application.payment_completed_at ?? completedAt,
      updated_at: completedAt,
    })
    .eq("id", applicationId);

  if (updateErr) {
    console.error("[application-support-status] active_package update", updateErr);
  }
}
