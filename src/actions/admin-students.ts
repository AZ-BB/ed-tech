"use server";

import { importStudentsFromRecords } from "@/lib/admin-student-import";
import { isResendConfigured } from "@/lib/resend/config";
import { buildPasswordResetRedirectUrl } from "@/lib/resend/site-url";
import { sendStaffCredentialsEmailOrRollback } from "@/lib/staff-credentials-email";
import { fetchSchoolTeacherOptions } from "@/lib/fetch-school-teacher-options";
import { recordStudentCreditAssignments } from "@/lib/student-credit-assignment-log";
import { parseStudentTeacherAssignParam } from "@/lib/student-teacher-assignment";
import { STUDENT_SCHOOL_GRADE_OPTIONS } from "@/lib/school-portal-destination-options";
import { parseFeatureAccessFromFormData } from "@/lib/student-feature-access";
import { provisionIndependentStudent } from "@/lib/provision-independent-student";
import type { Database } from "@/database.types";
import type { GeneralResponse } from "@/utils/response";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type CreateAdminStudentResult = { ok: true } | { ok: false; error: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    console.error("[admin-students] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return { ok: false as const, error: "You do not have permission to manage students." };
  }

  return { ok: true as const, userId: user.id };
}

/**
 * Platform-provisioned student with no school. Creates auth user + profile
 * immediately and emails login credentials.
 */
export async function createAdminIndependentStudent(
  formData: FormData,
): Promise<CreateAdminStudentResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const grade = String(formData.get("grade") ?? "").trim();
  const nationalityCountryCode = String(
    formData.get("nationalityCountryCode") ?? "",
  ).trim();
  const password = String(formData.get("password") ?? "");
  const featureAccess = parseFeatureAccessFromFormData(formData);

  if (!isResendConfigured()) {
    return {
      ok: false,
      error:
        "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL before creating students.",
    };
  }

  const provisioned = await provisionIndependentStudent({
    firstName,
    lastName,
    email,
    grade,
    nationalityCountryCode,
    password,
    featureAccess,
  });

  if (!provisioned.ok) {
    return { ok: false, error: provisioned.error };
  }

  const service = await createSupabaseSecretClient();
  const emailResult = await sendStaffCredentialsEmailOrRollback({
    supabase: service,
    userId: provisioned.studentId,
    profileTable: "student_profiles",
    to: provisioned.email,
    firstName: provisioned.firstName,
    email: provisioned.email,
    password: provisioned.password,
  });

  if ("error" in emailResult) {
    return { ok: false, error: emailResult.error };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/students");
  return { ok: true };
}

export async function createAdminStudentInvite(
  formData: FormData,
): Promise<CreateAdminStudentResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const schoolId = String(formData.get("schoolId") ?? "").trim();

  // Empty school → provision an independent student account directly.
  if (!schoolId) {
    return createAdminIndependentStudent(formData);
  }

  const email = String(formData.get("email") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim();

  if (!email) {
    return { ok: false, error: "Enter a student email address." };
  }

  if (!grade) {
    return { ok: false, error: "Select a grade." };
  }

  const summary = await importStudentsFromRecords(
    schoolId,
    [{ email, grade }],
    { inviter: { kind: "platform" } },
  );

  if (summary.created === 1) {
    revalidatePath("/admin/users");
    revalidatePath("/admin/users/students");
    return { ok: true };
  }

  if (summary.skipped === 1) {
    return {
      ok: false,
      error: "This email is already enrolled or invited for the selected school.",
    };
  }

  if (summary.errors.length > 0) {
    return { ok: false, error: summary.errors[0] ?? "Could not add student." };
  }

  return { ok: false, error: "Could not add student." };
}

export async function updateAdminStudentCreditLimits(
  studentId: string,
  patch: {
    advisor_credits_to_add?: number;
    ambassador_credits_to_add?: number;
  },
): Promise<GeneralResponse<null>> {
  const access = await assertAdminAccess();
  if (!access.ok) {
    return { data: null, error: access.error };
  }

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

  const secret = await createSupabaseSecretClient();

  const { data: studentProfile, error: studentError } = await secret
    .from("student_profiles")
    .select("id, school_id, advisor_credit_limit, ambassador_credit_limit")
    .eq("id", id)
    .maybeSingle();

  if (studentError) {
    console.error("[updateAdminStudentCreditLimits] student profile", studentError);
    return { data: null, error: "Could not verify this student." };
  }

  if (!studentProfile) {
    return { data: null, error: "That student was not found." };
  }

  const schoolId = studentProfile.school_id;
  const now = new Date().toISOString();

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

  let updateQuery = secret
    .from("student_profiles")
    .update(updateRow)
    .eq("id", id);

  if (schoolId) {
    updateQuery = updateQuery.eq("school_id", schoolId);
  } else {
    updateQuery = updateQuery.is("school_id", null);
  }

  const { data: updated, error: updateError } = await updateQuery.select("id");

  if (updateError) {
    console.error("[updateAdminStudentCreditLimits]", updateError);
    return { data: null, error: updateError.message };
  }

  if (!updated?.length) {
    return { data: null, error: "Could not update this student's credits." };
  }

  const logResult = await recordStudentCreditAssignments(secret, {
    studentId: id,
    schoolId,
    advisorToAdd,
    ambassadorToAdd,
    actor: { kind: "platform_admin", id: access.userId },
  });
  if (!logResult.ok) {
    return { data: null, error: logResult.error };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/students");
  revalidatePath(`/admin/users/students/${id}`);
  revalidatePath("/school/settings");
  revalidatePath(`/school/students/${id}`);
  return { data: null, error: null };
}

export type AdminCountryOption = { id: string; name: string };

export async function fetchAdminStudentFormCountries(): Promise<
  { ok: true; countries: AdminCountryOption[] } | { ok: false; error: string }
> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const secret = await createSupabaseSecretClient();
  const { data, error } = await secret
    .from("countries")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("[fetchAdminStudentFormCountries]", error);
    return { ok: false, error: "Could not load countries." };
  }

  return {
    ok: true,
    countries: (data ?? []).map((c) => ({
      id: c.id.trim(),
      name: c.name.trim(),
    })),
  };
}

