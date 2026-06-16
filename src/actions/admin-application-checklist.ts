"use server";

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
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

async function assertAdminAccess() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false as const, error: "You must be signed in." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: admin, error } = await secret
    .from("admins")
    .select("id, first_name, last_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !admin) {
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

function revalidateApplicationPaths(applicationId: number) {
  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);
}

export async function requestAdminApplicationChecklistDocument(
  documentIdRaw: string,
): Promise<ChecklistActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const documentId = parseChecklistDocumentId(documentIdRaw);
  if (!documentId) return { ok: false, error: "Invalid document." };

  const secret = await createSupabaseSecretClient();
  const result = await requestApplicationChecklistDocumentCore(
    secret,
    documentId,
    access.actorName,
    access.userId,
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

export async function approveAdminApplicationChecklistDocument(
  documentIdRaw: string,
): Promise<ChecklistActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const documentId = parseChecklistDocumentId(documentIdRaw);
  if (!documentId) return { ok: false, error: "Invalid document." };

  const secret = await createSupabaseSecretClient();
  const result = await approveApplicationChecklistDocumentCore(
    secret,
    documentId,
    access.actorName,
    access.userId,
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

export async function rejectAdminApplicationChecklistDocument(
  documentIdRaw: string,
): Promise<ChecklistActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const documentId = parseChecklistDocumentId(documentIdRaw);
  if (!documentId) return { ok: false, error: "Invalid document." };

  const secret = await createSupabaseSecretClient();
  const result = await rejectApplicationChecklistDocumentCore(
    secret,
    documentId,
    access.actorName,
    access.userId,
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

export async function markAdminApplicationChecklistNotApplicable(
  documentIdRaw: string,
): Promise<ChecklistActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const documentId = parseChecklistDocumentId(documentIdRaw);
  if (!documentId) return { ok: false, error: "Invalid document." };

  const secret = await createSupabaseSecretClient();
  const result = await markApplicationChecklistNotApplicableCore(
    secret,
    documentId,
    access.actorName,
    access.userId,
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

export async function addAdminApplicationChecklistDocument(
  applicationIdRaw: string,
  displayNameRaw: string,
): Promise<ChecklistActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (applicationId == null) return { ok: false, error: "Invalid application." };

  const secret = await createSupabaseSecretClient();
  const result = await addApplicationChecklistDocumentCore(
    secret,
    applicationId,
    displayNameRaw,
    access.actorName,
    access.userId,
  );

  if (result.ok) revalidateApplicationPaths(applicationId);
  return result;
}

export async function uploadAdminApplicationChecklistDocument(
  documentIdRaw: string,
  formData: FormData,
): Promise<ChecklistActionResult> {
  const access = await assertAdminAccess();
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
    access.actorName,
    access.userId,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}
