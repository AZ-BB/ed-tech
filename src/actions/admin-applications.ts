"use server";

import { fetchAdminApplicationsExportRows } from "@/app/(protected)/admin/applications/_lib/fetch-admin-applications-export";
import { parseAdminAssigneeOptionValue } from "@/app/(protected)/admin/applications/_lib/fetch-admin-application-admin-options";
import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import {
  buildApplicationSupportStatusTimestampPatch,
} from "@/lib/application-support-status-transitions";
import { parseApplicationNoteVisibility } from "@/lib/application-internal-notes";
import type { Database } from "@/database.types";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_STATUSES = new Set<string>([
  "lead",
  "not_suitable",
  "payment_requested",
  "active_package",
]);

type AdminApplicationActionResult = { ok: true } | { ok: false; error: string };

type ExportAdminApplicationsResult =
  | { ok: true; rows: Awaited<ReturnType<typeof fetchAdminApplicationsExportRows>> }
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
    .select("id, first_name, last_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[admin-applications] admin lookup", adminError);
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
  adminId: string;
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
    admin_id: input.adminId,
    school_admin_id: null,
    student_id: input.studentId,
  });

  if (error) {
    console.error("[admin-applications] activity log", error);
  }
}

function revalidateApplicationPaths(applicationId: number) {
  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/advisor/applications");
  revalidatePath(`/advisor/applications/${applicationId}`);
}

export async function updateAdminApplicationStatus(
  applicationIdRaw: string,
  statusRaw: string,
): Promise<AdminApplicationActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (applicationId == null) {
    return { ok: false, error: "Invalid application." };
  }

  const status = statusRaw.trim() as ApplicationStatus;
  if (!VALID_STATUSES.has(status)) {
    return { ok: false, error: "Select a valid status." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: existing, error: fetchErr } = await secret
    .from("applications")
    .select("id, student_id, status")
    .eq("id", applicationId)
    .maybeSingle();

  if (fetchErr || !existing) {
    console.error("[updateAdminApplicationStatus] fetch", fetchErr);
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
    .eq("id", applicationId);

  if (updateErr) {
    console.error("[updateAdminApplicationStatus] update", updateErr);
    return { ok: false, error: "Could not update application status." };
  }

  const fromLabel = existing.status ? statusLabel(existing.status) : "Unknown";
  const toLabel = statusLabel(status);

  await insertApplicationActivityLog({
    applicationId,
    studentId: existing.student_id,
    adminId: access.userId,
    action: "application_status_updated",
    message: `${access.actorName} changed application #${applicationId} status from ${fromLabel} to ${toLabel}.`,
  });

  revalidateApplicationPaths(applicationId);
  return { ok: true };
}

export async function addAdminApplicationInternalNote(
  applicationIdRaw: string,
  contentRaw: string,
  visibilityRaw?: string,
): Promise<AdminApplicationActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (applicationId == null) {
    return { ok: false, error: "Invalid application." };
  }

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
    .maybeSingle();

  if (fetchErr || !existing) {
    console.error("[addAdminApplicationInternalNote] fetch", fetchErr);
    return { ok: false, error: "Application not found." };
  }

  const now = new Date().toISOString();
  const { error: insertErr } = await secret.from("application_internal_notes").insert({
    application_id: applicationId,
    student_id: existing.student_id,
    author_user_id: access.userId,
    author_role: "admin",
    author_name: access.actorName,
    content,
    visibility,
    created_at: now,
  });

  if (insertErr) {
    console.error("[addAdminApplicationInternalNote] insert", insertErr);
    return { ok: false, error: "Could not save note." };
  }

  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", applicationId);

  const noteKind = visibility === "public" ? "public" : "internal";
  await insertApplicationActivityLog({
    applicationId,
    studentId: existing.student_id,
    adminId: access.userId,
    action: "application_internal_note_added",
    message: `${access.actorName} added a ${noteKind} note on application #${applicationId}.`,
  });

  revalidateApplicationPaths(applicationId);
  if (visibility === "public") {
    revalidatePath(`/school/students/${existing.student_id}`);
    revalidatePath(`/admin/users/students/${existing.student_id}`);
  }
  return { ok: true };
}

export async function toggleAdminStudentFlag(
  applicationIdRaw: string,
): Promise<AdminApplicationActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (applicationId == null) {
    return { ok: false, error: "Invalid application." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: existing, error: fetchErr } = await secret
    .from("applications")
    .select("id, student_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (fetchErr || !existing) {
    console.error("[toggleAdminStudentFlag] fetch application", fetchErr);
    return { ok: false, error: "Application not found." };
  }

  const { data: studentRow, error: studentFetchErr } = await secret
    .from("student_profiles")
    .select("id, flagged")
    .eq("id", existing.student_id)
    .maybeSingle();

  if (studentFetchErr || !studentRow) {
    console.error("[toggleAdminStudentFlag] fetch student", studentFetchErr);
    return { ok: false, error: "Student not found." };
  }

  const nextFlagged = !studentRow.flagged;
  const now = new Date().toISOString();
  const { error: updateErr } = await secret
    .from("student_profiles")
    .update({
      flagged: nextFlagged,
      flagged_by: null,
      updated_at: now,
    })
    .eq("id", existing.student_id);

  if (updateErr) {
    console.error("[toggleAdminStudentFlag] update", updateErr);
    return { ok: false, error: "Could not update student flag." };
  }

  await insertApplicationActivityLog({
    applicationId,
    studentId: existing.student_id,
    adminId: access.userId,
    action: nextFlagged ? "student_flagged" : "student_unflagged",
    message: nextFlagged
      ? `${access.actorName} flagged the student for follow-up on application #${applicationId}.`
      : `${access.actorName} removed the follow-up flag on application #${applicationId}.`,
  });

  revalidateApplicationPaths(applicationId);
  revalidatePath("/admin/users/students");
  return { ok: true };
}

