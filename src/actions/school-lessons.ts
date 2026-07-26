"use server";

import { LESSON_DOCUMENTS_BUCKET } from "@/lib/admin-lesson-document-constants";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

export async function getSchoolLessonDownloadUrl(
  documentId: string,
): Promise<{ url: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { error: "You must be signed in." };
  }

  const { data: sap } = await supabase
    .from("school_admin_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!sap) {
    return { error: "Your account is not linked to a school." };
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      documentId,
    )
  ) {
    return { error: "Invalid lesson document." };
  }

  const { data: doc, error: docErr } = await supabase
    .from("lesson_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (docErr || !doc?.storage_path) {
    return { error: "Lesson document not found." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: signed, error: signErr } = await secret.storage
    .from(LESSON_DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storage_path, 120);

  if (signErr || !signed?.signedUrl) {
    console.error("[getSchoolLessonDownloadUrl]", signErr);
    return { error: "Could not download the file. Try again later." };
  }

  return { url: signed.signedUrl };
}
