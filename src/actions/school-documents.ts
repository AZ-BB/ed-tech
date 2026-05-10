"use server";

import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

export async function getSchoolMyApplicationDocumentViewUrl(
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
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!sap?.school_id) {
    return { error: "Your account is not linked to a school." };
  }

  const { data: doc, error: docErr } = await supabase
    .from("student_my_application_documents")
    .select("id, student_id, storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (docErr || !doc?.storage_path) {
    return { error: "No uploaded file for this document." };
  }

  const { data: profile } = await supabase
    .from("student_profiles")
    .select("school_id")
    .eq("id", doc.student_id)
    .maybeSingle();

  if (profile?.school_id !== sap.school_id) {
    return { error: "You do not have access to this document." };
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
export async function sendSchoolDocumentReminder(
  documentId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { error: "You must be signed in." };
  }

  const { data: sap } = await supabase
    .from("school_admin_profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!sap?.school_id) {
    return { error: "Your account is not linked to a school." };
  }

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
    .select("school_id, email")
    .eq("id", doc.student_id)
    .maybeSingle();

  if (profile?.school_id !== sap.school_id) {
    return { error: "You do not have access to this student." };
  }

  if (!profile.email?.trim()) {
    return { error: "This student has no email on file." };
  }

  // TODO: Resend — e.g. resend.emails.send({ from, to: profile.email, subject, html })

  return { ok: true };
}
