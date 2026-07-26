import {
  ADMIN_LESSON_DOCUMENT_MAX_BYTES,
  LESSON_DOCUMENTS_BUCKET,
} from "@/lib/admin-lesson-document-constants";
import type { createSupabaseSecretClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type AdminLessonDocumentUploadResult =
  | { ok: true; documentId: string }
  | { ok: false; error: string };

function revalidateLessonPaths() {
  revalidatePath("/admin/lessons");
  revalidatePath("/school/lessons");
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-()+ ]/g, "_");
}

function buildStoragePath(documentId: string, fileName: string): string {
  return `${documentId}/${Date.now()}_${sanitizeFileName(fileName)}`;
}

export async function createAdminLessonDocumentWithFile(
  secret: SecretClient,
  input: {
    title: string;
    description: string;
    file: File;
  },
): Promise<AdminLessonDocumentUploadResult> {
  const title = input.title.trim();
  const description = input.description.trim();

  if (!title) {
    return { ok: false, error: "Title is required." };
  }

  if (input.file.size < 1) {
    return { ok: false, error: "Choose a file to upload." };
  }

  if (input.file.size > ADMIN_LESSON_DOCUMENT_MAX_BYTES) {
    return { ok: false, error: "File must be 20 MB or smaller." };
  }

  const documentId = crypto.randomUUID();
  const storagePath = buildStoragePath(documentId, input.file.name);
  const buf = Buffer.from(await input.file.arrayBuffer());
  const now = new Date().toISOString();

  const { error: upErr } = await secret.storage
    .from(LESSON_DOCUMENTS_BUCKET)
    .upload(storagePath, buf, {
      contentType: input.file.type || undefined,
      upsert: false,
    });

  if (upErr) {
    console.error("[createAdminLessonDocumentWithFile] storage", upErr);
    return { ok: false, error: upErr.message || "Could not upload the file." };
  }

  const { error: insertErr } = await secret.from("lesson_documents").insert({
    id: documentId,
    title,
    description: description || null,
    file_name: input.file.name,
    storage_path: storagePath,
    mime_type: input.file.type || null,
    file_size: input.file.size,
    sort_order: 0,
    created_at: now,
    updated_at: now,
  });

  if (insertErr) {
    console.error("[createAdminLessonDocumentWithFile] insert", insertErr);
    await secret.storage.from(LESSON_DOCUMENTS_BUCKET).remove([storagePath]);
    return { ok: false, error: "Could not save lesson document." };
  }

  revalidateLessonPaths();
  return { ok: true, documentId };
}

export async function replaceAdminLessonDocumentFile(
  secret: SecretClient,
  documentId: string,
  file: File,
): Promise<AdminLessonDocumentUploadResult> {
  if (!documentId || !UUID_RE.test(documentId)) {
    return { ok: false, error: "Invalid lesson document." };
  }

  if (file.size < 1) {
    return { ok: false, error: "Choose a file to upload." };
  }

  if (file.size > ADMIN_LESSON_DOCUMENT_MAX_BYTES) {
    return { ok: false, error: "File must be 20 MB or smaller." };
  }

  const { data: doc, error: docErr } = await secret
    .from("lesson_documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (docErr || !doc) {
    return { ok: false, error: "Lesson document not found." };
  }

  const storagePath = buildStoragePath(documentId, file.name);
  const buf = Buffer.from(await file.arrayBuffer());
  const now = new Date().toISOString();

  const { error: upErr } = await secret.storage
    .from(LESSON_DOCUMENTS_BUCKET)
    .upload(storagePath, buf, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (upErr) {
    console.error("[replaceAdminLessonDocumentFile] storage", upErr);
    return { ok: false, error: upErr.message || "Could not upload the file." };
  }

  const oldPath = doc.storage_path?.trim();
  const { error: updateErr } = await secret
    .from("lesson_documents")
    .update({
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      file_size: file.size,
      updated_at: now,
    })
    .eq("id", documentId);

  if (updateErr) {
    console.error("[replaceAdminLessonDocumentFile] update", updateErr);
    await secret.storage.from(LESSON_DOCUMENTS_BUCKET).remove([storagePath]);
    return { ok: false, error: "Could not save lesson document." };
  }

  if (oldPath && oldPath !== storagePath) {
    const { error: rmErr } = await secret.storage
      .from(LESSON_DOCUMENTS_BUCKET)
      .remove([oldPath]);
    if (rmErr) {
      console.error("[replaceAdminLessonDocumentFile] remove old", rmErr);
    }
  }

  revalidateLessonPaths();
  return { ok: true, documentId };
}