export async function fetchAdminStudentFormTeachers(
  schoolId: string,
  includeTeacherId?: string | null,
): Promise<
  | { ok: true; teachers: Awaited<ReturnType<typeof fetchSchoolTeacherOptions>> }
  | { ok: false; error: string }
> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const sid = schoolId.trim();
  if (!sid || !UUID_RE.test(sid)) {
    return { ok: false, error: "Invalid school." };
  }

  const teachers = await fetchSchoolTeacherOptions(sid, {
    includeTeacherId: includeTeacherId ?? null,
    useSecretClient: true,
  });

  return { ok: true, teachers };
}

type AdminStudentActionResult = { ok: true } | { ok: false; error: string };

type AdminStudentActionResultWithMessage =
  | { ok: true; message?: string }
  | { ok: false; error: string };

function displayNameFromParts(first: string, last: string): string {
  return [first.trim(), last.trim()].filter(Boolean).join(" ").trim() || "Student";
}

export async function updateAdminStudentProfile(
  studentId: string,
  formData: FormData,
): Promise<AdminStudentActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = studentId.trim();
  if (!id || !UUID_RE.test(id)) {
    return { ok: false, error: "Invalid student." };
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = phoneRaw.length > 0 ? phoneRaw.slice(0, 64) : null;
  const grade = String(formData.get("grade") ?? "").trim();
  const nationalityCountryCode = String(formData.get("nationalityCountryCode") ?? "").trim();

  if (!firstName) return { ok: false, error: "Enter a first name." };
  if (!lastName) return { ok: false, error: "Enter a last name." };

  if (
    !grade ||
    !STUDENT_SCHOOL_GRADE_OPTIONS.includes(
      grade as (typeof STUDENT_SCHOOL_GRADE_OPTIONS)[number],
    )
  ) {
    return { ok: false, error: "Select a valid grade." };
  }
  if (!nationalityCountryCode) {
    return { ok: false, error: "Select a nationality." };
  }

  const secret = await createSupabaseSecretClient();

  const { data: countryOk, error: countryErr } = await secret
    .from("countries")
    .select("id")
    .eq("id", nationalityCountryCode)
    .maybeSingle();

  if (countryErr || !countryOk) {
    return { ok: false, error: "Pick a valid country." };
  }

  const teacherParsed = parseStudentTeacherAssignParam(
    String(formData.get("teacherId") ?? ""),
  );
  if (teacherParsed === "invalid") {
    return { ok: false, error: "Select a valid teacher." };
  }

  const { data: existing, error: fetchErr } = await secret
    .from("student_profiles")
    .select("id, school_id, teacher_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !existing) {
    console.error("[updateAdminStudentProfile] fetch", fetchErr);
    return { ok: false, error: "Student not found." };
  }

  if (teacherParsed) {
    if (!existing.school_id) {
      return {
        ok: false,
        error: "Independent students cannot be assigned a teacher.",
      };
    }

    const { data: teacher, error: teacherErr } = await secret
      .from("school_admin_profiles")
      .select("id, school_id, is_active")
      .eq("id", teacherParsed)
      .maybeSingle();

    if (teacherErr || !teacher) {
      return { ok: false, error: "Teacher not found." };
    }

    if (teacher.school_id !== existing.school_id) {
      return {
        ok: false,
        error: "Teacher must belong to the same school as the student.",
      };
    }

    if (
      teacher.is_active === false &&
      teacher.id !== existing.teacher_id
    ) {
      return { ok: false, error: "That teacher is inactive." };
    }
  }

  const now = new Date().toISOString();
  const featureAccess = parseFeatureAccessFromFormData(formData);
  const { error: updateErr } = await secret
    .from("student_profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      phone,
      grade,
      nationality_country_code: nationalityCountryCode,
      teacher_id: teacherParsed,
      feature_access: featureAccess,
      updated_at: now,
    })
    .eq("id", id);

  if (updateErr) {
    console.error("[updateAdminStudentProfile]", updateErr);
    return { ok: false, error: updateErr.message || "Could not update student." };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/students");
  revalidatePath(`/admin/users/students/${id}`);
  revalidatePath(`/school/students/${id}`);
  return { ok: true };
}

