"use server";

import { fetchPendingInvitesPage } from "@/app/(protected)/school/students/_lib/fetch-pending-invites-page";
import {
  fetchAllSchoolStudentTableRows,
  type SchoolStudentTableRow,
} from "@/app/(protected)/school/students/_lib/fetch-school-students-page";
import {
  DEFAULT_MY_APPLICATION_DOCUMENT_SLOTS,
  SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY,
} from "@/app/(protected)/student/my-applications/_lib/my-applications-defaults";
import { GRADE_FILTER_OPTIONS } from "@/lib/school-portal-destination-options";
import {
  isSchoolStudentNoteTag,
  SCHOOL_STUDENT_NOTE_TAGS,
} from "@/lib/school-student-note-tags";
import {
  isStudentInteractionKind,
  isStudentInteractionOutcome,
} from "@/lib/student-interaction-constants";
import type { Database } from "@/database.types";
import type { GeneralResponse } from "@/utils/response";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

export type {
  PendingInviteRow,
  PendingInvitesPageFilters,
} from "@/app/(protected)/school/students/_lib/fetch-pending-invites-page";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const GRADE_ALLOWED = new Set<string>(GRADE_FILTER_OPTIONS);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Adds a pending invite row for this school (`signed_up = false`).
 * Enrollment still requires the student to complete signup with the school code.
 */
