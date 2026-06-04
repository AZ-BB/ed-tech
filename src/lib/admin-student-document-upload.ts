import { SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY } from "@/app/(protected)/student/my-applications/_lib/my-applications-defaults";
import {
  ADMIN_STUDENT_DOCUMENT_MAX_BYTES,
  STUDENT_MY_APPLICATIONS_BUCKET,
} from "@/lib/admin-student-document-constants";
import type { createSupabaseSecretClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type AdminStudentDocumentUploadResult =
  | { ok: true; studentId: string }
  | { ok: false; error: string };

function revalidateStudentDocumentPaths(studentId: string) {
  revalidatePath(`/admin/users/students/${studentId}`);
  revalidatePath("/admin/documents");
  revalidatePath("/student/my-applications");
}

export async function uploadAdminStudentDocumentFile(
  secret: SecretClient,
  documentId: string,
  file: File,
): Promise<AdminStudentDocumentUploadResult> {
  if (!documentId || !UUID_RE.test(documentId)) {
    return { ok: false, error: "Invalid document." };
  }

  if (file.size < 1) {
    return { ok: false, error: "Choose a file to upload." };
  }

  if (file.size > ADMIN_STUDENT_DOCUMENT_MAX_BYTES) {
    return { ok: false, error: "File must be 10 MB or smaller." };
  }

  const { data: doc, error: docErr } = await secret
    .from("student_my_application_documents")
    .select("id, student_id, slot_key, storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (docErr || !doc) {
    return { ok: false, error: "Document not found." };
  }

  if (doc.slot_key === SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY) {
    return {
      ok: false,
      error: "This slot is text-only and cannot accept file uploads.",
    };
  }

  const safeName = file.name.replace(/[^\w.\-()+ ]/g, "_");
  const path = `${doc.student_id}/${doc.slot_key}/${Date.now()}_${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await secret.storage
    .from(STUDENT_MY_APPLICATIONS_BUCKET)
    .upload(path, buf, { upsert: true });

  if (upErr) {
    console.error("[uploadAdminStudentDocumentFile] storage", upErr);
    return { ok: false, error: upErr.message || "Could not upload the file." };
  }

  const oldPath = doc.storage_path?.trim();
  if (oldPath && oldPath !== path) {
    const { error: rmErr } = await secret.storage
      .from(STUDENT_MY_APPLICATIONS_BUCKET)
      .remove([oldPath]);
    if (rmErr) {
      console.error("[uploadAdminStudentDocumentFile] remove old", rmErr);
    }
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await secret
    .from("student_my_application_documents")
    .update({
      storage_path: path,
      file_name: file.name,
      status: "submitted",
      uploaded_at: now,
      updated_at: now,
    })
    .eq("id", documentId);

  if (updateErr) {
    console.error("[uploadAdminStudentDocumentFile] update", updateErr);
    await secret.storage.from(STUDENT_MY_APPLICATIONS_BUCKET).remove([path]);
    return { ok: false, error: "Could not save document metadata." };
  }

  revalidateStudentDocumentPaths(doc.student_id);
  return { ok: true, studentId: doc.student_id };
}
