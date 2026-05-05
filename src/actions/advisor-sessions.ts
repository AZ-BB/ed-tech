"use server";

import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { isValidAlpha2Code } from "@/lib/countries";

/** Used when `schools.default_advisor_credit_limit` is null. */
const FALLBACK_ADVISOR_BOOKINGS_PER_UTC_MONTH = 3;

function startOfUtcMonthIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString();
}

function uuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function advisorMonthlyCapFromSchool(
  schools: { default_advisor_credit_limit: number | null } | { default_advisor_credit_limit: number | null }[] | null,
): number {
  const row = Array.isArray(schools) ? schools[0] : schools;
  const raw = row?.default_advisor_credit_limit;
  return raw ?? FALLBACK_ADVISOR_BOOKINGS_PER_UTC_MONTH;
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
    "You viewed the 1:1 advisor sessions catalog.",
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
): Promise<{ ok: true } | { ok: false; error: string }> {
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
    .select("school_id, schools ( default_advisor_credit_limit )")
    .eq("id", actor.studentId)
    .maybeSingle();

  if (studentErr) {
    console.error("[advisor_sessions] student + school:", studentErr);
    return { ok: false, error: "Could not verify your booking limit. Please try again." };
  }

  const monthlyCap = advisorMonthlyCapFromSchool(studentRow?.schools ?? null);

  const monthStartIso = startOfUtcMonthIso();
  const { count: monthCount, error: countErr } = await secret
    .from("advisor_sessions")
    .select("id", { count: "exact", head: true })
    .eq("student_id", actor.studentId)
    .gte("created_at", monthStartIso);

  if (countErr) {
    console.error("[advisor_sessions] monthly count:", countErr);
    return { ok: false, error: "Could not verify your booking limit. Please try again." };
  }
  if ((monthCount ?? 0) >= monthlyCap) {
    return {
      ok: false,
      error: `You can request up to ${monthlyCap} advisor session${monthlyCap === 1 ? "" : "s"} per calendar month (your school’s limit). Try again next month.`,
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
    `You submitted a booking request for advisor ${advisor.first_name} ${advisor.last_name}.`,
  );

  return { ok: true };
}
