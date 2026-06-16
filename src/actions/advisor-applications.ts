"use server";

import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import {
  assertAdvisorAccess,
  assertAdvisorAssignedApplication,
} from "@/lib/advisor-access";
import type { Database } from "@/database.types";
import {
  APPLICATION_ADMISSION_STATUS_LABEL,
  parseApplicationAdmissionStatus,
} from "@/lib/application-admission-status";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

const VALID_STATUSES = new Set<string>([
  "new",
  "scheduled",
  "in_progress",
  "blocked",
  "submitted",
]);

type AdvisorApplicationActionResult = { ok: true } | { ok: false; error: string };

function parseApplicationId(raw: string): number | null {
  const id = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(id) || id < 1) return null;
  return id;
}

function statusLabel(status: ApplicationStatus): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildStatusTimestampPatch(
  status: ApplicationStatus,
  now: string,
): Partial<Database["public"]["Tables"]["applications"]["Update"]> {
  switch (status) {
    case "scheduled":
      return { scheduled_at: now };
    case "in_progress":
      return { in_progress_at: now };
    case "blocked":
      return { blocked_at: now };
    case "submitted":
      return { submitted_at: now };
    default:
      return {};
  }
}

async function insertApplicationActivityLog(input: {
  applicationId: number;
  studentId: string;
  action: string;
  message: string;
}) {
  const secret = await createSupabaseSecretClient();
  const { error } = await secret.from("acitivity_logs").insert({
    entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
    entity_id: applicationActivityEntityId(input.applicationId),
    action: input.action,
    message: input.message,
    created_by_type: "admin",
    admin_id: null,
    school_admin_id: null,
    student_id: input.studentId,
  });

  if (error) {
    console.error("[advisor-applications] activity log", error);
  }
}

function revalidateApplicationPaths(applicationId: number) {
  revalidatePath("/advisor/applications");
  revalidatePath(`/advisor/applications/${applicationId}`);
  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);
}

export async function updateAdvisorApplicationStatus(
  applicationIdRaw: string,
  statusRaw: string,
): Promise<AdvisorApplicationActionResult> {
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

  const status = statusRaw.trim() as ApplicationStatus;
  if (!VALID_STATUSES.has(status)) {
    return { ok: false, error: "Select a valid status." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: existing, error: fetchErr } = await secret
    .from("applications")
    .select("id, student_id, status")
    .eq("id", applicationId)
    .eq("assigned_to", access.advisorId)
    .maybeSingle();

  if (fetchErr || !existing) {
    console.error("[updateAdvisorApplicationStatus] fetch", fetchErr);
    return { ok: false, error: "Application not found." };
  }

  if (existing.status === status) {
    return { ok: true };
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await secret
    .from("applications")
    .update({
      status,
      updated_at: now,
      ...buildStatusTimestampPatch(status, now),
    })
    .eq("id", applicationId)
    .eq("assigned_to", access.advisorId);

  if (updateErr) {
    console.error("[updateAdvisorApplicationStatus] update", updateErr);
    return { ok: false, error: "Could not update application status." };
  }

  const fromLabel = existing.status ? statusLabel(existing.status) : "Unknown";
  const toLabel = statusLabel(status);

  await insertApplicationActivityLog({
    applicationId,
    studentId: existing.student_id,
    action: "application_status_updated",
    message: `${access.advisorName} changed application #${applicationId} status from ${fromLabel} to ${toLabel}.`,
  });

  revalidateApplicationPaths(applicationId);
  return { ok: true };
}

export async function updateAdvisorApplicationAdmissionStatus(
  applicationIdRaw: string,
  admissionStatusRaw: string,
): Promise<AdvisorApplicationActionResult> {
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

  const admissionStatus = parseApplicationAdmissionStatus(admissionStatusRaw);
  if (!admissionStatus) {
    return { ok: false, error: "Select a valid admission status." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: existing, error: fetchErr } = await secret
    .from("applications")
    .select("id, student_id, admission_status")
    .eq("id", applicationId)
    .eq("assigned_to", access.advisorId)
    .maybeSingle();

  if (fetchErr || !existing) {
    console.error("[updateAdvisorApplicationAdmissionStatus] fetch", fetchErr);
    return { ok: false, error: "Application not found." };
  }

  if (existing.admission_status === admissionStatus) {
    return { ok: true };
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await secret
    .from("applications")
    .update({
      admission_status: admissionStatus,
      updated_at: now,
    })
    .eq("id", applicationId)
    .eq("assigned_to", access.advisorId);

  if (updateErr) {
    console.error("[updateAdvisorApplicationAdmissionStatus] update", updateErr);
    return { ok: false, error: "Could not update admission status." };
  }

  const fromLabel =
    APPLICATION_ADMISSION_STATUS_LABEL[
      (existing.admission_status ?? "pending") as keyof typeof APPLICATION_ADMISSION_STATUS_LABEL
    ] ?? "Pending";
  const toLabel = APPLICATION_ADMISSION_STATUS_LABEL[admissionStatus];

  await insertApplicationActivityLog({
    applicationId,
    studentId: existing.student_id,
    action: "application_admission_status_updated",
    message: `${access.advisorName} changed application #${applicationId} admission status from ${fromLabel} to ${toLabel}.`,
  });

  revalidateApplicationPaths(applicationId);
  return { ok: true };
}

export async function addAdvisorApplicationInternalNote(
  applicationIdRaw: string,
  contentRaw: string,
): Promise<AdvisorApplicationActionResult> {
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

  const content = contentRaw.trim();
  if (!content) {
    return { ok: false, error: "Note cannot be empty." };
  }
  if (content.length > 8000) {
    return { ok: false, error: "Note is too long (max 8,000 characters)." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: existing, error: fetchErr } = await secret
    .from("applications")
    .select("id, student_id")
    .eq("id", applicationId)
    .eq("assigned_to", access.advisorId)
    .maybeSingle();

  if (fetchErr || !existing) {
    console.error("[addAdvisorApplicationInternalNote] fetch", fetchErr);
    return { ok: false, error: "Application not found." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { ok: false, error: "You must be signed in." };
  }

  const now = new Date().toISOString();
  const { error: insertErr } = await secret.from("application_internal_notes").insert({
    application_id: applicationId,
    author_user_id: user.id,
    author_role: "advisor",
    author_name: access.advisorName,
    content,
    created_at: now,
  });

  if (insertErr) {
    console.error("[addAdvisorApplicationInternalNote] insert", insertErr);
    return { ok: false, error: "Could not save note." };
  }

  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", applicationId)
    .eq("assigned_to", access.advisorId);

  await insertApplicationActivityLog({
    applicationId,
    studentId: existing.student_id,
    action: "application_internal_note_added",
    message: `${access.advisorName} added an internal note on application #${applicationId}.`,
  });

  revalidateApplicationPaths(applicationId);
  return { ok: true };
}
