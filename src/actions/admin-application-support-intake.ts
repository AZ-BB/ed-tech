"use server";

import {
  fetchActivePlanByUniversitiesCount,
  mapApplicationSupportPayloadToApplicationFields,
  validateApplicationSupportPayload,
  type ApplicationSupportPayload,
} from "@/lib/application-support-intake";
import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

export type AdminApplicationSupportIntakeResult =
  | { ok: true }
  | { ok: false; error: string };

function parseApplicationId(raw: string): number | null {
  const id = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(id) || id < 1) return null;
  return id;
}

async function assertAdminAccess() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false as const, error: "You must be signed in." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: admin, error: adminError } = await secret
    .from("admins")
    .select("id, first_name, last_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[admin-application-support-intake] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return { ok: false as const, error: "You do not have permission to manage applications." };
  }

  if (admin.is_active === false) {
    return { ok: false as const, error: "Your admin account is inactive." };
  }

  return {
    ok: true as const,
    userId: user.id,
    actorName:
      [admin.first_name, admin.last_name].filter(Boolean).join(" ").trim() || "Admin",
  };
}

function revalidateAdminApplicationPaths(applicationId: number) {
  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/advisor/applications");
  revalidatePath(`/advisor/applications/${applicationId}`);
}

export async function updateAdminApplicationSupportIntake(
  applicationIdRaw: string,
  payload: ApplicationSupportPayload,
): Promise<AdminApplicationSupportIntakeResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (applicationId == null) {
    return { ok: false, error: "Invalid application." };
  }

  const validationError = validateApplicationSupportPayload(payload);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const secret = await createSupabaseSecretClient();
  const plan = await fetchActivePlanByUniversitiesCount(
    secret,
    payload.planUniversitiesCount,
  );
  if (!plan) {
    return {
      ok: false,
      error: "Application plans are not configured. Please contact support.",
    };
  }

  const { data: existing, error: fetchErr } = await secret
    .from("applications")
    .select("student_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { ok: false, error: "Application not found." };
  }

  const mapped = mapApplicationSupportPayloadToApplicationFields(payload, plan);
  const now = new Date().toISOString();

  const { error: updateErr } = await secret
    .from("applications")
    .update({
      ...mapped,
      updated_at: now,
    })
    .eq("id", applicationId);

  if (updateErr) {
    console.error("[updateAdminApplicationSupportIntake]", updateErr);
    return { ok: false, error: "Could not save application support details." };
  }

  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
    entity_id: applicationActivityEntityId(applicationId),
    action: "application_support_intake_updated",
    message: `${access.actorName} updated application support intake on application #${applicationId}.`,
    created_by_type: "admin",
    admin_id: access.userId,
    school_admin_id: null,
    student_id: existing.student_id,
  });
  if (logErr) {
    console.error("[updateAdminApplicationSupportIntake] activity log", logErr);
  }

  revalidateAdminApplicationPaths(applicationId);
  return { ok: true };
}
