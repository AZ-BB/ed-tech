"use server";

import { assertAdvisorAccess } from "@/lib/advisor-access";
import type { Database } from "@/database.types";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { isValidAlpha2Code } from "@/lib/countries";
import {
  recordStudentPlatformCompletionOnce,
  STUDENT_PLATFORM_COMPLETION_FLAGS,
} from "@/lib/student-platform-completion";
import {
  isPlatformFeatureEnabledByKey,
  PLATFORM_FEATURE_UNAVAILABLE_MESSAGE,
} from "@/lib/platform-settings";
import { revalidatePath } from "next/cache";

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

async function appendAdvisorActivityLog(
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
    console.error("[acitivity_logs] advisor sessions:", error);
  }
}

/** Records that the student opened the 1:1 advisor sessions catalog. */
export async function logAdvisorSessionsCatalogView(): Promise<{ ok: true } | { ok: false; error: string }> {
  const actor = await requireStudentActor();
  if ("error" in actor) {
    return { ok: false, error: actor.error };
  }
  const secret = await createSupabaseSecretClient();
  await appendAdvisorActivityLog(
    secret,
    actor.studentId,
    "advisor_sessions",
    actor.studentId,
    "advisor_sessions_catalog_view",
    "Student viewed the 1:1 advisor sessions catalog.",
  );
  return { ok: true };
}

export type CreateAdvisorSessionInput = {
  advisorId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  destinationCountryCode: string;
  currentStage: string;
  specificUniversities: string;
  helpWith: string;
};

export async function createAdvisorSessionBooking(
  input: CreateAdvisorSessionInput,
): Promise<{ ok: true; sessionId: number } | { ok: false; error: string }> {
  const featureEnabled = await isPlatformFeatureEnabledByKey("advisor_sessions");
  if (!featureEnabled) {
    return { ok: false, error: PLATFORM_FEATURE_UNAVAILABLE_MESSAGE };
  }

  const advisorId = typeof input.advisorId === "string" ? input.advisorId.trim() : "";
  if (!uuidLike(advisorId)) {
    return { ok: false, error: "Invalid advisor." };
  }

  const studentName = input.studentName?.trim() ?? "";
  const studentEmail = input.studentEmail?.trim() ?? "";
  const studentPhone = input.studentPhone?.trim() ?? "";
  const destinationCountryCode = input.destinationCountryCode?.trim().toUpperCase() ?? "";
  const currentStage = input.currentStage?.trim() ?? "";
  const specificUni = input.specificUniversities?.trim() ?? "";
  const helpWith = input.helpWith?.trim() ?? "";

  if (!studentName || !studentEmail) {
    return { ok: false, error: "Name and email are required." };
  }
  if (!studentPhone) {
    return { ok: false, error: "Phone number is required." };
  }
  if (!isValidAlpha2Code(destinationCountryCode)) {
    return { ok: false, error: "Please choose a valid destination country." };
  }
  if (!currentStage) {
    return { ok: false, error: "Please select your current stage." };
  }
  if (!helpWith) {
    return { ok: false, error: "Please describe what you would like help with." };
  }

  const actor = await requireStudentActor();
  if ("error" in actor) {
    return { ok: false, error: actor.error };
  }

  const secret = await createSupabaseSecretClient();
  const { data: advisor, error: advErr } = await secret
    .from("advisors")
    .select("id, first_name, last_name")
    .eq("id", advisorId)
    .eq("is_active", true)
    .maybeSingle();

  if (advErr || !advisor) {
    return { ok: false, error: "Advisor not found or unavailable." };
  }

  const { data: studentRow, error: studentErr } = await secret
    .from("student_profiles")
    .select("school_id, advisor_credit_limit")
    .eq("id", actor.studentId)
    .maybeSingle();

  if (studentErr) {
    console.error("[advisor_sessions] student profile:", studentErr);
    return { ok: false, error: "Could not verify your booking limit. Please try again." };
  }

  const advisorCreditsRemaining = studentRow?.advisor_credit_limit;
  if (advisorCreditsRemaining == null || advisorCreditsRemaining <= 0) {
    return {
      ok: false,
      error: "You have no advisor session credits remaining. Ask your school counselor to assign more.",
    };
  }

  const server = await createSupabaseServerClient();
  const payload = {
    advisor_id: advisorId,
    student_id: actor.studentId,
    destination_country_code: destinationCountryCode,
    current_stage: currentStage,
    specific_uni: specificUni || null,
    help_with: helpWith,
    student_name: studentName,
    student_email: studentEmail,
    student_phone: studentPhone,
    status: "pending" as const,
  };

  let sessionId: number | null = null;
  const { data: serverRow, error: serverInsertErr } = await server
    .from("advisor_sessions")
    .insert(payload)
    .select("id")
    .single();

  if (!serverInsertErr && serverRow?.id != null) {
    sessionId = serverRow.id;
  } else {
    const { data: secretRow, error: secretInsertErr } = await secret
      .from("advisor_sessions")
      .insert(payload)
      .select("id")
      .single();
    if (secretInsertErr) {
      console.error("[advisor_sessions] insert:", serverInsertErr ?? secretInsertErr);
      return { ok: false, error: (secretInsertErr.message || serverInsertErr?.message) ?? "Could not create booking." };
    }
    sessionId = secretRow?.id ?? null;
  }

  if (sessionId == null) {
    return { ok: false, error: "Could not create booking." };
  }

  if (!studentRow?.school_id) {
    console.error("[student_credits_history] missing school_id on student_profiles:", studentErr);
  } else {
    const { error: creditDecErr } = await secret
      .from("student_profiles")
      .update({ advisor_credit_limit: advisorCreditsRemaining - 1 })
      .eq("id", actor.studentId)
      .gt("advisor_credit_limit", 0);

    if (creditDecErr) {
      console.error("[student_profiles] advisor credit decrement:", creditDecErr);
      return { ok: false, error: "Could not deduct advisor session credit. Please try again." };
    }

    const { error: creditHistErr } = await secret.from("student_credits_history").insert({
      student_id: actor.studentId,
      school_id: studentRow.school_id,
      amount: 1,
      type: "advisor",
      advisor_session_id: sessionId,
      ambassador_session_request_id: null,
      status: "used",
    });
    if (creditHistErr) {
      console.error("[student_credits_history] insert:", creditHistErr);
    }
  }

  await appendAdvisorActivityLog(
    secret,
    actor.studentId,
    "advisor",
    advisorId,
    "advisor_session_booking_requested",
    `Student submitted a booking request for advisor ${advisor.first_name} ${advisor.last_name}.`,
  );

  recordStudentPlatformCompletionOnce(
    server,
    actor.studentId,
    STUDENT_PLATFORM_COMPLETION_FLAGS.viewed_advisor_sessions,
  ).catch(() => {});

  return { ok: true, sessionId };
}