export async function resetAdminStudentPassword(
  studentId: string,
): Promise<AdminStudentActionResultWithMessage> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = studentId.trim();
  if (!id || !UUID_RE.test(id)) {
    return { ok: false, error: "Invalid student." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: student, error: fetchErr } = await secret
    .from("student_profiles")
    .select("email, first_name, last_name")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !student?.email) {
    console.error("[resetAdminStudentPassword] fetch", fetchErr);
    return { ok: false, error: "Student not found." };
  }

  const email = student.email.trim().toLowerCase();
  const redirectTo = await buildPasswordResetRedirectUrl();

  const { data, error } = await secret.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (error) {
    console.error("[resetAdminStudentPassword] generateLink", error);
    return { ok: false, error: error.message || "Could not generate reset link." };
  }

  const link = data.properties?.action_link ?? data.properties?.hashed_token;
  const studentName = displayNameFromParts(student.first_name, student.last_name);
  console.log(
    `[resetAdminStudentPassword] recovery link for ${studentName} (${email}):`,
    link,
  );

  return {
    ok: true,
    message:
      "Password reset link generated and logged to the server console (email integration pending).",
  };
}

export async function deactivateAdminStudent(
  studentId: string,
): Promise<AdminStudentActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = studentId.trim();
  if (!id || !UUID_RE.test(id)) {
    return { ok: false, error: "Invalid student." };
  }

  const secret = await createSupabaseSecretClient();

  const [{ data: student, error: studentErr }, { data: admin }] = await Promise.all([
    secret
      .from("student_profiles")
      .select("id, first_name, last_name, is_active")
      .eq("id", id)
      .maybeSingle(),
    secret
      .from("admins")
      .select("first_name, last_name")
      .eq("id", access.userId)
      .maybeSingle(),
  ]);

  if (studentErr || !student) {
    console.error("[deactivateAdminStudent] fetch", studentErr);
    return { ok: false, error: "Student not found." };
  }

  if (!student.is_active) {
    return { ok: false, error: "Student is already inactive." };
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await secret
    .from("student_profiles")
    .update({ is_active: false, updated_at: now })
    .eq("id", id);

  if (updateErr) {
    console.error("[deactivateAdminStudent] update", updateErr);
    return { ok: false, error: "Could not deactivate student." };
  }

  const studentName = displayNameFromParts(student.first_name, student.last_name);
  const adminName = displayNameFromParts(
    admin?.first_name ?? "",
    admin?.last_name ?? "",
  );
  const logMessage = `Platform admin ${adminName} deactivated student ${studentName}.`;

  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: "student",
    entity_id: id,
    action: "student_deactivated",
    message: logMessage,
    created_by_type: "admin",
    admin_id: access.userId,
    school_admin_id: null,
    student_id: id,
  });

  if (logErr) {
    console.error("[deactivateAdminStudent] activity log", logErr);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/students");
  revalidatePath(`/admin/users/students/${id}`);
  return { ok: true };
}

export async function activateAdminStudent(
  studentId: string,
): Promise<AdminStudentActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = studentId.trim();
  if (!id || !UUID_RE.test(id)) {
    return { ok: false, error: "Invalid student." };
  }

  const secret = await createSupabaseSecretClient();

  const [{ data: student, error: studentErr }, { data: admin }] = await Promise.all([
    secret
      .from("student_profiles")
      .select("id, first_name, last_name, is_active")
      .eq("id", id)
      .maybeSingle(),
    secret
      .from("admins")
      .select("first_name, last_name")
      .eq("id", access.userId)
      .maybeSingle(),
  ]);

  if (studentErr || !student) {
    console.error("[activateAdminStudent] fetch", studentErr);
    return { ok: false, error: "Student not found." };
  }

  if (student.is_active) {
    return { ok: false, error: "Student is already active." };
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await secret
    .from("student_profiles")
    .update({ is_active: true, updated_at: now })
    .eq("id", id);

  if (updateErr) {
    console.error("[activateAdminStudent] update", updateErr);
    return { ok: false, error: "Could not activate student." };
  }

  const studentName = displayNameFromParts(student.first_name, student.last_name);
  const adminName = displayNameFromParts(
    admin?.first_name ?? "",
    admin?.last_name ?? "",
  );
  const logMessage = `Platform admin ${adminName} reactivated student ${studentName}.`;

  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: "student",
    entity_id: id,
    action: "student_activated",
    message: logMessage,
    created_by_type: "admin",
    admin_id: access.userId,
    school_admin_id: null,
    student_id: id,
  });

  if (logErr) {
    console.error("[activateAdminStudent] activity log", logErr);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/students");
  revalidatePath(`/admin/users/students/${id}`);
  return { ok: true };
}
