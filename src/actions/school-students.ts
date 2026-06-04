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
import { recordStudentCreditAssignments } from "@/lib/student-credit-assignment-log";
import { parseStudentTeacherAssignParam } from "@/lib/student-teacher-assignment";
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

  const { error: insertError } = await supabase.from("school_students").insert({
    school_id: schoolId,
    email,
    signed_up: false,
    grade,
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
    advisor_credits_to_add?: number;
    ambassador_credits_to_add?: number;
  },
): Promise<GeneralResponse<null>> {
  const id = studentId.trim();
  if (!id || !UUID_RE.test(id)) {
    return { data: null, error: "Invalid student." };
  }

  const hasAdvisor = Object.prototype.hasOwnProperty.call(
    patch,
    "advisor_credits_to_add",
  );
  const hasAmbassador = Object.prototype.hasOwnProperty.call(
    patch,
    "ambassador_credits_to_add",
  );
  if (!hasAdvisor && !hasAmbassador) {
    return { data: null, error: "Nothing to assign." };
  }

  const validateAdd = (label: string, v: unknown): string | null => {
    if (v === undefined) return null;
    if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) {
      return `${label} must be a whole number greater than 0.`;
    }
    return null;
  };

  const advisorToAdd = hasAdvisor ? (patch.advisor_credits_to_add ?? 0) : 0;
  const ambassadorToAdd = hasAmbassador ? (patch.ambassador_credits_to_add ?? 0) : 0;

  if (hasAdvisor) {
    const msg = validateAdd("Advisor credits to add", patch.advisor_credits_to_add);
    if (msg) return { data: null, error: msg };
  }

  if (hasAmbassador) {
    const msg = validateAdd(
      "Ambassador credits to add",
      patch.ambassador_credits_to_add,
    );
    if (msg) return { data: null, error: msg };
  }

  const totalToAdd = advisorToAdd + ambassadorToAdd;
  if (totalToAdd <= 0) {
    return { data: null, error: "Enter at least one credit amount to assign." };
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

  const { data: studentProfile, error: studentError } = await supabase
    .from("student_profiles")
    .select("id, advisor_credit_limit, ambassador_credit_limit")
    .eq("id", id)
    .eq("school_id", sap.school_id)
    .maybeSingle();

  if (studentError) {
    console.error("[updateSchoolStudentCreditLimits] student profile", studentError);
    return { data: null, error: "Could not verify this student." };
  }

  if (!studentProfile) {
    return {
      data: null,
      error:
        "That student was not found or you do not have permission to edit their profile.",
    };
  }

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("credit_pool")
    .eq("id", sap.school_id)
    .maybeSingle();

  if (schoolError) {
    console.error("[updateSchoolStudentCreditLimits] school pool", schoolError);
    return { data: null, error: "Could not verify the school credit pool." };
  }

  const currentPool = school?.credit_pool ?? 0;
  if (currentPool < totalToAdd) {
    return {
      data: null,
      error: `Not enough credits in the school pool (${currentPool.toLocaleString()} available, ${totalToAdd.toLocaleString()} requested).`,
    };
  }

  const now = new Date().toISOString();
  const { data: updatedSchool, error: poolError } = await supabase
    .from("schools")
    .update({
      credit_pool: currentPool - totalToAdd,
      updated_at: now,
    })
    .eq("id", sap.school_id)
    .gte("credit_pool", totalToAdd)
    .select("id")
    .maybeSingle();

  if (poolError) {
    console.error("[updateSchoolStudentCreditLimits] deduct pool", poolError);
    return { data: null, error: "Could not deduct credits from the school pool." };
  }

  if (!updatedSchool) {
    return {
      data: null,
      error: "Not enough credits in the school pool. Refresh and try again.",
    };
  }

  type StudentProfileUpdate =
    Database["public"]["Tables"]["student_profiles"]["Update"];

  const updateRow: StudentProfileUpdate = { updated_at: now };

  if (advisorToAdd > 0) {
    updateRow.advisor_credit_limit =
      (studentProfile.advisor_credit_limit ?? 0) + advisorToAdd;
  }

  if (ambassadorToAdd > 0) {
    updateRow.ambassador_credit_limit =
      (studentProfile.ambassador_credit_limit ?? 0) + ambassadorToAdd;
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

  const secret = await createSupabaseSecretClient();
  const logResult = await recordStudentCreditAssignments(secret, {
    studentId: id,
    schoolId: sap.school_id,
    advisorToAdd,
    ambassadorToAdd,
    actor: { kind: "school_admin", id: user.id },
  });
  if (!logResult.ok) {
    return { data: null, error: logResult.error };
  }

  revalidatePath("/school", "layout");
  revalidatePath("/school/settings");
  revalidatePath("/school/students", "layout");
  revalidatePath(`/school/students/${id}`);
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

  const interactionRow = {
    student_id: studentId,
    interaction_kind: kind,
    occurred_on: occurredRaw,
    duration_minutes: durationMinutes,
    outcome,
    notes,
  };

  const { data: sap, error: sapError } = await supabase
    .from("school_admin_profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!sapError && sap?.school_id) {
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
        ...interactionRow,
        author_id: user.id,
      });

    if (insertError) {
      console.error("[addSchoolStudentInteraction] insert", insertError);
      return { data: null, error: insertError.message };
    }

    revalidatePath(`/school/students/${studentId}`);
    return { data: null, error: null };
  }

  const secret = await createSupabaseSecretClient();
  const { data: admin, error: adminError } = await secret
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[addSchoolStudentInteraction] admins", adminError);
    return { data: null, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      data: null,
      error:
        "Could not verify your school admin access. Ensure the latest database access rules are applied.",
    };
  }

  const { data: spRow, error: spErr } = await secret
    .from("student_profiles")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();

  if (spErr) {
    console.error("[addSchoolStudentInteraction] student_profiles", spErr);
    return { data: null, error: "Could not verify this student." };
  }
  if (!spRow) {
    return { data: null, error: "That student was not found." };
  }

  const { error: insertError } = await secret
    .from("student_counselor_interactions")
    .insert({
      ...interactionRow,
      platform_admin_id: user.id,
    });

  if (insertError) {
    console.error("[addSchoolStudentInteraction] admin insert", insertError);
    return { data: null, error: insertError.message };
  }

  revalidatePath(`/school/students/${studentId}`);
  revalidatePath("/admin/users/students");
  revalidatePath(`/admin/users/students/${studentId}`);
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

