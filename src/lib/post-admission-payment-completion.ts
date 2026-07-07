import "server-only";

import { applyFirstPostAdmissionPaymentCompletedStatusEffects } from "@/lib/post-admission-status-transitions";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export async function applyPostAdmissionPaymentCompletionEffects(
  secret: SecretClient,
  caseId: number,
  completedAt: string,
  options?: { isFirstPayment?: boolean },
): Promise<void> {
  let isFirstPayment = options?.isFirstPayment;
  if (isFirstPayment === undefined) {
    const { count, error: countErr } = await secret
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("post_admission_case_id", caseId)
      .eq("status", "paid");

    if (countErr) {
      console.error("[post-admission-payment-completion] paid count", countErr);
      isFirstPayment = false;
    } else {
      isFirstPayment = (count ?? 0) <= 1;
    }
  }

  await applyFirstPostAdmissionPaymentCompletedStatusEffects(
    secret,
    caseId,
    completedAt,
    isFirstPayment,
  );
}
