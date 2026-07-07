"use server";

import {
  assertAdvisorAccess,
  assertAdvisorAssignedPostAdmissionCase,
} from "@/lib/advisor-access";
import type { Database } from "@/database.types";
import {
  POST_ADMISSION_ACTIVITY_ENTITY_TYPE,
  postAdmissionActivityEntityId,
} from "@/lib/post-admission-activity-log";
import { parsePostAdmissionNoteVisibility } from "@/lib/post-admission-internal-notes";
import { buildPostAdmissionStatusTimestampPatch } from "@/lib/post-admission-status-transitions";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type PostAdmissionStatus = Database["public"]["Enums"]["post_admission_status"];

const VALID_STATUSES = new Set<string>([
  "lead",
  "not_suitable",
  "payment_requested",
  "active",
  "completed",
]);

type ActionResult = { ok: true } | { ok: false; error: string };

function parseCaseId(raw: string | number): number | null {
  const id = typeof raw === "number" ? raw : Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(id) || id < 1) return null;
  return id;
}

function revalidatePostAdmissionPaths(caseId: number) {
  revalidatePath("/advisor/post-admission");
  revalidatePath(`/advisor/post-admission/${caseId}`);
  revalidatePath("/advisor/leads");
  revalidatePath("/advisor/sessions-and-calls");
  revalidatePath("/admin/post-admission");
  revalidatePath(`/admin/post-admission/${caseId}`);
}

export async function updateAdvisorPostAdmissionStatus(
  caseIdRaw: string | number,
  status: string,
): Promise<ActionResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  if (!VALID_STATUSES.has(status)) {
    return { ok: false, error: "Invalid status." };
  }

  const caseId = parseCaseId(caseIdRaw);
  if (caseId == null) return { ok: false, error: "Invalid case." };

  const assignment = await assertAdvisorAssignedPostAdmissionCase(
    access.advisorId,
    caseId,
  );
  if (!assignment.ok) return assignment;

  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();
  const typedStatus = status as PostAdmissionStatus;

  const { error: updateErr } = await secret
    .from("post_admission_cases")
    .update({
      status: typedStatus,
      updated_at: now,
      ...buildPostAdmissionStatusTimestampPatch(typedStatus, now),
    })
    .eq("id", caseId);

  if (updateErr) {
    console.error("[updateAdvisorPostAdmissionStatus]", updateErr);
    return { ok: false, error: "Could not update status." };
  }

  await secret.from("acitivity_logs").insert({
    entitiy_type: POST_ADMISSION_ACTIVITY_ENTITY_TYPE,
    entity_id: postAdmissionActivityEntityId(caseId),
    action: "post_admission_status_updated",
    message: `Status changed to ${status.replace(/_/g, " ")} for post-admission case #${caseId}.`,
    created_by_type: "admin",
    admin_id: null,
    school_admin_id: null,
    student_id: assignment.studentId,
  });

  revalidatePostAdmissionPaths(caseId);
  return { ok: true };
}

export async function addAdvisorPostAdmissionInternalNote(
  caseIdRaw: string,
  content: string,
  visibilityRaw?: string,
): Promise<ActionResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const caseId = parseCaseId(caseIdRaw);
  if (caseId == null) return { ok: false, error: "Invalid case." };

  const assignment = await assertAdvisorAssignedPostAdmissionCase(
    access.advisorId,
    caseId,
  );
  if (!assignment.ok) return assignment;

  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: "Note cannot be empty." };
  if (trimmed.length > 8000) {
    return { ok: false, error: "Note is too long (max 8,000 characters)." };
  }

  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();
  const visibility = parsePostAdmissionNoteVisibility(visibilityRaw);

  const { error: insertErr } = await secret.from("post_admission_internal_notes").insert({
    post_admission_case_id: caseId,
    student_id: assignment.studentId,
    author_user_id: access.advisorId,
    author_role: "advisor",
    author_name: access.advisorName,
    content: trimmed,
    visibility,
    created_at: now,
  });

  if (insertErr) {
    console.error("[addAdvisorPostAdmissionInternalNote]", insertErr);
    return { ok: false, error: "Could not save note." };
  }

  revalidatePostAdmissionPaths(caseId);
  return { ok: true };
}
