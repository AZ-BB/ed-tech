"use server";

import type { Database } from "@/database.types";
import {
  POST_ADMISSION_ACTIVITY_ENTITY_TYPE,
  postAdmissionActivityEntityId,
} from "@/lib/post-admission-activity-log";
import { parsePostAdmissionNoteVisibility } from "@/lib/post-admission-internal-notes";
import { buildPostAdmissionStatusTimestampPatch } from "@/lib/post-admission-status-transitions";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
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
    .select("id, first_name, last_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError || !admin) {
    return { ok: false as const, error: "You do not have permission." };
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

function parseCaseId(raw: string): number | null {
  const id = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(id) || id < 1) return null;
  return id;
}

function revalidatePostAdmissionPaths(caseId: number) {
  revalidatePath("/admin/post-admission");
  revalidatePath(`/admin/post-admission/${caseId}`);
  revalidatePath("/advisor/post-admission");
  revalidatePath(`/advisor/post-admission/${caseId}`);
  revalidatePath("/advisor/leads");
  revalidatePath("/advisor/sessions-and-calls");
}

export async function updateAdminPostAdmissionStatus(
  caseIdRaw: string,
  status: string,
): Promise<ActionResult> {
  const admin = await assertAdminAccess();
  if (!admin.ok) return admin;

  if (!VALID_STATUSES.has(status)) {
    return { ok: false, error: "Invalid status." };
  }

  const caseId = parseCaseId(caseIdRaw);
  if (caseId == null) return { ok: false, error: "Invalid case." };

  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();
  const typedStatus = status as PostAdmissionStatus;

  const { data: existing, error: fetchErr } = await secret
    .from("post_admission_cases")
    .select("id, student_id, status")
    .eq("id", caseId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { ok: false, error: "Case not found." };
  }

  const { error: updateErr } = await secret
    .from("post_admission_cases")
    .update({
      status: typedStatus,
      updated_at: now,
      ...buildPostAdmissionStatusTimestampPatch(typedStatus, now),
    })
    .eq("id", caseId);

  if (updateErr) {
    console.error("[updateAdminPostAdmissionStatus]", updateErr);
    return { ok: false, error: "Could not update status." };
  }

  await secret.from("acitivity_logs").insert({
    entitiy_type: POST_ADMISSION_ACTIVITY_ENTITY_TYPE,
    entity_id: postAdmissionActivityEntityId(caseId),
    action: "post_admission_status_updated",
    message: `Status changed to ${status.replace(/_/g, " ")} for post-admission case #${caseId}.`,
    created_by_type: "admin",
    admin_id: admin.userId,
    school_admin_id: null,
    student_id: existing.student_id,
  });

  revalidatePostAdmissionPaths(caseId);
  return { ok: true };
}

export async function addAdminPostAdmissionInternalNote(
  caseIdRaw: string,
  content: string,
  visibilityRaw?: string,
): Promise<ActionResult> {
  const admin = await assertAdminAccess();
  if (!admin.ok) return admin;

  const caseId = parseCaseId(caseIdRaw);
  if (caseId == null) return { ok: false, error: "Invalid case." };

  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: "Note cannot be empty." };
  if (trimmed.length > 8000) {
    return { ok: false, error: "Note is too long (max 8,000 characters)." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: caseRow, error: fetchErr } = await secret
    .from("post_admission_cases")
    .select("id, student_id")
    .eq("id", caseId)
    .maybeSingle();

  if (fetchErr || !caseRow) {
    return { ok: false, error: "Case not found." };
  }

  const now = new Date().toISOString();
  const visibility = parsePostAdmissionNoteVisibility(visibilityRaw);

  const { error: insertErr } = await secret.from("post_admission_internal_notes").insert({
    post_admission_case_id: caseId,
    student_id: caseRow.student_id,
    author_user_id: admin.userId,
    author_role: "admin",
    author_name: admin.actorName,
    content: trimmed,
    visibility,
    created_at: now,
  });

  if (insertErr) {
    console.error("[addAdminPostAdmissionInternalNote]", insertErr);
    return { ok: false, error: "Could not save note." };
  }

  revalidatePostAdmissionPaths(caseId);
  return { ok: true };
}

export async function assignAdminPostAdmissionAdvisor(
  caseIdRaw: string,
  advisorId: string,
): Promise<ActionResult> {
  const admin = await assertAdminAccess();
  if (!admin.ok) return admin;

  const caseId = parseCaseId(caseIdRaw);
  if (caseId == null) return { ok: false, error: "Invalid case." };

  const trimmedAdvisorId = advisorId.trim();
  if (!trimmedAdvisorId) {
    return { ok: false, error: "Select an advisor." };
  }

  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();

  const { data: updated, error } = await secret
    .from("post_admission_cases")
    .update({
      assigned_to: trimmedAdvisorId,
      assigned_at: now,
      updated_at: now,
    })
    .eq("id", caseId)
    .select("student_id")
    .maybeSingle();

  if (error || !updated) {
    return { ok: false, error: "Could not assign advisor." };
  }

  revalidatePostAdmissionPaths(caseId);
  return { ok: true };
}
