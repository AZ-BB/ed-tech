"use server";

import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import {
  recordStudentPlatformCompletionOnce,
  STUDENT_PLATFORM_COMPLETION_FLAGS,
} from "@/lib/student-platform-completion";
import {
  isPlatformFeatureEnabledByKey,
  PLATFORM_FEATURE_UNAVAILABLE_MESSAGE,
} from "@/lib/platform-settings";

function uuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

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

async function appendAmbassadorActivityLog(
  secret: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  studentId: string,
  entitiy_type: string,
  entity_id: string,
  action: string,
  message: string,
): Promise<void> {
  const { error } = await secret.from("acitivity_logs").insert({
    entitiy_type,
    entity_id,
    action,
    message,
    created_by_type: "student",
    student_id: studentId,
    admin_id: null,
    school_admin_id: null,
  });
  if (error) {
    console.error("[acitivity_logs] ambassador sessions:", error);
  }
}

export async function logAmbassadorsCatalogView(): Promise<{ ok: true } | { ok: false; error: string }> {
  const actor = await requireStudentActor();
  if ("error" in actor) {
    return { ok: false, error: actor.error };
  }
  const secret = await createSupabaseSecretClient();
  await appendAmbassadorActivityLog(
    secret,
    actor.studentId,
    "ambassador_sessions",
    actor.studentId,
    "ambassador_sessions_catalog_view",
    "Student viewed the University Ambassadors catalog.",
  );
  return { ok: true };
}

export type CreateAmbassadorSessionInput = {
  ambassadorId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  prefTime1Iso: string;
  prefTime2Iso: string | null;
  prefTime3Iso: string | null;
  discussionTopics: string;
};

function parseRequiredIso(label: string, value: string): { ok: true; iso: string } | { ok: false; error: string } {
  const t = value?.trim() ?? "";
  if (!t) {
    return { ok: false, error: `${label} is required.` };
  }
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: `${label} is not a valid date and time.` };
  }
  return { ok: true, iso: d.toISOString() };
}

function parseOptionalIso(value: string | null | undefined): string | null {
  const t = value?.trim() ?? "";
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function createAmbassadorSessionRequest(
  input: CreateAmbassadorSessionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const featureEnabled = await isPlatformFeatureEnabledByKey("ambassador_booking");
  if (!featureEnabled) {
    return { ok: false, error: PLATFORM_FEATURE_UNAVAILABLE_MESSAGE };
  }

  const ambassadorId = typeof input.ambassadorId === "string" ? input.ambassadorId.trim() : "";
  if (!uuidLike(ambassadorId)) {
    return { ok: false, error: "Invalid ambassador." };
  }

  const p1 = parseRequiredIso("Preferred time 1", input.prefTime1Iso);
  if (!p1.ok) return p1;
  const p2 = parseOptionalIso(input.prefTime2Iso);
  const p3 = parseOptionalIso(input.prefTime3Iso);
  const discussionTopics = input.discussionTopics?.trim() ?? "";
  if (!discussionTopics) {
    return { ok: false, error: "Please describe what you would like to discuss." };
  }

  const studentName = input.studentName?.trim() ?? "";
  const studentEmail = input.studentEmail?.trim() ?? "";
  const studentPhone = input.studentPhone?.trim() ?? "";
  if (!studentName) {
    return { ok: false, error: "Please enter your full name." };
  }
  if (!studentEmail) {
    return { ok: false, error: "Please enter your email address." };
  }
  if (!studentPhone) {
    return { ok: false, error: "Please enter your phone number." };
  }

  const actor = await requireStudentActor();
  if ("error" in actor) {
    return { ok: false, error: actor.error };
  }

  const secret = await createSupabaseSecretClient();
  const { data: amb, error: ambErr } = await secret
    .from("ambassadors")
    .select("id, first_name, last_name")
    .eq("id", ambassadorId)
    .eq("is_active", true)
    .maybeSingle();

  if (ambErr || !amb) {
    return { ok: false, error: "Ambassador not found or unavailable." };
  }

  const { data: studentRow, error: studentErr } = await secret
    .from("student_profiles")
    .select("school_id, ambassador_credit_limit")
    .eq("id", actor.studentId)
    .maybeSingle();

  if (studentErr) {
    console.error("[ambassador_session_requests] student profile:", studentErr);
    return { ok: false, error: "Could not verify your booking limit. Please try again." };
  }

  const ambassadorCreditsRemaining = studentRow?.ambassador_credit_limit;
  if (ambassadorCreditsRemaining == null || ambassadorCreditsRemaining <= 0) {
    return {
      ok: false,
      error: "You have no ambassador session credits remaining. Ask your school counselor to assign more.",
    };
  }

  const payload = {
    ambassador_id: ambassadorId,
    student_id: actor.studentId,
    student_name: studentName,
    student_email: studentEmail,
    student_phone: studentPhone,
    pref_time_1: p1.iso,
    pref_time_2: p2,
    pref_time_3: p3,
    discussion_topics: discussionTopics,
    status: "pending" as const,
  };

  /** Service role only: avoids RLS/RETURNING issues when JWT insert succeeds but `.select()` is blocked. */
  const { data: inserted, error: insertErr } = await secret
    .from("ambassador_session_requests")
    .insert(payload)
    .select("id")
    .single();

  if (insertErr || inserted?.id == null) {
    console.error("[ambassador_session_requests] insert:", insertErr);
    return {
      ok: false,
      error: insertErr?.message ?? "Could not create session request.",
    };
  }

  const requestId = inserted.id;

  const { error: creditDecErr } = await secret
    .from("student_profiles")
    .update({ ambassador_credit_limit: ambassadorCreditsRemaining - 1 })
    .eq("id", actor.studentId)
    .gt("ambassador_credit_limit", 0);

  if (creditDecErr) {
    console.error("[student_profiles] ambassador credit decrement:", creditDecErr);
    return { ok: false, error: "Could not deduct ambassador session credit. Please try again." };
  }

  const { error: creditHistErr } = await secret.from("student_credits_history").insert({
    student_id: actor.studentId,
    school_id: studentRow?.school_id ?? null,
    amount: 1,
    type: "ambassador",
    advisor_session_id: null,
    ambassador_session_request_id: requestId,
    status: "used",
  });
  if (creditHistErr) {
    console.error("[student_credits_history] ambassador insert:", creditHistErr);
  }

  await appendAmbassadorActivityLog(
    secret,
    actor.studentId,
    "ambassador",
    ambassadorId,
    "ambassador_session_requested",
    `Student submitted an ambassador session request for ${amb.first_name} ${amb.last_name}.`,
  );

  const server = await createSupabaseServerClient();
  recordStudentPlatformCompletionOnce(
    server,
    actor.studentId,
    STUDENT_PLATFORM_COMPLETION_FLAGS.viewed_ambassadors,
  ).catch(() => {});

  return { ok: true };
}
