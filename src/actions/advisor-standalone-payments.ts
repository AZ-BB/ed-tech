"use server";

import { assertAdvisorAccess } from "@/lib/advisor-access";
import { createStandalonePaymentLinkCore } from "@/lib/standalone-payment-core";
import type { StandalonePaymentLinkInput } from "@/lib/standalone-payment-types";
import { revalidatePath } from "next/cache";

type AdvisorStandalonePaymentLinkResult =
  | { ok: true; payUrl: string }
  | { ok: false; error: string };

export async function createAdvisorStandalonePaymentLink(
  input: StandalonePaymentLinkInput,
): Promise<AdvisorStandalonePaymentLinkResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const result = await createStandalonePaymentLinkCore({
    input,
    createdByAdvisorId: access.advisorId,
  });

  if (result.ok) {
    revalidatePath("/advisor/payments");
  }

  return result;
}
