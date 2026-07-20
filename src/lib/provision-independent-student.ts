import "server-only";

import type { Json } from "@/database.types";
import {
  parseStudentFeatureAccess,
  type StudentFeatureAccess,
} from "@/lib/student-feature-access";
import { STUDENT_SCHOOL_GRADE_OPTIONS } from "@/lib/school-portal-destination-options";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { randomBytes } from "crypto";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export type ProvisionIndependentStudentInput = {
  firstName: string;
  lastName: string;
  email: string;
  grade: string;
  nationalityCountryCode: string;
  /** If omitted, a random password is generated. */
  password?: string;
  featureAccess?: StudentFeatureAccess | Json | null;
  metaData?: Json | null;
};

export type ProvisionIndependentStudentResult =
  | {
      ok: true;
      studentId: string;
      email: string;
      password: string;
      firstName: string;
    }
  | {
      ok: false;
      error: string;
      status: 400 | 409 | 500;
    };

function generatePassword(): string {
  // 24 URL-safe chars → comfortably above min length 8.
  return randomBytes(18).toString("base64url");
}

export async function provisionIndependentStudent(
  input: ProvisionIndependentStudentInput,
): Promise<ProvisionIndependentStudentResult> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim().toLowerCase();
  const grade = input.grade.trim();
  const nationalityCountryCode = input.nationalityCountryCode.trim();
  const password =
    input.password != null && input.password.length > 0
      ? input.password
      : generatePassword();
  const featureAccess = parseStudentFeatureAccess(input.featureAccess ?? null);
  const metaData =
    input.metaData === undefined ? null : (input.metaData as Json | null);

  if (!firstName || !lastName) {
    return {
      ok: false,
      status: 400,
      error: "First name and last name are required.",
    };
  }

  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, status: 400, error: "Enter a valid email address." };
  }

  if (
    !grade ||
    !STUDENT_SCHOOL_GRADE_OPTIONS.includes(
      grade as (typeof STUDENT_SCHOOL_GRADE_OPTIONS)[number],
    )
  ) {
    return { ok: false, status: 400, error: "Select a valid grade." };
  }

  if (!nationalityCountryCode) {
    return { ok: false, status: 400, error: "Select a nationality." };
  }

  if (password.length < 8) {
    return {
      ok: false,
      status: 400,
      error: "Password must be at least 8 characters.",
    };
  }

  if (
    metaData !== null &&
    (typeof metaData !== "object" || Array.isArray(metaData))
  ) {
    return {
      ok: false,
      status: 400,
      error: "metaData must be a JSON object or null.",
    };
  }

  const service = await createSupabaseSecretClient();

  const { data: countryOk, error: countryErr } = await service
    .from("countries")
    .select("id")
    .eq("id", nationalityCountryCode)
    .maybeSingle();

  if (countryErr || !countryOk) {
    return { ok: false, status: 400, error: "Pick a valid nationality." };
  }

  const { data: existingProfile } = await service
    .from("student_profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    return {
      ok: false,
      status: 409,
      error: "A student with this email already exists.",
    };
  }

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      firstName,
      lastName,
      type: "student",
    },
  });

  if (authError || !authData.user) {
    console.error("[provisionIndependentStudent] createUser", authError);
    const message = authError?.message ?? "Could not create student account.";
    const status =
      /already|exists|registered/i.test(message) ? (409 as const) : (500 as const);
    return { ok: false, status, error: message };
  }

  const { error: profileError } = await service.from("student_profiles").insert({
    id: authData.user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    school_id: null,
    nationality_country_code: nationalityCountryCode,
    grade,
    teacher_id: null,
    advisor_credit_limit: 1,
    ambassador_credit_limit: 1,
    signup_advisor_credit_limit: 1,
    signup_ambassador_credit_limit: 1,
    feature_access: featureAccess,
    meta_data: metaData,
  });

  if (profileError) {
    console.error("[provisionIndependentStudent] profile insert", profileError);
    await service.auth.admin.deleteUser(authData.user.id);
    return {
      ok: false,
      status: 500,
      error: profileError.message || "Could not save student profile.",
    };
  }

  return {
    ok: true,
    studentId: authData.user.id,
    email,
    password,
    firstName,
  };
}
