"use server";

import {
  notifySuperAdminsOfAmbassadorSpecificRequest,
  rollbackAmbassadorSpecificRequest,
} from "@/lib/ambassador-specific-request-notify";
import { isResendConfigured } from "@/lib/resend/config";
import {
  isPlatformFeatureEnabledByKey,
  PLATFORM_FEATURE_UNAVAILABLE_MESSAGE,
} from "@/lib/platform-settings";
import { requiresFunnelSubscription } from "@/lib/student-subscription";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

async function requireStudentActor(): Promise<{ studentId: string } | { error: string }> {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await authClient.auth.getUser();
  if (authErr || !user) {
    return { error: "You must be signed in." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: profile, error } = await secret
    .from("student_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.error(error);
    return { error: "Could not verify your student profile." };
  }
  if (!profile) {
    return { error: "Student profile not found." };
  }
  return { studentId: user.id };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export type CreateAmbassadorSpecificRequestInput = {
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  targetUniversity: string;
  preferredMajor?: string | null;
  additionalNotes?: string | null;
};

export async function createAmbassadorSpecificRequest(
  input: CreateAmbassadorSpecificRequestInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const featureEnabled = await isPlatformFeatureEnabledByKey("ambassador_booking");
  if (!featureEnabled) {
    return { ok: false, error: PLATFORM_FEATURE_UNAVAILABLE_MESSAGE };
  }

  const studentName = input.studentName?.trim() ?? "";
  const studentEmail = input.studentEmail?.trim() ?? "";
  const studentPhone = input.studentPhone?.trim() ?? "";
  const targetUniversity = input.targetUniversity?.trim() ?? "";
  const preferredMajor = input.preferredMajor?.trim() || null;
  const additionalNotes = input.additionalNotes?.trim() || null;

  if (!studentName) {
    return { ok: false, error: "Please enter your full name." };
  }
  if (!studentEmail) {
    return { ok: false, error: "Please enter your email address." };
  }
  if (!isValidEmail(studentEmail)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (!studentPhone) {
    return { ok: false, error: "Please enter your phone number." };
  }
  if (!targetUniversity) {
    return { ok: false, error: "Please tell us which university or ambassador you're looking for." };
  }

  const actor = await requireStudentActor();
  if ("error" in actor) {
    return { ok: false, error: actor.error };
  }

  const secret = await createSupabaseSecretClient();
  const { data: studentRow, error: studentErr } = await secret
    .from("student_profiles")
    .select("student_type, subscription_status")
    .eq("id", actor.studentId)
    .maybeSingle();

  if (studentErr) {
    console.error("[ambassador_specific_requests] student profile:", studentErr);
    return { ok: false, error: "Could not verify your account. Please try again." };
  }

  if (
    requiresFunnelSubscription({
      studentType: studentRow?.student_type ?? "school",
      subscriptionStatus: studentRow?.subscription_status ?? "none",
    })
  ) {
    return {
      ok: false,
      error: "A subscription is required to request a specific ambassador.",
    };
  }

  if (!isResendConfigured()) {
    return {
      ok: false,
      error:
        "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    };
  }

  const { data: inserted, error: insertErr } = await secret
    .from("ambassador_specific_requests")
    .insert({
      student_id: actor.studentId,
      student_name: studentName,
      student_email: studentEmail,
      student_phone: studentPhone,
      target_university: targetUniversity,
      preferred_major: preferredMajor,
      additional_notes: additionalNotes,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertErr || inserted?.id == null) {
    console.error("[ambassador_specific_requests] insert:", insertErr);
    return {
      ok: false,
      error: insertErr?.message ?? "Could not submit your request. Please try again.",
    };
  }

  const notifyResult = await notifySuperAdminsOfAmbassadorSpecificRequest({
    supabase: secret,
    requestId: inserted.id,
    studentId: actor.studentId,
    form: {
      studentName,
      studentEmail,
      studentPhone,
      targetUniversity,
      preferredMajor,
      additionalNotes,
    },
  });

  if ("error" in notifyResult) {
    await rollbackAmbassadorSpecificRequest(secret, inserted.id);
    return { ok: false, error: notifyResult.error };
  }

  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: "ambassador_specific_requests",
    entity_id: String(inserted.id),
    action: "ambassador_specific_request_submitted",
    message: `Student submitted a specific ambassador request for ${targetUniversity}.`,
    created_by_type: "student",
    student_id: actor.studentId,
    admin_id: null,
    school_admin_id: null,
  });
  if (logErr) {
    console.error("[acitivity_logs] ambassador_specific_requests:", logErr);
  }

  return { ok: true };
}
