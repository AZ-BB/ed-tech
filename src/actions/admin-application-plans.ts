"use server";

import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { assertAdminPermission } from "@/lib/assert-admin-permission";
import { revalidatePath } from "next/cache";

type AdminApplicationPlanActionResult = { ok: true } | { ok: false; error: string };

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
    console.error("[admin-application-plans] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return { ok: false as const, error: "You do not have permission to manage plans." };
  }

  if (admin.is_active === false) {
    return { ok: false as const, error: "Your admin account is inactive." };
  }

  return { ok: true as const, userId: user.id };
}

function revalidatePlanPaths() {
  revalidatePath("/admin/settings");
  revalidatePath("/student/application-support");
}

export async function createAdminApplicationPlan(
  formData: FormData,
): Promise<AdminApplicationPlanActionResult> {
  const access = await assertAdminPermission("edit_system_plans");
  if (!access.ok) return access;

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const priceRaw = String(formData.get("price") ?? "").trim();
  const universitiesCountRaw = String(formData.get("universitiesCount") ?? "").trim();
  const isMostPopular = formData.get("isMostPopular") === "on";

  if (!name) {
    return { ok: false, error: "Plan name is required." };
  }

  const price = Number.parseInt(priceRaw, 10);
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: "Price must be a non-negative number." };
  }

  const universitiesCount = Number.parseInt(universitiesCountRaw, 10);
  if (!Number.isFinite(universitiesCount) || universitiesCount <= 0) {
    return { ok: false, error: "Universities count must be a positive number." };
  }

  const service = await createSupabaseSecretClient();

  const { data: existingActive, error: existingError } = await service
    .from("applications_plans")
    .select("id")
    .eq("universities_count", universitiesCount)
    .eq("is_active", true)
    .maybeSingle();

  if (existingError) {
    console.error("[admin-application-plans] duplicate check", existingError);
    return { ok: false, error: "Could not verify plan configuration." };
  }

  if (existingActive) {
    return {
      ok: false,
      error: "An active plan with this universities count already exists.",
    };
  }

  if (isMostPopular) {
    const { error: unsetError } = await service
      .from("applications_plans")
      .update({ is_most_popular: false, updated_at: new Date().toISOString() })
      .eq("is_most_popular", true);

    if (unsetError) {
      console.error("[admin-application-plans] unset most popular", unsetError);
      return { ok: false, error: "Could not update plan popularity." };
    }
  }

  const { error: insertError } = await service.from("applications_plans").insert({
    name,
    description,
    price,
    universities_count: universitiesCount,
    is_most_popular: isMostPopular,
    is_active: true,
  });

  if (insertError) {
    console.error("[admin-application-plans] create", insertError);
    return { ok: false, error: "Could not create plan." };
  }

  revalidatePlanPaths();
  return { ok: true };
}

export async function setAdminApplicationPlanActive(
  planId: number,
  isActive: boolean,
): Promise<AdminApplicationPlanActionResult> {
  const access = await assertAdminPermission("edit_system_plans");
  if (!access.ok) return access;

  if (!Number.isFinite(planId) || planId <= 0) {
    return { ok: false, error: "Invalid plan." };
  }

  const service = await createSupabaseSecretClient();

  if (isActive) {
    const { data: plan, error: planError } = await service
      .from("applications_plans")
      .select("universities_count")
      .eq("id", planId)
      .maybeSingle();

    if (planError || !plan) {
      return { ok: false, error: "Plan not found." };
    }

    const { data: conflict, error: conflictError } = await service
      .from("applications_plans")
      .select("id")
      .eq("universities_count", plan.universities_count)
      .eq("is_active", true)
      .neq("id", planId)
      .maybeSingle();

    if (conflictError) {
      console.error("[admin-application-plans] conflict check", conflictError);
      return { ok: false, error: "Could not verify plan configuration." };
    }

    if (conflict) {
      return {
        ok: false,
        error: "Another active plan with the same universities count already exists.",
      };
    }
  }

  const { error } = await service
    .from("applications_plans")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", planId);

  if (error) {
    console.error("[admin-application-plans] set active", error);
    return { ok: false, error: "Could not update plan status." };
  }

  revalidatePlanPaths();
  return { ok: true };
}
