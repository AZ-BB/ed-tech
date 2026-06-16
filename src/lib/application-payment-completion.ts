import "server-only";

import {
  parseApplicationPackageData,
  type ApplicationPackageData,
} from "@/lib/application-package-data";
import { updateApplicationPackageDataCore } from "@/lib/application-package-actions-core";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

const STATUSES_AFTER_PAYMENT = new Set(["in_progress", "submitted"]);

/**
 * When a payment is completed, move the application into active work (in_progress)
 * and mark the package lifecycle step "Payment confirmed".
 */
export async function applyApplicationPaymentCompletionEffects(
  secret: SecretClient,
  applicationId: number,
  completedAt: string,
): Promise<void> {
  const { data: application, error } = await secret
    .from("applications")
    .select("status, package_data, in_progress_at")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !application) {
    console.error("[application-payment-completion] load application", error);
    return;
  }

  const packageData = parseApplicationPackageData(application.package_data);
  const packagePatch: Partial<ApplicationPackageData> = {
    lifecycle: {
      ...packageData.lifecycle,
      payment_confirmed: true,
    },
  };

  if (!packageData.startedAt) {
    packagePatch.startedAt = completedAt;
  }

  const packageResult = await updateApplicationPackageDataCore(
    secret,
    applicationId,
    packagePatch,
  );

  if (!packageResult.ok) {
    console.error(
      "[application-payment-completion] package update",
      packageResult.error,
    );
  }

  const currentStatus = application.status?.trim() || "new";
  if (STATUSES_AFTER_PAYMENT.has(currentStatus)) {
    return;
  }

  const { error: statusErr } = await secret
    .from("applications")
    .update({
      status: "in_progress",
      in_progress_at: application.in_progress_at ?? completedAt,
      updated_at: completedAt,
    })
    .eq("id", applicationId);

  if (statusErr) {
    console.error("[application-payment-completion] status update", statusErr);
  }
}