export async function assignAdminApplicationAssignee(
  applicationIdRaw: string,
  assigneeRaw: string,
): Promise<AdminApplicationActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (applicationId == null) {
    return { ok: false, error: "Invalid application." };
  }

  const trimmed = assigneeRaw.trim();
  const unassign = trimmed === "" || trimmed === "unassigned";
  const parsed = unassign ? null : parseAdminAssigneeOptionValue(trimmed);

  if (!unassign && !parsed) {
    return { ok: false, error: "Select a valid admin or advisor." };
  }

  const secret = await createSupabaseSecretClient();

  const { data: existing, error: fetchErr } = await secret
    .from("applications")
    .select("id, student_id, assigned_to, assigned_admin_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (fetchErr || !existing) {
    console.error("[assignAdminApplicationAssignee] fetch", fetchErr);
    return { ok: false, error: "Application not found." };
  }

  const now = new Date().toISOString();
  let nextAssignedTo: string | null = null;
  let nextAssignedAdminId: string | null = null;
  let assigneeName: string | null = null;
  let action: string;
  let message: string;

  if (unassign) {
    if (!existing.assigned_to && !existing.assigned_admin_id) {
      return { ok: true };
    }
    action = "application_assignee_unassigned";
    message = `${access.actorName} unassigned the owner on application #${applicationId}.`;
  } else if (parsed!.kind === "admin") {
    const { data: admin, error: adminErr } = await secret
      .from("admins")
      .select("id, first_name, last_name, is_active")
      .eq("id", parsed!.id)
      .maybeSingle();

    if (adminErr || !admin) {
      return { ok: false, error: "Admin not found." };
    }
    if (admin.is_active === false) {
      return { ok: false, error: "That admin is inactive." };
    }

    if (existing.assigned_admin_id === parsed!.id && !existing.assigned_to) {
      return { ok: true };
    }

    nextAssignedAdminId = parsed!.id;
    assigneeName =
      [admin.first_name, admin.last_name].filter(Boolean).join(" ").trim() || "Admin";
    action = "application_admin_assigned";
    message = `${access.actorName} assigned ${assigneeName} as admin on application #${applicationId}.`;
  } else {
    const { data: advisor, error: advisorErr } = await secret
      .from("advisors")
      .select("id, first_name, last_name, is_active")
      .eq("id", parsed!.id)
      .maybeSingle();

    if (advisorErr || !advisor) {
      return { ok: false, error: "Advisor not found." };
    }
    if (advisor.is_active === false) {
      return { ok: false, error: "That advisor is inactive." };
    }

    if (existing.assigned_to === parsed!.id && !existing.assigned_admin_id) {
      return { ok: true };
    }

    nextAssignedTo = parsed!.id;
    assigneeName =
      [advisor.first_name, advisor.last_name].filter(Boolean).join(" ").trim() || "Advisor";
    action = "application_advisor_assigned";
    message = `${access.actorName} assigned ${assigneeName} as advisor on application #${applicationId}.`;
  }

  const { error: updateErr } = await secret
    .from("applications")
    .update({
      assigned_to: nextAssignedTo,
      assigned_at: nextAssignedTo ? now : null,
      assigned_admin_id: nextAssignedAdminId,
      assigned_admin_at: nextAssignedAdminId ? now : null,
      updated_at: now,
    })
    .eq("id", applicationId);

  if (updateErr) {
    console.error("[assignAdminApplicationAssignee] update", updateErr);
    return { ok: false, error: "Could not assign owner." };
  }

  await insertApplicationActivityLog({
    applicationId,
    studentId: existing.student_id,
    adminId: access.userId,
    action,
    message,
  });

  revalidateApplicationPaths(applicationId);
  return { ok: true };
}

export async function assignAdminApplicationAdvisor(
  applicationIdRaw: string,
  advisorIdRaw: string,
): Promise<AdminApplicationActionResult> {
  const advisorId = advisorIdRaw.trim();
  const unassign = advisorId === "" || advisorId === "unassigned";
  const assigneeRaw = unassign ? "unassigned" : `advisor:${advisorId}`;
  return assignAdminApplicationAssignee(applicationIdRaw, assigneeRaw);
}

export async function exportAdminApplicationsExcel(): Promise<ExportAdminApplicationsResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  try {
    const rows = await fetchAdminApplicationsExportRows();
    return { ok: true, rows };
  } catch (error) {
    console.error("[admin-applications] export", error);
    return { ok: false, error: "Could not export applications." };
  }
}
