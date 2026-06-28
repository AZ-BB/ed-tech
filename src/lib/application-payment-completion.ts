import "server-only";

import {
  applyFirstPaymentCompletedStatusEffects,
} from "@/lib/application-support-status-transitions";
import {
  parseApplicationPackageData,
  type ApplicationPackageData,
} from "@/lib/application-package-data";
import { updateApplicationPackageDataCore } from "@/lib/application-package-actions-core";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

/**
 * When a payment is completed, mark the package lifecycle step "Payment confirmed"
 * and move the application to payment_completed on the first paid payment.
 */
export async function applyApplicationPaymentCompletionEffects(
  secret: SecretClient,
  applicationId: number,
  completedAt: string,
  options?: { isFirstPayment?: boolean },
): Promise<void> {
  const { data: application, error } = await secret
    .from("applications")
    .select("status, package_data")
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

  let isFirstPayment = options?.isFirstPayment;
  if (isFirstPayment === undefined) {
    const { count, error: countErr } = await secret
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("application_id", applicationId)
      .eq("status", "paid");

    if (countErr) {
      console.error("[application-payment-completion] paid count", countErr);
      isFirstPayment = false;
    } else {
      isFirstPayment = (count ?? 0) <= 1;
    }
  }

  await applyFirstPaymentCompletedStatusEffects(
    secret,
    applicationId,
    completedAt,
    isFirstPayment,
  );
}
