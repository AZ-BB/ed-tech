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
  buildApplicationSupportStatusTimestampPatch,
} from "@/lib/application-support-status-transitions";
import { parseApplicationNoteVisibility } from "@/lib/application-internal-notes";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

const VALID_STATUSES = new Set<string>([
  "lead",
  "not_suitable",
  "payment_requested",
  "active_package",
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
) {
  return buildApplicationSupportStatusTimestampPatch(status, now);
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
  revalidatePath("/advisor/students");
  revalidatePath("/advisor/leads");
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

export async function addAdvisorApplicationInternalNote(
  applicationIdRaw: string,
  contentRaw: string,
  visibilityRaw?: string,
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

  const visibility = parseApplicationNoteVisibility(visibilityRaw);

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
    student_id: existing.student_id,
    author_user_id: user.id,
    author_role: "advisor",
    author_name: access.advisorName,
    content,
    visibility,
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

  const noteKind = visibility === "public" ? "public" : "internal";
  await insertApplicationActivityLog({
    applicationId,
    studentId: existing.student_id,
    action: "application_internal_note_added",
    message: `${access.advisorName} added a ${noteKind} note on application #${applicationId}.`,
  });

  revalidateApplicationPaths(applicationId);
  if (visibility === "public") {
    revalidatePath(`/school/students/${existing.student_id}`);
    revalidatePath(`/admin/users/students/${existing.student_id}`);
  }
  return { ok: true };
}

export async function toggleAdvisorStudentFlag(
  applicationIdRaw: string,
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

  const secret = await createSupabaseSecretClient();
  const { data: existing, error: fetchErr } = await secret
    .from("applications")
    .select("id, student_id")
    .eq("id", applicationId)
    .eq("assigned_to", access.advisorId)
    .maybeSingle();

  if (fetchErr || !existing) {
    console.error("[toggleAdvisorStudentFlag] fetch application", fetchErr);
    return { ok: false, error: "Application not found." };
  }

  const { data: studentRow, error: studentFetchErr } = await secret
    .from("student_profiles")
    .select("id, flagged")
    .eq("id", existing.student_id)
    .maybeSingle();

  if (studentFetchErr || !studentRow) {
    console.error("[toggleAdvisorStudentFlag] fetch student", studentFetchErr);
    return { ok: false, error: "Student not found." };
  }

  const nextFlagged = !studentRow.flagged;
  const now = new Date().toISOString();
  const { error: updateErr } = await secret
    .from("student_profiles")
    .update({
      flagged: nextFlagged,
      flagged_by: nextFlagged ? access.advisorId : null,
      updated_at: now,
    })
    .eq("id", existing.student_id);

  if (updateErr) {
    console.error("[toggleAdvisorStudentFlag] update", updateErr);
    return { ok: false, error: "Could not update student flag." };
  }

  await insertApplicationActivityLog({
    applicationId,
    studentId: existing.student_id,
    action: nextFlagged ? "student_flagged" : "student_unflagged",
    message: nextFlagged
      ? `${access.advisorName} flagged the student for follow-up on application #${applicationId}.`
      : `${access.advisorName} removed the follow-up flag on application #${applicationId}.`,
  });

  revalidateApplicationPaths(applicationId);
  revalidatePath("/advisor/students");
  return { ok: true };
}
