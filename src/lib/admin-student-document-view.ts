import { STUDENT_MY_APPLICATIONS_BUCKET } from "@/lib/admin-student-document-constants";
import type { createSupabaseSecretClient } from "@/utils/supabase-server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SIGNED_URL_TTL_SEC = 120;

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export async function getAdminStudentDocumentSignedUrl(
  secret: SecretClient,
  documentId: string,
): Promise<{ url: string } | { error: string }> {
  if (!documentId || !UUID_RE.test(documentId)) {
    return { error: "Invalid document." };
  }

  const { data: doc, error: docErr } = await secret
    .from("student_my_application_documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (docErr) {
    console.error("[getAdminStudentDocumentSignedUrl] doc", docErr);
    return { error: "Could not load this document." };
  }

  if (!doc?.storage_path?.trim()) {
    return { error: "No uploaded file for this document." };
  }

  const { data: signed, error: signErr } = await secret.storage
    .from(STUDENT_MY_APPLICATIONS_BUCKET)
    .createSignedUrl(doc.storage_path, SIGNED_URL_TTL_SEC);

  if (signErr || !signed?.signedUrl) {
    console.error("[getAdminStudentDocumentSignedUrl] sign", signErr);
    return { error: "Could not open the file. Try again later." };
  }

  return { url: signed.signedUrl };
}