export async function inviteSchoolStudentEmail(
  _prev: GeneralResponse<null> | null,
  formData: FormData,
): Promise<GeneralResponse<null>> {
  const raw = String(formData.get("email") ?? "").trim();
  const email = normalizeEmail(raw);

  if (!email) {
    return { data: null, error: "Please enter an email address." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { data: null, error: "Enter a valid email address." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { data: null, error: "You must be signed in." };
  }

  const { data: sap, error: sapError } = await supabase
    .from("school_admin_profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (sapError) {
    console.error("[inviteSchoolStudentEmail] school_admin_profiles", sapError);
    return {
      data: null,
      error:
        "Could not load your school admin profile. Ensure the latest database access rules are applied.",
    };
  }

  if (!sap?.school_id) {
    return {
      data: null,
      error:
        "Your account is not linked to a school admin profile. Ask a platform admin to assign you, or sign in with the correct school admin account.",
    };
  }

  const schoolId = sap.school_id;

  const secret = await createSupabaseSecretClient();
  const { data: existingProfile, error: existingProfileError } = await secret
    .from("student_profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfileError) {
    console.error(
      "[inviteSchoolStudentEmail] student_profiles exists check",
      existingProfileError,
    );
    return {
      data: null,
      error: "Could not verify whether this email is already enrolled.",
    };
  }

  if (existingProfile) {
    return {
      data: null,
      error:
        "This email already belongs to an enrolled student. They can sign in instead of receiving a new invite.",
    };
  }

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("students_limit")
    .eq("id", schoolId)
    .maybeSingle();

  if (schoolError) {
    return { data: null, error: "Could not verify school enrollment limits." };
  }

  const limit = school?.students_limit;
  // Capacity = enrolled students + pending invites (unsigned rows). New invite is allowed only if total stays under students_limit.
  if (limit != null) {
    if (limit <= 0) {
      return {
        data: null,
        error: "This school has no student capacity configured.",
      };
    }

    const { count: enrolledCount, error: enrolledCountError } = await secret
      .from("student_profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId);

    const { count: pendingInviteCount, error: pendingInviteCountError } =
      await secret
        .from("school_students")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("signed_up", false);

    if (enrolledCountError || pendingInviteCountError) {
      return {
        data: null,
        error:
          "Could not verify how many students and invites are already registered for your school.",
      };
    }

    const total = (enrolledCount ?? 0) + (pendingInviteCount ?? 0);
    if (total >= limit) {
      return {
        data: null,
        error:
          "This school has reached its student limit (enrolled students plus pending invites). Remove an invite or raise the limit before adding another.",
      };
    }
  }

  const gradeRaw = String(formData.get("grade") ?? "").trim();
  const grade =
    gradeRaw === "" ? null : GRADE_ALLOWED.has(gradeRaw) ? gradeRaw : null;
  if (gradeRaw !== "" && grade === null) {
    return {
      data: null,
      error: "Choose a valid grade or leave it blank.",
    };
  }

  const counselorRaw = String(
    formData.get("counselorSchoolAdminId") ?? "",
  ).trim();
  let counselorSchoolAdminId: string | null = null;
  if (counselorRaw !== "") {
    if (!UUID_RE.test(counselorRaw)) {
      return { data: null, error: "Invalid counselor selection." };
    }
    const { data: counselorRow, error: counselorErr } = await supabase
      .from("school_admin_profiles")
      .select("id")
      .eq("id", counselorRaw)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (counselorErr || !counselorRow) {
      return {
        data: null,
        error: "That counselor is not part of your school.",
      };
    }
    counselorSchoolAdminId = counselorRaw;
  }

  const { error: insertError } = await supabase.from("school_students").insert({
    school_id: schoolId,
    email,
    signed_up: false,
    grade,
    counselor_school_admin_id: counselorSchoolAdminId,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        data: null,
        error:
          "That email is already on the invite or enrollment list for this school.",
      };
    }
    return { data: null, error: insertError.message };
  }

  return { data: null, error: null };
}

export async function getPendingSchoolInvites(filters: {
  q: string;
  page: number;
  limit: number;
}) {
  return fetchPendingInvitesPage({
    q: filters.q,
    page: filters.page,
    limit: filters.limit,
  });
}

/**
 * Removes a pending invite row for this school (`signed_up` must still be false).
 */
export async function deleteSchoolStudentInvite(
  inviteId: string,
): Promise<GeneralResponse<null>> {
  const id = inviteId.trim();
  if (!id || !UUID_RE.test(id)) {
    return { data: null, error: "Invalid invite." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { data: null, error: "You must be signed in." };
  }

  const { data: sap, error: sapError } = await supabase
    .from("school_admin_profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (sapError || !sap?.school_id) {
    return {
      data: null,
      error:
        "Could not verify your school admin access. Ensure the latest database access rules are applied.",
    };
  }

  const { data: removed, error: deleteError } = await supabase
    .from("school_students")
    .delete()
    .eq("id", id)
    .eq("school_id", sap.school_id)
    .eq("signed_up", false)
    .select("id");

  if (deleteError) {
    console.error("[deleteSchoolStudentInvite]", deleteError);
    return { data: null, error: deleteError.message };
  }

  if (!removed?.length) {
    return {
      data: null,
      error:
        "That invite was not found, already removed, or the student has already signed up.",
    };
  }

  return { data: null, error: null };
}

export async function updateSchoolStudentCreditLimits(
  studentId: string,
  patch: {
    advisor_credit_limit?: number | null;
    ambassador_credit_limit?: number | null;
  },
): Promise<GeneralResponse<null>> {
  const id = studentId.trim();
  if (!id || !UUID_RE.test(id)) {
    return { data: null, error: "Invalid student." };
  }

  const hasAdvisor = Object.prototype.hasOwnProperty.call(
    patch,
    "advisor_credit_limit",
  );
  const hasAmbassador = Object.prototype.hasOwnProperty.call(
    patch,
    "ambassador_credit_limit",
  );
  if (!hasAdvisor && !hasAmbassador) {
    return { data: null, error: "Nothing to update." };
  }

  const validate = (label: string, v: unknown): string | null => {
    if (v === null || v === undefined) return null;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
      return `${label} must be a whole number ≥ 0, or left blank for the school default.`;
    }
    return null;
  };

  type StudentProfileUpdate =
    Database["public"]["Tables"]["student_profiles"]["Update"];

  const updateRow: StudentProfileUpdate = {};

  if (hasAdvisor) {
    const msg = validate("Advisor credit limit", patch.advisor_credit_limit);
    if (msg) return { data: null, error: msg };
    updateRow.advisor_credit_limit = patch.advisor_credit_limit ?? null;
  }

  if (hasAmbassador) {
    const msg = validate(
      "Ambassador credit limit",
      patch.ambassador_credit_limit,
    );
    if (msg) return { data: null, error: msg };
    updateRow.ambassador_credit_limit = patch.ambassador_credit_limit ?? null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { data: null, error: "You must be signed in." };
  }

  const { data: sap, error: sapError } = await supabase
    .from("school_admin_profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (sapError || !sap?.school_id) {
    return {
      data: null,
      error:
        "Could not verify your school admin access. Ensure the latest database access rules are applied.",
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("student_profiles")
    .update(updateRow)
    .eq("id", id)
    .eq("school_id", sap.school_id)
    .select("id");

  if (updateError) {
    console.error("[updateSchoolStudentCreditLimits]", updateError);
    return { data: null, error: updateError.message };
  }

  if (!updated?.length) {
    return {
      data: null,
      error:
        "That student was not found or you do not have permission to edit their profile.",
    };
  }

  return { data: null, error: null };
}

const NOTE_CONTENT_MAX = 8000;

export async function addSchoolStudentNote(
  _prev: GeneralResponse<null> | null,
  formData: FormData,
): Promise<GeneralResponse<null>> {
  const studentId = String(formData.get("student_id") ?? "").trim();
  const noteType = String(formData.get("note_type") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!studentId || !UUID_RE.test(studentId)) {
    return { data: null, error: "Invalid student." };
  }
  if (!isSchoolStudentNoteTag(noteType)) {
    return {
      data: null,
      error: `Choose a note type: ${SCHOOL_STUDENT_NOTE_TAGS.join(", ")}.`,
    };
  }
  if (!content) {
    return { data: null, error: "Enter the note content." };
  }
  if (content.length > NOTE_CONTENT_MAX) {
    return {
      data: null,
      error: `Note content must be at most ${NOTE_CONTENT_MAX} characters.`,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { data: null, error: "You must be signed in." };
  }

  const { data: sap, error: sapError } = await supabase
    .from("school_admin_profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (sapError || !sap?.school_id) {
    return {
      data: null,
      error:
        "Could not verify your school admin access. Ensure the latest database access rules are applied.",
    };
  }

  const { data: spRow, error: spErr } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("id", studentId)
    .eq("school_id", sap.school_id)
    .maybeSingle();

  if (spErr) {
    console.error("[addSchoolStudentNote] student_profiles", spErr);
    return { data: null, error: "Could not verify this student." };
  }
  if (!spRow) {
    return {
      data: null,
      error: "That student was not found or is not enrolled at your school.",
    };
  }

  const { error: insertError } = await supabase.from("student_notes").insert({
    student_id: studentId,
    author_id: user.id,
    note_type: noteType,
    content,
  });

  if (insertError) {
    console.error("[addSchoolStudentNote] insert", insertError);
    return { data: null, error: insertError.message };
  }

  revalidatePath(`/school/students/${studentId}`);
  return { data: null, error: null };
}

const INTERACTION_NOTES_MAX = 8000;

export async function addSchoolStudentInteraction(
  _prev: GeneralResponse<null> | null,
  formData: FormData,
): Promise<GeneralResponse<null>> {
  const studentId = String(formData.get("student_id") ?? "").trim();
  const kind = String(formData.get("interaction_kind") ?? "").trim();
  const occurredRaw = String(formData.get("occurred_on") ?? "").trim();
  const durationRaw = String(formData.get("duration_minutes") ?? "").trim();
  const outcome = String(formData.get("outcome") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!studentId || !UUID_RE.test(studentId)) {
    return { data: null, error: "Invalid student." };
  }
  if (!isStudentInteractionKind(kind)) {
    return {
      data: null,
      error: "Choose a valid interaction type.",
    };
  }
  if (!occurredRaw || !/^\d{4}-\d{2}-\d{2}$/.test(occurredRaw)) {
    return {
      data: null,
      error: "Choose a valid date.",
    };
  }
  let durationMinutes: number | null = null;
  if (durationRaw !== "") {
    if (!/^\d+$/.test(durationRaw)) {
      return {
        data: null,
        error: "Duration must be a whole number of minutes.",
      };
    }
    const n = Number(durationRaw);
    if (!Number.isSafeInteger(n) || n > 1440 * 7) {
      return {
        data: null,
        error: "Duration is too large.",
      };
    }
    durationMinutes = n;
  }
  if (!isStudentInteractionOutcome(outcome)) {
    return {
      data: null,
      error: "Choose a valid outcome.",
    };
  }
  if (!notes) {
    return {
      data: null,
      error: "Add notes about what was discussed.",
    };
  }
  if (notes.length > INTERACTION_NOTES_MAX) {
    return {
      data: null,
      error: `Notes must be at most ${INTERACTION_NOTES_MAX} characters.`,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { data: null, error: "You must be signed in." };
  }

  const { data: sap, error: sapError } = await supabase
    .from("school_admin_profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (sapError || !sap?.school_id) {
    return {
      data: null,
      error:
        "Could not verify your school admin access. Ensure the latest database access rules are applied.",
    };
  }

  const { data: spRow, error: spErr } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("id", studentId)
    .eq("school_id", sap.school_id)
    .maybeSingle();

  if (spErr) {
    console.error("[addSchoolStudentInteraction] student_profiles", spErr);
    return { data: null, error: "Could not verify this student." };
  }
  if (!spRow) {
    return {
      data: null,
      error: "That student was not found or is not enrolled at your school.",
    };
  }

  const { error: insertError } = await supabase
    .from("student_counselor_interactions")
    .insert({
      student_id: studentId,
      author_id: user.id,
      interaction_kind: kind,
      occurred_on: occurredRaw,
      duration_minutes: durationMinutes,
      outcome,
      notes,
    });

  if (insertError) {
    console.error("[addSchoolStudentInteraction] insert", insertError);
    return { data: null, error: insertError.message };
  }

  revalidatePath(`/school/students/${studentId}`);
  return { data: null, error: null };
}

/**
 * Counselor-only: text-only **Predicted** document (`school_text_value`, slot `predicted`).
 * Mirrors into `student_application_profile.predicted_grades` for the student profile.
 */
export async function updateSchoolPredictedDocumentSlot(
  studentId: string,
  schoolText: string,
): Promise<{ ok: true } | { error: string }> {
  if (!studentId || !UUID_RE.test(studentId)) {
    return { error: "Invalid student." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { error: "You must be signed in." };
  }

  const { data: sap, error: sapError } = await supabase
    .from("school_admin_profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (sapError || !sap?.school_id) {
    return {
      error:
        "Could not verify your school admin access. Ensure the latest database access rules are applied.",
    };
  }

  const { data: spRow } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("id", studentId)
    .eq("school_id", sap.school_id)
    .maybeSingle();

  if (!spRow) {
    return {
      error: "That student was not found or is not enrolled at your school.",
    };
  }

  const trimmed = schoolText.trim();
  const secret = await createSupabaseSecretClient();
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
      console.error("[updateSchoolPredictedDocumentSlot] doc", docErr);
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
      console.error("[updateSchoolPredictedDocumentSlot] insert", insErr);
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
    console.error("[updateSchoolPredictedDocumentSlot] profile", profErr);
    return { error: profErr.message };
  }

  revalidatePath(`/school/students/${studentId}`);
  revalidatePath("/student/my-applications");
  return { ok: true };
}

/** Full student list for CSV export (current search / grade / destination filters, no pagination). */
export async function getSchoolStudentsFullExportRows(
  q: string,
  grade: string,
  dest: string,
): Promise<GeneralResponse<SchoolStudentTableRow[] | null>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { data: null, error: "You must be signed in." };
  }

  const { data: sap, error: sapError } = await supabase
    .from("school_admin_profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (sapError) {
    console.error("[getSchoolStudentsFullExportRows]", sapError);
    return {
      data: null,
      error: "Could not load your school admin profile.",
    };
  }

  if (!sap?.school_id) {
    return {
      data: null,
      error: "Your account is not linked to a school.",
    };
  }

  const rows = await fetchAllSchoolStudentTableRows(supabase, sap.school_id, {
    q: typeof q === "string" ? q : "",
    grade: typeof grade === "string" ? grade : "",
    destination: typeof dest === "string" ? dest : "",
  });

  return { data: rows, error: null };
}