type AssignStudentTeacherResult = { ok: true } | { ok: false; error: string };

async function assertSchoolAdminSchoolId(): Promise<
  { ok: true; schoolId: string; userId: string } | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, error: "You must be signed in." };
  }

  const { data: sap, error: sapError } = await supabase
    .from("school_admin_profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (sapError || !sap?.school_id) {
    return { ok: false, error: "Your account is not linked to a school." };
  }

  return { ok: true, schoolId: sap.school_id, userId: user.id };
}

export async function assignStudentTeacher(
  studentIdRaw: string,
  teacherIdRaw: string,
): Promise<AssignStudentTeacherResult> {
  const access = await assertSchoolAdminSchoolId();
  if (!access.ok) return access;

  const studentId = studentIdRaw.trim();
  if (!studentId || !UUID_RE.test(studentId)) {
    return { ok: false, error: "Invalid student." };
  }

  const parsed = parseStudentTeacherAssignParam(teacherIdRaw);
  if (parsed === "invalid") {
    return { ok: false, error: "Select a valid teacher." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: student, error: studentErr } = await supabase
    .from("student_profiles")
    .select("id, school_id, teacher_id")
    .eq("id", studentId)
    .maybeSingle();

  if (studentErr || !student) {
    return { ok: false, error: "Student not found." };
  }

  if (student.school_id !== access.schoolId) {
    return { ok: false, error: "That student is not at your school." };
  }

  if (parsed === student.teacher_id) {
    return { ok: true };
  }

  if (parsed) {
    const { data: teacher, error: teacherErr } = await supabase
      .from("school_admin_profiles")
      .select("id, school_id, is_active")
      .eq("id", parsed)
      .maybeSingle();

    if (teacherErr || !teacher) {
      return { ok: false, error: "Teacher not found." };
    }

    if (teacher.school_id !== student.school_id) {
      return { ok: false, error: "Teacher must belong to the same school as the student." };
    }

    if (
      teacher.is_active === false &&
      teacher.id !== student.teacher_id
    ) {
      return { ok: false, error: "That teacher is inactive." };
    }
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("student_profiles")
    .update({ teacher_id: parsed, updated_at: now })
    .eq("id", studentId);

  if (updateErr) {
    console.error("[assignStudentTeacher]", updateErr);
    return { ok: false, error: updateErr.message || "Could not assign teacher." };
  }

  revalidatePath("/school/students");
  revalidatePath(`/school/students/${studentId}`);
  return { ok: true };
}

/** Full student list for CSV export (current search / grade / destination filters, no pagination). */
export async function getSchoolStudentsFullExportRows(
  q: string,
  grade: string,
  dest: string,
  teacher = "",
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
    teacher: typeof teacher === "string" ? teacher : "",
  });

  return { data: rows, error: null };
}
