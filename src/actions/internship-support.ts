"use server";

import { requiresFunnelSubscription } from "@/lib/student-subscription";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

export type InternshipSupportSubmitResult =
  | { ok: true }
  | { ok: false; error: string };

export type InternshipSupportRequestFields = {
  fullName: string;
  email: string;
  schoolName: string;
  grade: string;
  preferredLocation: string;
  preferredFormat: string;
  interests: string[];
  payPreference: string;
  message?: string;
};

function trimRequired(value: string, label: string): string | null {
  const t = value.trim();
  return t.length ? t : null;
}

/** Inserts a row into `internship_support_requests` for the signed-in student. */
export async function submitInternshipSupportRequest(
  fields: InternshipSupportRequestFields,
): Promise<InternshipSupportSubmitResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { ok: false, error: "You must be signed in." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: studentRow, error: studentErr } = await secret
    .from("student_profiles")
    .select("student_type, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  if (studentErr) {
    console.error(
      "[submitInternshipSupportRequest] student profile:",
      studentErr,
    );
    return {
      ok: false,
      error: "Could not verify your account. Please try again.",
    };
  }

  if (
    requiresFunnelSubscription({
      studentType: studentRow?.student_type ?? "school",
      subscriptionStatus: studentRow?.subscription_status ?? "none",
    })
  ) {
    return {
      ok: false,
      error: "A subscription is required to request internship support.",
    };
  }

  const fullName = trimRequired(fields.fullName, "fullName");
  const email = trimRequired(fields.email, "email");
  const schoolName = trimRequired(fields.schoolName, "schoolName");
  const grade = trimRequired(fields.grade, "grade");
  const preferredLocation = trimRequired(
    fields.preferredLocation,
    "preferredLocation",
  );
  const preferredFormat = trimRequired(
    fields.preferredFormat,
    "preferredFormat",
  );
  const payPreference = trimRequired(fields.payPreference, "payPreference");

  if (
    !fullName ||
    !email ||
    !schoolName ||
    !grade ||
    !preferredLocation ||
    !preferredFormat ||
    !payPreference
  ) {
    return { ok: false, error: "Please fill in all required fields." };
  }

  const interests = Array.isArray(fields.interests)
    ? fields.interests.map((x) => x.trim()).filter(Boolean)
    : [];

  const { error } = await supabase.from("internship_support_requests").insert({
    student_id: user.id,
    full_name: fullName,
    email,
    school_name: schoolName,
    grade,
    preferred_location: preferredLocation,
    preferred_format: preferredFormat,
    interests,
    pay_preference: payPreference,
    message: fields.message?.trim() || null,
  });

  if (error) {
    console.error("[submitInternshipSupportRequest]", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
