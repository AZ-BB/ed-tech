"use server";

import { fetchAdminApplicationsExportRows } from "@/app/(protected)/admin/applications/_lib/fetch-admin-applications-export";
import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
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
  "new",
  "assigned",
  "in_progress",
  "blocked",
  "submitted",
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
): Partial<Database["public"]["Tables"]["applications"]["Update"]> {
  switch (status) {
    case "assigned":
      return { assigned_at: now };
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

export async function updateAdminApplicationInternalNotes(
  applicationIdRaw: string,
  notesRaw: string,
): Promise<AdminApplicationActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (applicationId == null) {
    return { ok: false, error: "Invalid application." };
  }

  const internalNotes = notesRaw.trim() || null;

  const secret = await createSupabaseSecretClient();
  const { data: existing, error: fetchErr } = await secret
    .from("applications")
    .select("id, student_id, internal_notes")
    .eq("id", applicationId)
    .maybeSingle();

  if (fetchErr || !existing) {
    console.error("[updateAdminApplicationInternalNotes] fetch", fetchErr);
    return { ok: false, error: "Application not found." };
  }

  const previous = existing.internal_notes?.trim() ?? "";
  const next = internalNotes ?? "";
  if (previous === next) {
    return { ok: true };
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await secret
    .from("applications")
    .update({ internal_notes: internalNotes, updated_at: now })
    .eq("id", applicationId);

  if (updateErr) {
    console.error("[updateAdminApplicationInternalNotes] update", updateErr);
    return { ok: false, error: "Could not save internal notes." };
  }

  const message =
    next.length === 0
      ? `${access.actorName} cleared internal notes on application #${applicationId}.`
      : previous.length === 0
        ? `${access.actorName} added internal notes on application #${applicationId}.`
        : `${access.actorName} updated internal notes on application #${applicationId}.`;

  await insertApplicationActivityLog({
    applicationId,
    studentId: existing.student_id,
    adminId: access.userId,
    action: "application_internal_notes_updated",
    message,
  });

  revalidateApplicationPaths(applicationId);
  return { ok: true };
}

export async function assignAdminApplicationHandler(
  applicationIdRaw: string,
  handlerIdRaw: string,
): Promise<AdminApplicationActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (applicationId == null) {
    return { ok: false, error: "Invalid application." };
  }

  const handlerId = handlerIdRaw.trim();
  const unassign = handlerId === "" || handlerId === "unassigned";

  if (!unassign && !UUID_RE.test(handlerId)) {
    return { ok: false, error: "Select a valid handler." };
  }

  const secret = await createSupabaseSecretClient();

  const [{ data: existing, error: fetchErr }, { data: handler }] = await Promise.all([
    secret
      .from("applications")
      .select("id, student_id, assigned_to")
      .eq("id", applicationId)
      .maybeSingle(),
    unassign
      ? Promise.resolve({ data: null, error: null })
      : secret
          .from("admins")
          .select("id, first_name, last_name, is_active")
          .eq("id", handlerId)
          .maybeSingle(),
  ]);

  if (fetchErr || !existing) {
    console.error("[assignAdminApplicationHandler] fetch", fetchErr);
    return { ok: false, error: "Application not found." };
  }

  if (!unassign) {
    if (!handler) {
      return { ok: false, error: "Handler not found." };
    }
    if (handler.is_active === false) {
      return { ok: false, error: "That admin is inactive." };
    }
  }

  const nextAssignedTo = unassign ? null : handlerId;
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
    console.error("[assignAdminApplicationHandler] update", updateErr);
    return { ok: false, error: "Could not assign handler." };
  }

  const handlerName = handler
    ? [handler.first_name, handler.last_name].filter(Boolean).join(" ").trim() || "Admin"
    : null;

  const message = unassign
    ? `${access.actorName} unassigned the handler on application #${applicationId}.`
    : `${access.actorName} assigned ${handlerName} as handler on application #${applicationId}.`;

  await insertApplicationActivityLog({
    applicationId,
    studentId: existing.student_id,
    adminId: access.userId,
    action: unassign ? "application_handler_unassigned" : "application_handler_assigned",
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
