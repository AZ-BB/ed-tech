"use server";

import {
  fetchAdminLessonsPage,
  type AdminLessonTableRow,
} from "@/app/(protected)/admin/lessons/_lib/fetch-admin-lessons-page";
import { LESSON_DOCUMENTS_BUCKET } from "@/lib/admin-lesson-document-constants";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type AdminLessonActionResult = { ok: true } | { ok: false; error: string };

const ADMIN_LESSONS_HOME = "/admin/lessons";
const SCHOOL_LESSONS_HOME = "/school/lessons";

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
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[admin-lessons] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage lessons.",
    };
  }

  return { ok: true as const, service };
}

function parseDocumentId(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : null;
}

function revalidateLessonPaths() {
  revalidatePath(ADMIN_LESSONS_HOME);
  revalidatePath(SCHOOL_LESSONS_HOME);
}

export async function loadAdminLessons(): Promise<
  | { ok: true; rows: AdminLessonTableRow[] }
  | { ok: false; error: string }
> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const rows = await fetchAdminLessonsPage();
  return { ok: true, rows };
}

export async function updateAdminLesson(
  formData: FormData,
): Promise<AdminLessonActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = parseDocumentId(formData.get("id"));
  if (!id) {
    return { ok: false, error: "Invalid lesson document." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title) {
    return { ok: false, error: "Title is required." };
  }

  const { error } = await access.service
    .from("lesson_documents")
    .update({
      title,
      description: description || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[updateAdminLesson]", error);
    return { ok: false, error: "Could not update lesson document." };
  }

  revalidateLessonPaths();
  return { ok: true };
}

export async function deleteAdminLesson(
  documentId: string,
): Promise<AdminLessonActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!parseDocumentId(documentId)) {
    return { ok: false, error: "Invalid lesson document." };
  }

  const { data: doc, error: docErr } = await access.service
    .from("lesson_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (docErr || !doc) {
    return { ok: false, error: "Lesson document not found." };
  }

  const { error } = await access.service
    .from("lesson_documents")
    .delete()
    .eq("id", documentId);

  if (error) {
    console.error("[deleteAdminLesson]", error);
    return { ok: false, error: "Could not delete lesson document." };
  }

  const storagePath = doc.storage_path?.trim();
  if (storagePath) {
    const { error: rmErr } = await access.service.storage
      .from(LESSON_DOCUMENTS_BUCKET)
      .remove([storagePath]);
    if (rmErr) {
      console.error("[deleteAdminLesson] remove storage", rmErr);
    }
  }

  revalidateLessonPaths();
  return { ok: true };
}

export async function getAdminLessonDownloadUrl(
  documentId: string,
): Promise<{ url: string } | { error: string }> {
  const access = await assertAdminAccess();
  if (!access.ok) return { error: access.error };

  if (!parseDocumentId(documentId)) {
    return { error: "Invalid lesson document." };
  }

  const { data: doc, error: docErr } = await access.service
    .from("lesson_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (docErr || !doc?.storage_path) {
    return { error: "Lesson document not found." };
  }

  const { data: signed, error: signErr } = await access.service.storage
    .from(LESSON_DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storage_path, 120);

  if (signErr || !signed?.signedUrl) {
    console.error("[getAdminLessonDownloadUrl]", signErr);
    return { error: "Could not open the file. Try again later." };
  }

  return { url: signed.signedUrl };
}
