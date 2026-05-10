"use server";

import { fetchPendingInvitesPage } from "@/app/(protected)/school/students/_lib/fetch-pending-invites-page";
import { GRADE_FILTER_OPTIONS } from "@/lib/school-portal-destination-options";
import {
  isSchoolStudentNoteTag,
  SCHOOL_STUDENT_NOTE_TAGS,
} from "@/lib/school-student-note-tags";
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
    gradeRaw === ""
      ? null
      : GRADE_ALLOWED.has(gradeRaw)
        ? gradeRaw
        : null;
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
      error:
        "That student was not found or is not enrolled at your school.",
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
