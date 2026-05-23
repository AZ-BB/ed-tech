"use server";

import { revalidatePath } from "next/cache";

import {
  creditLimitExceedsPoolMessage,
  schoolAvailableCreditPool,
} from "@/lib/school-credit-pool";
import type { GeneralResponse } from "@/utils/response";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import { requireSchoolAdminContext } from "./school-settings-helpers";

function parseOptionalInt(
  raw: FormDataEntryValue | null,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const s = String(raw ?? "").trim();
  if (s === "") return { ok: true, value: null };
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0) {
    return { ok: false, error: "Enter whole numbers (0 or higher) for credit limits." };
  }
  return { ok: true, value: n };
}

export async function updateSchoolDefaultCreditLimitsAction(
  _prev: GeneralResponse<null> | null,
  formData: FormData,
): Promise<GeneralResponse<null>> {
  const ctx = await requireSchoolAdminContext();
  if ("error" in ctx) {
    return { data: null, error: ctx.error };
  }

  const amb = parseOptionalInt(formData.get("default_ambassador_credit_limit"));
  if (!amb.ok) return { data: null, error: amb.error };
  const adv = parseOptionalInt(formData.get("default_advisor_credit_limit"));
  if (!adv.ok) return { data: null, error: adv.error };

  const supabase = await createSupabaseServerClient();
  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("credit_pool, extra_credits")
    .eq("id", ctx.schoolId)
    .maybeSingle();

  if (schoolError) {
    console.error("[school-credits] school pool", schoolError);
    return { data: null, error: "Could not verify the school credit pool." };
  }

  const availablePool = schoolAvailableCreditPool(
    school?.credit_pool,
    school?.extra_credits,
  );

  if (amb.value != null) {
    const poolMsg = creditLimitExceedsPoolMessage(
      amb.value,
      availablePool,
      "Ambassador credit limit",
    );
    if (poolMsg) return { data: null, error: poolMsg };
  }

  if (adv.value != null) {
    const poolMsg = creditLimitExceedsPoolMessage(
      adv.value,
      availablePool,
      "Advisor credit limit",
    );
    if (poolMsg) return { data: null, error: poolMsg };
  }
  const { error } = await supabase
    .from("schools")
    .update({
      default_ambasador_credit_limit: amb.value,
      default_advisor_credit_limit: adv.value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.schoolId);

  if (error) {
    console.error("[school-credits] update default limits", error);
    return { data: null, error: "Could not save credit limits." };
  }

  revalidatePath("/school", "layout");
  revalidatePath("/school/settings");
  revalidatePath("/school/students", "layout");
  return { data: null, error: null };
}
