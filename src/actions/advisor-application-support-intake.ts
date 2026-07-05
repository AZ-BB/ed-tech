"use server";

import {
  assertAdvisorAccess,
  assertAdvisorAssignedApplication,
} from "@/lib/advisor-access";
import {
  fetchActivePlanByUniversitiesCount,
  mapApplicationSupportPayloadToApplicationFields,
  validateApplicationSupportPayload,
  type ApplicationSupportPayload,
} from "@/lib/application-support-intake";
import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  ADVISOR_APPLICATION_ACTIVITY_LOG_CREATED_BY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

export type AdvisorApplicationSupportIntakeResult =
  | { ok: true }
  | { ok: false; error: string };

function parseApplicationId(raw: string): number | null {
  const id = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(id) || id < 1) return null;
  return id;
}

function revalidateAdvisorApplicationPaths(applicationId: number, sessionId?: number) {
  revalidatePath("/advisor/applications");
  revalidatePath(`/advisor/applications/${applicationId}`);
  revalidatePath("/advisor/sessions-and-calls");
  if (sessionId != null) {
    revalidatePath(`/advisor/sessions-and-calls/session/${sessionId}`);
  }
}

export async function updateAdvisorApplicationSupportIntake(
  applicationIdRaw: string,
  payload: ApplicationSupportPayload,
  sessionIdRaw?: string,
): Promise<AdvisorApplicationSupportIntakeResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (applicationId == null) {
    return { ok: false, error: "Invalid application." };
  }

  const assignment = await assertAdvisorAssignedApplication(
    access.advisorId,
    applicationId,
  );
  if (!assignment.ok) return assignment;

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
    console.error("[updateAdvisorApplicationSupportIntake]", updateErr);
    return { ok: false, error: "Could not save application support details." };
  }

  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
    entity_id: applicationActivityEntityId(applicationId),
    action: "application_support_intake_updated",
    message: `${access.advisorName} updated application support intake on application #${applicationId}.`,
    created_by_type: ADVISOR_APPLICATION_ACTIVITY_LOG_CREATED_BY_TYPE,
    admin_id: null,
    school_admin_id: null,
    student_id: existing.student_id,
  });
  if (logErr) {
    console.error("[updateAdvisorApplicationSupportIntake] activity log", logErr);
  }

  const sessionId = sessionIdRaw ? parseApplicationId(sessionIdRaw) : null;
  revalidateAdvisorApplicationPaths(applicationId, sessionId ?? undefined);

  return { ok: true };
}
