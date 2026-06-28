"use server";

import {
  DEFAULT_MY_APPLICATION_DOCUMENT_SLOTS,
  SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY,
} from "@/app/(protected)/student/my-applications/_lib/my-applications-defaults";
import { assertAdvisorAccess } from "@/lib/advisor-access";
import {
  assertAdvisorCanAccessStudent,
  assertAdvisorDocumentSession,
} from "@/lib/advisor-document-route-auth";
import { deliverStudentDocumentReminder } from "@/lib/send-student-document-reminder";
import { normalizeChecklistStatus } from "@/lib/student-application-document-status";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

import { STUDENT_MY_APPLICATIONS_BUCKET } from "@/lib/admin-student-document-constants";
import { getAdminStudentDocumentSignedUrl } from "@/lib/admin-student-document-view";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AdvisorActionResult = { ok: true } | { ok: false; error: string };

async function revalidateAdvisorStudentDocumentPaths(
  service: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  studentId: string,
) {
  revalidatePath("/advisor/applications");
  revalidatePath("/student/my-applications");

  const { data: apps } = await service
    .from("applications")
    .select("id")
    .eq("student_id", studentId);

  for (const app of apps ?? []) {
    revalidatePath(`/advisor/applications/${app.id}`);
  }
}

async function assertAdvisorCanAccessDocument(
  documentId: string,
): Promise<
  | {
      ok: true;
      service: Awaited<ReturnType<typeof createSupabaseSecretClient>>;
    }
  | { ok: false; error: string }
> {
  const session = await assertAdvisorDocumentSession();
  if (!session.ok) return session;

  if (!documentId || !UUID_RE.test(documentId)) {
    return { ok: false, error: "Invalid document." };
  }

  const { data: doc, error: docErr } = await session.service
    .from("student_my_application_documents")
    .select("student_id")
    .eq("id", documentId)
    .maybeSingle();

  if (docErr || !doc) {
    return { ok: false, error: "Document not found." };
  }

  const studentAccess = await assertAdvisorCanAccessStudent(doc.student_id);
  if (!studentAccess.ok) {
    return { ok: false, error: studentAccess.error };
  }

  return { ok: true, service: session.service };
}

export async function getAdvisorMyApplicationDocumentViewUrl(
  documentId: string,
): Promise<{ url: string } | { error: string }> {
  const access = await assertAdvisorCanAccessDocument(documentId);
  if (!access.ok) {
    return { error: access.error };
  }

  return getAdminStudentDocumentSignedUrl(access.service, documentId);
}

export async function updateAdvisorStudentDocumentStatus(
  documentId: string,
  status: string,
): Promise<AdvisorActionResult> {
  const access = await assertAdvisorCanAccessDocument(documentId);
  if (!access.ok) return access;

  const normalized = normalizeChecklistStatus(status);
  const now = new Date().toISOString();

  const { data: doc, error } = await access.service
    .from("student_my_application_documents")
    .update({ status: normalized, updated_at: now })
    .eq("id", documentId)
    .select("student_id")
    .maybeSingle();

  if (error || !doc) {
    console.error("[updateAdvisorStudentDocumentStatus]", error);
    return { ok: false, error: "Could not update status." };
  }

  await revalidateAdvisorStudentDocumentPaths(access.service, doc.student_id);
  return { ok: true };
}

export async function removeAdvisorStudentDocument(
  documentId: string,
): Promise<AdvisorActionResult> {
  const access = await assertAdvisorCanAccessDocument(documentId);
  if (!access.ok) return access;

  const { data: doc, error: docErr } = await access.service
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
    const { error: rmErr } = await access.service.storage
      .from(STUDENT_MY_APPLICATIONS_BUCKET)
      .remove([storagePath]);
    if (rmErr) {
      console.error("[removeAdvisorStudentDocument] storage", rmErr);
      return { ok: false, error: "Could not remove the uploaded file." };
    }
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await access.service
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
    console.error("[removeAdvisorStudentDocument] update", updateErr);
    return { ok: false, error: "Could not clear document metadata." };
  }

  await revalidateAdvisorStudentDocumentPaths(access.service, doc.student_id);
  return { ok: true };
}

export async function updateAdvisorPredictedDocumentSlot(
  studentId: string,
  schoolText: string,
): Promise<{ ok: true } | { error: string }> {
  const access = await assertAdvisorCanAccessStudent(studentId);
  if (!access.ok) return { error: access.error };

  const trimmed = schoolText.trim();
  const now = new Date().toISOString();

  const predDef = DEFAULT_MY_APPLICATION_DOCUMENT_SLOTS.find(
    (s) => s.slot_key === SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY,
  );
  if (!predDef) {
    return { error: "Predicted document slot is not configured." };
  }

  const { data: docRow } = await access.service
    .from("student_my_application_documents")
    .select("id")
    .eq("student_id", studentId)
    .eq("slot_key", SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY)
    .maybeSingle();

  if (docRow?.id) {
    const { error: docErr } = await access.service
      .from("student_my_application_documents")
      .update({
        school_text_value: trimmed || null,
        status: trimmed ? "approved" : "missing",
        updated_at: now,
      })
      .eq("id", docRow.id);
    if (docErr) {
      console.error("[updateAdvisorPredictedDocumentSlot] doc", docErr);
      return { error: docErr.message };
    }
  } else {
    const { error: insErr } = await access.service
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
      console.error("[updateAdvisorPredictedDocumentSlot] insert", insErr);
      return { error: insErr.message };
    }
  }

  const { error: profErr } = await access.service
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
    console.error("[updateAdvisorPredictedDocumentSlot] profile", profErr);
    return { error: profErr.message };
  }

  await revalidateAdvisorStudentDocumentPaths(access.service, studentId);
  return { ok: true };
}

export async function sendAdvisorDocumentReminder(
  documentId: string,
): Promise<{ ok: true } | { error: string }> {
  const access = await assertAdvisorCanAccessDocument(documentId);
  if (!access.ok) return { error: access.error };

  const advisorAccess = await assertAdvisorAccess();
  if (!advisorAccess.ok) return { error: advisorAccess.error };

  const { data: doc, error: docErr } = await access.service
    .from("student_my_application_documents")
    .select("id, student_id, display_name, status, storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (docErr || !doc) {
    return { error: "Document not found." };
  }

  const { data: profile } = await access.service
    .from("student_profiles")
    .select("email, first_name, last_name")
    .eq("id", doc.student_id)
    .maybeSingle();

  if (!profile?.email?.trim()) {
    return { error: "This student has no email on file." };
  }

  return deliverStudentDocumentReminder({
    studentEmail: profile.email,
    studentFirstName: profile.first_name,
    studentLastName: profile.last_name,
    documentDisplayName: doc.display_name,
    documentStatus: doc.status,
    documentStoragePath: doc.storage_path,
    requestedByName: advisorAccess.advisorName,
    requestedByRole: "advisor",
  });
}
