"use server";

import {
  DEFAULT_MY_APPLICATION_DOCUMENT_SLOTS,
  SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY,
} from "@/app/(protected)/student/my-applications/_lib/my-applications-defaults";
import { assertAdminPermission } from "@/lib/assert-admin-permission";
import { deliverStudentDocumentReminder } from "@/lib/send-student-document-reminder";
import { normalizeChecklistStatus } from "@/lib/student-application-document-status";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

import { STUDENT_MY_APPLICATIONS_BUCKET } from "@/lib/admin-student-document-constants";
import { getAdminStudentDocumentSignedUrl } from "@/lib/admin-student-document-view";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AdminActionResult = { ok: true } | { ok: false; error: string };

function revalidateStudentDocumentPaths(studentId: string) {
  revalidatePath(`/admin/users/students/${studentId}`);
  revalidatePath("/admin/documents");
  revalidatePath("/student/my-applications");
}

async function assertAdminDocumentsAccess(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const access = await assertAdminPermission("edit_documents");
  if (!access.ok) return access;
  return { ok: true };
}

async function assertAdminViewAccess(): Promise<
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
  const access = await assertAdminViewAccess();
  if (!access.ok) {
    return { error: access.error };
  }

  const secret = await createSupabaseSecretClient();
  return getAdminStudentDocumentSignedUrl(secret, documentId);
}

/**
 * Emails the student a reminder to upload a missing document.
 */
export async function sendAdminDocumentReminder(
  documentId: string,
): Promise<{ ok: true } | { error: string }> {
  const access = await assertAdminViewAccess();
  if (!access.ok) {
    return { error: access.error };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const secret = await createSupabaseSecretClient();
  const { data: doc, error: docErr } = await secret
    .from("student_my_application_documents")
    .select("id, student_id, display_name, status, storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (docErr || !doc) {
    return { error: "Document not found." };
  }

  const { data: profile } = await secret
    .from("student_profiles")
    .select("email, first_name, last_name")
    .eq("id", doc.student_id)
    .maybeSingle();

  if (!profile?.email?.trim()) {
    return { error: "This student has no email on file." };
  }

  let requestedByName = "Univeera Admin";
  if (user?.id) {
    const { data: admin } = await secret
      .from("admins")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();
    requestedByName =
      [admin?.first_name, admin?.last_name].filter(Boolean).join(" ").trim() ||
      requestedByName;
  }

  return deliverStudentDocumentReminder({
    studentEmail: profile.email,
    studentFirstName: profile.first_name,
    studentLastName: profile.last_name,
    documentDisplayName: doc.display_name,
    documentStatus: doc.status,
    documentStoragePath: doc.storage_path,
    requestedByName,
    requestedByRole: "admin",
  });
}

export async function updateAdminStudentDocumentStatus(
  documentId: string,
  status: string,
): Promise<AdminActionResult> {
  const access = await assertAdminDocumentsAccess();
  if (!access.ok) return access;

  if (!documentId || !UUID_RE.test(documentId)) {
    return { ok: false, error: "Invalid document." };
  }

  const normalized = normalizeChecklistStatus(status);
  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();

  const { data: doc, error } = await secret
    .from("student_my_application_documents")
    .update({ status: normalized, updated_at: now })
    .eq("id", documentId)
    .select("student_id")
    .maybeSingle();

  if (error || !doc) {
    console.error("[updateAdminStudentDocumentStatus]", error);
    return { ok: false, error: "Could not update status." };
  }

  revalidateStudentDocumentPaths(doc.student_id);
  return { ok: true };
}

export async function removeAdminStudentDocument(
  documentId: string,
): Promise<AdminActionResult> {
  const access = await assertAdminDocumentsAccess();
  if (!access.ok) return access;

  if (!documentId || !UUID_RE.test(documentId)) {
    return { ok: false, error: "Invalid document." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: doc, error: docErr } = await secret
    .from("student_my_application_documents")
    .select("id, student_id, slot_key, storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (docErr || !doc) {
    return { ok: false, error: "Document not found." };
  }

  if (doc.slot_key === SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY) {
    return { ok: false, error: "This slot does not have an uploaded file." };
  }

  const storagePath = doc.storage_path?.trim();
  if (storagePath) {
    const { error: rmErr } = await secret.storage
      .from(STUDENT_MY_APPLICATIONS_BUCKET)
      .remove([storagePath]);
    if (rmErr) {
      console.error("[removeAdminStudentDocument] storage", rmErr);
      return { ok: false, error: "Could not remove the uploaded file." };
    }
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await secret
    .from("student_my_application_documents")
    .update({
      storage_path: null,
      file_name: null,
      uploaded_at: null,
      status: "missing",
      updated_at: now,
    })
    .eq("id", documentId);

  if (updateErr) {
    console.error("[removeAdminStudentDocument] update", updateErr);
    return { ok: false, error: "Could not clear document metadata." };
  }

  revalidateStudentDocumentPaths(doc.student_id);
  return { ok: true };
}

export async function updateAdminPredictedDocumentSlot(
  studentId: string,
  schoolText: string,
): Promise<{ ok: true } | { error: string }> {
  const access = await assertAdminDocumentsAccess();
  if (!access.ok) return { error: access.error };

  if (!studentId || !UUID_RE.test(studentId)) {
    return { error: "Invalid student." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: spRow, error: spErr } = await secret
    .from("student_profiles")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();

  if (spErr || !spRow) {
    return { error: "Student not found." };
  }

  const trimmed = schoolText.trim();
  const now = new Date().toISOString();

  const predDef = DEFAULT_MY_APPLICATION_DOCUMENT_SLOTS.find(
    (s) => s.slot_key === SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY,
  );
  if (!predDef) {
    return { error: "Predicted document slot is not configured." };
  }

  const { data: docRow } = await secret
    .from("student_my_application_documents")
    .select("id")
    .eq("student_id", studentId)
    .eq("slot_key", SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY)
    .maybeSingle();

  if (docRow?.id) {
    const { error: docErr } = await secret
      .from("student_my_application_documents")
      .update({
        school_text_value: trimmed || null,
        status: trimmed ? "approved" : "missing",
        updated_at: now,
      })
      .eq("id", docRow.id);
    if (docErr) {
      console.error("[updateAdminPredictedDocumentSlot] doc", docErr);
      return { error: docErr.message };
    }
  } else {
    const { error: insErr } = await secret
      .from("student_my_application_documents")
      .insert({
        student_id: studentId,
        slot_key: predDef.slot_key,
        display_name: predDef.display_name,
        description: predDef.description,
        status: trimmed ? "approved" : "missing",
        school_text_value: trimmed || null,
        updated_at: now,
      });
    if (insErr) {
      console.error("[updateAdminPredictedDocumentSlot] insert", insErr);
      return { error: insErr.message };
    }
  }

  const { error: profErr } = await secret
    .from("student_application_profile")
    .upsert(
      {
        student_id: studentId,
        predicted_grades: trimmed || null,
        predicted_grades_set_by_school: true,
        updated_at: now,
      },
      { onConflict: "student_id" },
    );

  if (profErr) {
    console.error("[updateAdminPredictedDocumentSlot] profile", profErr);
    return { error: profErr.message };
  }

  revalidateStudentDocumentPaths(studentId);
  return { ok: true };
}
