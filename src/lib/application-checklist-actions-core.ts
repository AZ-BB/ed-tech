import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import { makeCustomApplicationChecklistSlotKey } from "@/lib/application-checklist-defaults";
import { APPLICATION_CHECKLIST_MAX_DISPLAY_NAME } from "@/lib/application-checklist-constants";
import { effectiveApplicationChecklistStatus } from "@/lib/application-checklist-status";
import { uploadApplicationChecklistDocumentFile } from "@/lib/application-checklist-upload";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ChecklistActionResult = { ok: true } | { ok: false; error: string };

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export function parseApplicationId(raw: string): number | null {
  const id = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(id) || id < 1) return null;
  return id;
}

export function parseChecklistDocumentId(raw: string): string | null {
  const id = raw.trim();
  return UUID_RE.test(id) ? id : null;
}

async function loadChecklistDocument(secret: SecretClient, documentId: string) {
  const { data, error } = await secret
    .from("application_checklist_documents")
    .select("id, application_id, display_name, status, url, slot_key")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    console.error("[application-checklist] load document", error);
    return null;
  }

  return data;
}

async function loadApplicationStudentId(secret: SecretClient, applicationId: number) {
  const { data, error } = await secret
    .from("applications")
    .select("id, student_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function insertApplicationChecklistActivityLog(
  secret: SecretClient,
  input: {
    applicationId: number;
    studentId: string;
    action: string;
    message: string;
    adminId?: string | null;
  },
) {
  const { error } = await secret.from("acitivity_logs").insert({
    entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
    entity_id: applicationActivityEntityId(input.applicationId),
    action: input.action,
    message: input.message,
    created_by_type: "admin",
    admin_id: input.adminId ?? null,
    school_admin_id: null,
    student_id: input.studentId,
  });

  if (error) {
    console.error("[application-checklist] activity log", error);
  }
}

export async function requestApplicationChecklistDocumentCore(
  secret: SecretClient,
  documentId: string,
  actorName: string,
  adminId?: string | null,
): Promise<ChecklistActionResult> {
  const doc = await loadChecklistDocument(secret, documentId);
  if (!doc) return { ok: false, error: "Document not found." };

  if (doc.status !== "not_requested") {
    return { ok: false, error: "Only not-requested documents can be requested." };
  }

  const application = await loadApplicationStudentId(secret, doc.application_id);
  if (!application) return { ok: false, error: "Application not found." };

  const now = new Date().toISOString();
  const { error } = await secret
    .from("application_checklist_documents")
    .update({
      status: "requested",
      requested_at: now,
      updated_at: now,
    })
    .eq("id", documentId);

  if (error) {
    console.error("[requestApplicationChecklistDocumentCore]", error);
    return { ok: false, error: "Could not request document." };
  }

  await insertApplicationChecklistActivityLog(secret, {
    applicationId: doc.application_id,
    studentId: application.student_id,
    adminId,
    action: "application_checklist_document_requested",
    message: `${actorName} requested "${doc.display_name}" for application #${doc.application_id}.`,
  });

  return { ok: true };
}

export async function approveApplicationChecklistDocumentCore(
  secret: SecretClient,
  documentId: string,
  actorName: string,
  adminId?: string | null,
): Promise<ChecklistActionResult> {
  const doc = await loadChecklistDocument(secret, documentId);
  if (!doc) return { ok: false, error: "Document not found." };

  const effective = effectiveApplicationChecklistStatus(doc.status, doc.url);
  if (effective !== "under_review") {
    return { ok: false, error: "Only documents under review can be approved." };
  }

  const application = await loadApplicationStudentId(secret, doc.application_id);
  if (!application) return { ok: false, error: "Application not found." };

  const now = new Date().toISOString();
  const { error } = await secret
    .from("application_checklist_documents")
    .update({
      status: "approved",
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", documentId);

  if (error) {
    console.error("[approveApplicationChecklistDocumentCore]", error);
    return { ok: false, error: "Could not approve document." };
  }

  await insertApplicationChecklistActivityLog(secret, {
    applicationId: doc.application_id,
    studentId: application.student_id,
    adminId,
    action: "application_checklist_document_approved",
    message: `${actorName} approved "${doc.display_name}" for application #${doc.application_id}.`,
  });

  return { ok: true };
}

export async function rejectApplicationChecklistDocumentCore(
  secret: SecretClient,
  documentId: string,
  actorName: string,
  adminId?: string | null,
): Promise<ChecklistActionResult> {
  const doc = await loadChecklistDocument(secret, documentId);
  if (!doc) return { ok: false, error: "Document not found." };

  const effective = effectiveApplicationChecklistStatus(doc.status, doc.url);
  if (effective !== "under_review") {
    return { ok: false, error: "Only documents under review can be rejected." };
  }

  const application = await loadApplicationStudentId(secret, doc.application_id);
  if (!application) return { ok: false, error: "Application not found." };

  const now = new Date().toISOString();
  const { error } = await secret
    .from("application_checklist_documents")
    .update({
      status: "rejected",
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", documentId);

  if (error) {
    console.error("[rejectApplicationChecklistDocumentCore]", error);
    return { ok: false, error: "Could not reject document." };
  }

  await insertApplicationChecklistActivityLog(secret, {
    applicationId: doc.application_id,
    studentId: application.student_id,
    adminId,
    action: "application_checklist_document_rejected",
    message: `${actorName} rejected "${doc.display_name}" for application #${doc.application_id}.`,
  });

  return { ok: true };
}

export async function markApplicationChecklistNotApplicableCore(
  secret: SecretClient,
  documentId: string,
  actorName: string,
  adminId?: string | null,
): Promise<ChecklistActionResult> {
  const doc = await loadChecklistDocument(secret, documentId);
  if (!doc) return { ok: false, error: "Document not found." };

  if (doc.slot_key !== "portfolio") {
    return { ok: false, error: "Only optional documents can be marked N/A." };
  }

  if (doc.status !== "not_requested") {
    return { ok: false, error: "Only not-requested documents can be marked N/A." };
  }

  const application = await loadApplicationStudentId(secret, doc.application_id);
  if (!application) return { ok: false, error: "Application not found." };

  const now = new Date().toISOString();
  const { error } = await secret
    .from("application_checklist_documents")
    .update({
      status: "not_applicable",
      updated_at: now,
    })
    .eq("id", documentId);

  if (error) {
    console.error("[markApplicationChecklistNotApplicableCore]", error);
    return { ok: false, error: "Could not update document." };
  }

  await insertApplicationChecklistActivityLog(secret, {
    applicationId: doc.application_id,
    studentId: application.student_id,
    adminId,
    action: "application_checklist_document_not_applicable",
    message: `${actorName} marked "${doc.display_name}" as N/A for application #${doc.application_id}.`,
  });

  return { ok: true };
}

export async function addApplicationChecklistDocumentCore(
  secret: SecretClient,
  applicationId: number,
  displayNameRaw: string,
  actorName: string,
  adminId?: string | null,
): Promise<ChecklistActionResult> {
  const displayName = displayNameRaw.trim();
  if (!displayName) {
    return { ok: false, error: "Document name is required." };
  }
  if (displayName.length > APPLICATION_CHECKLIST_MAX_DISPLAY_NAME) {
    return { ok: false, error: "Document name is too long." };
  }

  const application = await loadApplicationStudentId(secret, applicationId);
  if (!application) return { ok: false, error: "Application not found." };

  const { data: maxRow } = await secret
    .from("application_checklist_documents")
    .select("sort_order")
    .eq("application_id", applicationId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxRow?.sort_order ?? 0) + 1;
  const now = new Date().toISOString();

  const { error } = await secret.from("application_checklist_documents").insert({
    application_id: applicationId,
    slot_key: makeCustomApplicationChecklistSlotKey(),
    display_name: displayName,
    status: "not_requested",
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    console.error("[addApplicationChecklistDocumentCore]", error);
    return { ok: false, error: "Could not add document." };
  }

  await insertApplicationChecklistActivityLog(secret, {
    applicationId,
    studentId: application.student_id,
    adminId,
    action: "application_checklist_document_added",
    message: `${actorName} added checklist document "${displayName}" to application #${applicationId}.`,
  });

  return { ok: true };
}

export async function uploadApplicationChecklistDocumentCore(
  secret: SecretClient,
  documentId: string,
  file: File,
  actorName: string,
  adminId?: string | null,
): Promise<ChecklistActionResult & { applicationId?: number }> {
  const result = await uploadApplicationChecklistDocumentFile(secret, documentId, file);
  if (!result.ok) return result;

  await insertApplicationChecklistActivityLog(secret, {
    applicationId: result.applicationId,
    studentId: result.studentId,
    adminId,
    action: "application_checklist_document_uploaded",
    message: `${actorName} uploaded a file for application #${result.applicationId}.`,
  });

  return { ok: true, applicationId: result.applicationId };
}
