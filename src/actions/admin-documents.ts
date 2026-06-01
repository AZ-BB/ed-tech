"use server";

import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

async function assertAdminAccess(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, error: "You must be signed in." };
  }

  const service = await createSupabaseSecretClient();
  const { data: admin, error: adminError } = await service
    .from("admins")
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[admin-documents] admin lookup", adminError);
    return { ok: false, error: "Could not verify admin access." };
  }

  if (!admin) {
    return { ok: false, error: "You do not have permission to manage documents." };
  }

  if (admin.is_active === false) {
    return { ok: false, error: "Your admin account is inactive." };
  }

  return { ok: true };
}

export async function getAdminMyApplicationDocumentViewUrl(
  documentId: string,
): Promise<{ url: string } | { error: string }> {
  const access = await assertAdminAccess();
  if (!access.ok) {
    return { error: access.error };
  }

  const supabase = await createSupabaseServerClient();
  const { data: doc, error: docErr } = await supabase
    .from("student_my_application_documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (docErr || !doc?.storage_path) {
    return { error: "No uploaded file for this document." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: signed, error: signErr } = await secret.storage
    .from("student-my-applications")
    .createSignedUrl(doc.storage_path, 120);

  if (signErr || !signed?.signedUrl) {
    console.error(signErr);
    return { error: "Could not open the file. Try again later." };
  }

  return { url: signed.signedUrl };
}

function isDocumentMissingForReminder(
  status: string,
  storagePath: string | null,
): boolean {
  if (storagePath) return false;
  return status !== "submitted";
}

/**
 * Placeholder for emailing the student via Resend. Validates access and missing-doc state;
 * wire `resend.emails.send` here when ready.
 */
export async function sendAdminDocumentReminder(
  documentId: string,
): Promise<{ ok: true } | { error: string }> {
  const access = await assertAdminAccess();
  if (!access.ok) {
    return { error: access.error };
  }

  const supabase = await createSupabaseServerClient();
  const { data: doc, error: docErr } = await supabase
    .from("student_my_application_documents")
    .select("id, student_id, display_name, status, storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (docErr || !doc) {
    return { error: "Document not found." };
  }

  if (!isDocumentMissingForReminder(doc.status, doc.storage_path)) {
    return { error: "This document is already uploaded." };
  }

  const { data: profile } = await supabase
    .from("student_profiles")
    .select("email")
    .eq("id", doc.student_id)
    .maybeSingle();

  if (!profile?.email?.trim()) {
    return { error: "This student has no email on file." };
  }

  // TODO: Resend — e.g. resend.emails.send({ from, to: profile.email, subject, html })

  return { ok: true };
}
