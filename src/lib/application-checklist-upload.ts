import { APPLICATION_DOCUMENTS_BUCKET } from "@/lib/application-checklist-constants";
import { effectiveApplicationChecklistStatus } from "@/lib/application-checklist-status";
import type { createSupabaseSecretClient } from "@/utils/supabase-server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_BYTES = 10 * 1024 * 1024;

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type ChecklistUploadResult =
  | { ok: true; applicationId: number; studentId: string }
  | { ok: false; error: string };

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
}

function resolveContentType(file: File): string {
  const fromBrowser = file.type?.trim();
  if (fromBrowser) return fromBrowser;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const byExt: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return byExt[ext] ?? "application/octet-stream";
}

export async function uploadApplicationChecklistDocumentFile(
  secret: SecretClient,
  documentId: string,
  file: File,
): Promise<ChecklistUploadResult> {
  if (!documentId || !UUID_RE.test(documentId)) {
    return { ok: false, error: "Invalid document." };
  }

  if (file.size < 1) {
    return { ok: false, error: "Choose a file to upload." };
  }

  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File must be 10 MB or smaller." };
  }

  const { data: doc, error: docErr } = await secret
    .from("application_checklist_documents")
    .select("id, application_id, status, url, slot_key")
    .eq("id", documentId)
    .maybeSingle();

  if (docErr || !doc) {
    return { ok: false, error: "Document not found." };
  }

  const effectiveStatus = effectiveApplicationChecklistStatus(doc.status, doc.url);
  if (
    effectiveStatus !== "requested" &&
    effectiveStatus !== "under_review" &&
    doc.status !== "rejected"
  ) {
    return { ok: false, error: "This document cannot accept uploads in its current state." };
  }

  const { data: application, error: appErr } = await secret
    .from("applications")
    .select("id, student_id")
    .eq("id", doc.application_id)
    .maybeSingle();

  if (appErr || !application) {
    return { ok: false, error: "Application not found." };
  }

  const studentId = application.student_id;
  const safe = sanitizeFilename(file.name);
  const path = `${studentId}/${doc.application_id}/${doc.slot_key}_${safe}`;
  const contentType = resolveContentType(file);
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await secret.storage
    .from(APPLICATION_DOCUMENTS_BUCKET)
    .upload(path, buf, { contentType, upsert: true });

  if (upErr) {
    console.error("[uploadApplicationChecklistDocumentFile] storage", upErr);
    return { ok: false, error: upErr.message || "Could not upload the file." };
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const url = `${base}/storage/v1/object/${APPLICATION_DOCUMENTS_BUCKET}/${path}`;
  const now = new Date().toISOString();

  const { error: updateErr } = await secret
    .from("application_checklist_documents")
    .update({
      url,
      file_name: file.name,
      file_size: file.size,
      file_type: contentType,
      status: "under_review",
      uploaded_at: now,
      reviewed_at: null,
      updated_at: now,
    })
    .eq("id", documentId);

  if (updateErr) {
    console.error("[uploadApplicationChecklistDocumentFile] update", updateErr);
    await secret.storage.from(APPLICATION_DOCUMENTS_BUCKET).remove([path]);
    return { ok: false, error: "Could not save document metadata." };
  }

  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", doc.application_id);

  return {
    ok: true,
    applicationId: doc.application_id,
    studentId,
  };
}