type AdvisorSessionActionResult = { ok: true } | { ok: false; error: string };

const ADVISOR_PORTAL_SESSION_STATUSES = new Set<string>([
  "pending",
  "confirmed",
  "completed",
]);

function parseAdvisorSessionId(raw: string): number | null {
  const id = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(id) || id < 1) return null;
  return id;
}

export async function updateAdvisorSessionStatus(
  sessionIdRaw: string,
  statusRaw: string,
): Promise<AdvisorSessionActionResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const sessionId = parseAdvisorSessionId(sessionIdRaw);
  if (sessionId == null) {
    return { ok: false, error: "Invalid session." };
  }

  const status = statusRaw.trim() as Database["public"]["Enums"]["advisor_session_status"];
  if (!ADVISOR_PORTAL_SESSION_STATUSES.has(status)) {
    return { ok: false, error: "Select a valid status." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: existing, error: fetchErr } = await secret
    .from("advisor_sessions")
    .select("id, status, advisor_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { ok: false, error: "Session not found." };
  }

  if (existing.advisor_id !== access.advisorId) {
    return { ok: false, error: "You do not have access to this session." };
  }

  if (existing.status === "cancelled") {
    return { ok: false, error: "Cancelled sessions cannot be updated." };
  }

  if (existing.status === status) {
    return { ok: true };
  }

  const { error: updateErr } = await secret
    .from("advisor_sessions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("advisor_id", access.advisorId);

  if (updateErr) {
    console.error("[updateAdvisorSessionStatus]", updateErr);
    return { ok: false, error: "Could not update session status." };
  }

  revalidatePath("/advisor/sessions-and-calls");
  revalidatePath(`/advisor/sessions-and-calls/session/${sessionId}`);

  return { ok: true };
}
