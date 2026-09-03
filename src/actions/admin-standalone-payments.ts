"use server";

import { createStandalonePaymentLinkCore } from "@/lib/standalone-payment-core";
import type { StandalonePaymentLinkInput } from "@/lib/standalone-payment-types";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type AdminStandalonePaymentLinkResult =
  | { ok: true; payUrl: string }
  | { ok: false; error: string };

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
    console.error("[admin-standalone-payments] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage payments.",
    };
  }

  if (admin.is_active === false) {
    return { ok: false as const, error: "Your admin account is inactive." };
  }

  return { ok: true as const, adminId: user.id };
}

export async function createAdminStandalonePaymentLink(
  input: StandalonePaymentLinkInput,
): Promise<AdminStandalonePaymentLinkResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const result = await createStandalonePaymentLinkCore({
    input,
    createdByAdminId: access.adminId,
  });

  if (result.ok) {
    revalidatePath("/admin/payments");
  }

  return result;
}
