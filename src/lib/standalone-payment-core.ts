import "server-only";

import { defaultPaymentDueDateString } from "@/lib/payment-request-utils";
import { buildStandalonePaymentUrl } from "@/lib/resend/site-url";
import type { StandalonePaymentLinkInput } from "@/lib/standalone-payment-types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { randomUUID } from "crypto";

export type StandalonePaymentLinkResult =
  | { ok: true; payUrl: string }
  | { ok: false; error: string };

function validateAmount(amountAed: number): string | null {
  if (!Number.isFinite(amountAed) || amountAed <= 0) {
    return "Enter a valid amount greater than zero.";
  }
  return null;
}

type StandalonePaymentCreator =
  | { createdByAdvisorId: string; createdByAdminId?: never }
  | { createdByAdminId: string; createdByAdvisorId?: never };

export async function createStandalonePaymentLinkCore(
  options: {
    input: StandalonePaymentLinkInput;
  } & StandalonePaymentCreator,
): Promise<StandalonePaymentLinkResult> {
  const amountError = validateAmount(options.input.amountAed);
  if (amountError) {
    return { ok: false, error: amountError };
  }

  const secret = await createSupabaseSecretClient();
  const token = randomUUID();
  const now = new Date().toISOString();
  const dueDate = defaultPaymentDueDateString();

  const { error: insertErr } = await secret.from("standalone_payments").insert({
    payment_request_token: token,
    amount: options.input.amountAed,
    status: "pending",
    due_date: dueDate,
    created_by_advisor_id: options.createdByAdvisorId ?? null,
    created_by_admin_id: options.createdByAdminId ?? null,
    created_at: now,
    updated_at: now,
  });

  if (insertErr) {
    console.error("[createStandalonePaymentLinkCore] insert", insertErr);
    return { ok: false, error: "Could not create payment link." };
  }

  const payUrl = await buildStandalonePaymentUrl(token);
  return { ok: true, payUrl };
}
