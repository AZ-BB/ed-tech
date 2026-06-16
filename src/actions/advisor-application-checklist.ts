"use server";

import {
  assertAdvisorAccess,
  assertAdvisorAssignedApplication,
} from "@/lib/advisor-access";
import {
  addApplicationChecklistDocumentCore,
  approveApplicationChecklistDocumentCore,
  markApplicationChecklistNotApplicableCore,
  parseApplicationId,
  parseChecklistDocumentId,
  rejectApplicationChecklistDocumentCore,
  requestApplicationChecklistDocumentCore,
  uploadApplicationChecklistDocumentCore,
  type ChecklistActionResult,
} from "@/lib/application-checklist-actions-core";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

function revalidateApplicationPaths(applicationId: number) {
  revalidatePath("/advisor/applications");
  revalidatePath(`/advisor/applications/${applicationId}`);
}

async function assertAdvisorCanAccessDocument(
  documentId: string,
): Promise<
  | { ok: true; advisorId: string; advisorName: string }
  | { ok: false; error: string }
> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const secret = await createSupabaseSecretClient();
  const { data: doc, error } = await secret
    .from("application_checklist_documents")
    .select("application_id")
    .eq("id", documentId)
    .maybeSingle();

  if (error || !doc) {
    return { ok: false, error: "Document not found." };
  }

  const assignment = await assertAdvisorAssignedApplication(
    access.advisorId,
    doc.application_id,
  );
  if (!assignment.ok) return assignment;

  return {
    ok: true,
    advisorId: access.advisorId,
    advisorName: access.advisorName,
  };
}

export async function requestAdvisorApplicationChecklistDocument(
  documentIdRaw: string,
): Promise<ChecklistActionResult> {
  const access = await assertAdvisorCanAccessDocument(documentIdRaw);
  if (!access.ok) return access;

  const documentId = parseChecklistDocumentId(documentIdRaw);
  if (!documentId) return { ok: false, error: "Invalid document." };

  const secret = await createSupabaseSecretClient();
  const result = await requestApplicationChecklistDocumentCore(
    secret,
    documentId,
    access.advisorName,
    null,
  );

  if (result.ok) {
    const { data } = await secret
      .from("application_checklist_documents")
      .select("application_id")
      .eq("id", documentId)
      .maybeSingle();
    if (data?.application_id) revalidateApplicationPaths(data.application_id);
  }

  return result;
}

export async function approveAdvisorApplicationChecklistDocument(
  documentIdRaw: string,
): Promise<ChecklistActionResult> {
  const access = await assertAdvisorCanAccessDocument(documentIdRaw);
  if (!access.ok) return access;

  const documentId = parseChecklistDocumentId(documentIdRaw);
  if (!documentId) return { ok: false, error: "Invalid document." };

  const secret = await createSupabaseSecretClient();
  const result = await approveApplicationChecklistDocumentCore(
    secret,
    documentId,
    access.advisorName,
    null,
  );

  if (result.ok) {
    const { data } = await secret
      .from("application_checklist_documents")
      .select("application_id")
      .eq("id", documentId)
      .maybeSingle();
    if (data?.application_id) revalidateApplicationPaths(data.application_id);
  }

  return result;
}

export async function rejectAdvisorApplicationChecklistDocument(
  documentIdRaw: string,
): Promise<ChecklistActionResult> {
  const access = await assertAdvisorCanAccessDocument(documentIdRaw);
  if (!access.ok) return access;

  const documentId = parseChecklistDocumentId(documentIdRaw);
  if (!documentId) return { ok: false, error: "Invalid document." };

  const secret = await createSupabaseSecretClient();
  const result = await rejectApplicationChecklistDocumentCore(
    secret,
    documentId,
    access.advisorName,
    null,
  );

  if (result.ok) {
    const { data } = await secret
      .from("application_checklist_documents")
      .select("application_id")
      .eq("id", documentId)
      .maybeSingle();
    if (data?.application_id) revalidateApplicationPaths(data.application_id);
  }

  return result;
}

export async function markAdvisorApplicationChecklistNotApplicable(
  documentIdRaw: string,
): Promise<ChecklistActionResult> {
  const access = await assertAdvisorCanAccessDocument(documentIdRaw);
  if (!access.ok) return access;

  const documentId = parseChecklistDocumentId(documentIdRaw);
  if (!documentId) return { ok: false, error: "Invalid document." };

  const secret = await createSupabaseSecretClient();
  const result = await markApplicationChecklistNotApplicableCore(
    secret,
    documentId,
    access.advisorName,
    null,
  );

  if (result.ok) {
    const { data } = await secret
      .from("application_checklist_documents")
      .select("application_id")
      .eq("id", documentId)
      .maybeSingle();
    if (data?.application_id) revalidateApplicationPaths(data.application_id);
  }

  return result;
}

export async function addAdvisorApplicationChecklistDocument(
  applicationIdRaw: string,
  displayNameRaw: string,
): Promise<ChecklistActionResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (applicationId == null) return { ok: false, error: "Invalid application." };

  const assignment = await assertAdvisorAssignedApplication(
    access.advisorId,
    applicationId,
  );
  if (!assignment.ok) return assignment;

  const secret = await createSupabaseSecretClient();
  const result = await addApplicationChecklistDocumentCore(
    secret,
    applicationId,
    displayNameRaw,
    access.advisorName,
    null,
  );

  if (result.ok) revalidateApplicationPaths(applicationId);
  return result;
}

export async function uploadAdvisorApplicationChecklistDocument(
  documentIdRaw: string,
  formData: FormData,
): Promise<ChecklistActionResult> {
  const access = await assertAdvisorCanAccessDocument(documentIdRaw);
  if (!access.ok) return access;

  const documentId = parseChecklistDocumentId(documentIdRaw);
  if (!documentId) return { ok: false, error: "Invalid document." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size < 1) {
    return { ok: false, error: "Choose a file to upload." };
  }

  const secret = await createSupabaseSecretClient();
  const result = await uploadApplicationChecklistDocumentCore(
    secret,
    documentId,
    file,
    access.advisorName,
    null,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}
