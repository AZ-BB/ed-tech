"use server";

import { fetchAdminApplicationsExportRows } from "@/app/(protected)/admin/applications/_lib/fetch-admin-applications-export";
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

export async function assignAdminApplicationAdvisor(
  applicationIdRaw: string,
  advisorIdRaw: string,
): Promise<AdminApplicationActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (applicationId == null) {
    return { ok: false, error: "Invalid application." };
  }

  const advisorId = advisorIdRaw.trim();
  const unassign = advisorId === "" || advisorId === "unassigned";

  if (!unassign && !UUID_RE.test(advisorId)) {
    return { ok: false, error: "Select a valid advisor." };
  }

  const secret = await createSupabaseSecretClient();

  const [{ data: existing, error: fetchErr }, { data: advisor }] = await Promise.all([
    secret
      .from("applications")
      .select("id, student_id, assigned_to")
      .eq("id", applicationId)
      .maybeSingle(),
    unassign
      ? Promise.resolve({ data: null, error: null })
      : secret
          .from("advisors")
          .select("id, first_name, last_name, is_active")
          .eq("id", advisorId)
          .maybeSingle(),
  ]);

  if (fetchErr || !existing) {
    console.error("[assignAdminApplicationAdvisor] fetch", fetchErr);
    return { ok: false, error: "Application not found." };
  }

  if (!unassign) {
    if (!advisor) {
      return { ok: false, error: "Advisor not found." };
    }
    if (advisor.is_active === false) {
      return { ok: false, error: "That advisor is inactive." };
    }
  }

  const nextAssignedTo = unassign ? null : advisorId;
  if (existing.assigned_to === nextAssignedTo) {
    return { ok: true };
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await secret
    .from("applications")
    .update({
      assigned_to: nextAssignedTo,
      assigned_at: unassign ? null : now,
      updated_at: now,
    })
    .eq("id", applicationId);

  if (updateErr) {
    console.error("[assignAdminApplicationAdvisor] update", updateErr);
    return { ok: false, error: "Could not assign advisor." };
  }

  const advisorName = advisor
    ? [advisor.first_name, advisor.last_name].filter(Boolean).join(" ").trim() || "Advisor"
    : null;

  const message = unassign
    ? `${access.actorName} unassigned the advisor on application #${applicationId}.`
    : `${access.actorName} assigned ${advisorName} as advisor on application #${applicationId}.`;

  await insertApplicationActivityLog({
    applicationId,
    studentId: existing.student_id,
    adminId: access.userId,
    action: unassign ? "application_advisor_unassigned" : "application_advisor_assigned",
    message,
  });

  revalidateApplicationPaths(applicationId);
  return { ok: true };
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
