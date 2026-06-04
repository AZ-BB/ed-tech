"use server";

import {
  getAdminSessionDetailHref,
  type AdminSessionKind,
} from "@/app/(protected)/admin/sessions/_data/sessions-tabs-data";
import { isValidAlpha2Code } from "@/lib/countries";
import type { Database } from "@/database.types";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type AdvisorSessionStatus = Database["public"]["Enums"]["advisor_session_status"];
type AmbassadorSessionStatus =
  Database["public"]["Enums"]["ambassador_session_request_status"];

type AdminSessionActionResult = { ok: true } | { ok: false; error: string };

const ADVISOR_STATUSES = new Set<string>([
  "pending",
  "confirmed",
  "completed",
]);

const AMBASSADOR_STATUSES = new Set<string>([
  "pending",
  "confirmed",
  "completed",
  "rescheduled",
]);

type SessionCreditType = "advisor" | "ambassador";

type StudentCreditsHistoryInsert =
  Database["public"]["Tables"]["student_credits_history"]["Insert"];

async function refundSessionCredit(
  secret: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  input: {
    studentId: string;
    schoolId: string;
    creditType: SessionCreditType;
    sessionId: number;
  },
): Promise<AdminSessionActionResult> {
  const sessionIdColumn =
    input.creditType === "advisor" ? "advisor_session_id" : "ambassador_session_request_id";

  const { data: existingRefund, error: refundLookupErr } = await secret
    .from("student_credits_history")
    .select("id")
    .eq("student_id", input.studentId)
    .eq(sessionIdColumn, input.sessionId)
    .eq("status", "refunded")
    .maybeSingle();

  if (refundLookupErr) {
    console.error("[refundSessionCredit] refund lookup", refundLookupErr);
    return { ok: false, error: "Could not verify credit refund status." };
  }

  if (existingRefund) {
    return { ok: true };
  }

  const { data: usedRow, error: usedLookupErr } = await secret
    .from("student_credits_history")
    .select("id, amount")
    .eq("student_id", input.studentId)
    .eq(sessionIdColumn, input.sessionId)
    .eq("status", "used")
    .maybeSingle();

  if (usedLookupErr) {
    console.error("[refundSessionCredit] used lookup", usedLookupErr);
    return { ok: false, error: "Could not verify session credit usage." };
  }

  if (!usedRow) {
    return { ok: true };
  }

  const amount = usedRow.amount > 0 ? usedRow.amount : 1;

  const { data: studentRow, error: studentErr } = await secret
    .from("student_profiles")
    .select("advisor_credit_limit, ambassador_credit_limit")
    .eq("id", input.studentId)
    .maybeSingle();

  if (studentErr || !studentRow) {
    console.error("[refundSessionCredit] student profile", studentErr);
    return { ok: false, error: "Could not refund session credit." };
  }

  const currentLimit =
    input.creditType === "advisor"
      ? (studentRow.advisor_credit_limit ?? 0)
      : (studentRow.ambassador_credit_limit ?? 0);

  const profileUpdate =
    input.creditType === "advisor"
      ? {
          advisor_credit_limit: currentLimit + amount,
          updated_at: new Date().toISOString(),
        }
      : {
          ambassador_credit_limit: currentLimit + amount,
          updated_at: new Date().toISOString(),
        };

  const { error: incrementErr } = await secret
    .from("student_profiles")
    .update(profileUpdate)
    .eq("id", input.studentId);

  if (incrementErr) {
    console.error("[refundSessionCredit] increment", incrementErr);
    return { ok: false, error: "Could not refund session credit." };
  }

  const historyInsert: StudentCreditsHistoryInsert =
    input.creditType === "advisor"
      ? {
          student_id: input.studentId,
          school_id: input.schoolId,
          amount,
          type: "advisor",
          advisor_session_id: input.sessionId,
          ambassador_session_request_id: null,
          status: "refunded",
        }
      : {
          student_id: input.studentId,
          school_id: input.schoolId,
          amount,
          type: "ambassador",
          advisor_session_id: null,
          ambassador_session_request_id: input.sessionId,
          status: "refunded",
        };

  const { error: historyErr } = await secret.from("student_credits_history").insert(historyInsert);

  if (historyErr) {
    console.error("[refundSessionCredit] history insert", historyErr);
    return { ok: false, error: "Could not record credit refund." };
  }

  return { ok: true };
}

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
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[admin-sessions] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return { ok: false as const, error: "You do not have permission to manage sessions." };
  }

  if (admin.is_active === false) {
    return { ok: false as const, error: "Your admin account is inactive." };
  }

  return { ok: true as const };
}

function parseSessionId(raw: string): number | null {
  const id = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(id) || id < 1) return null;
  return id;
}

function parseKind(raw: string): AdminSessionKind | null {
  if (raw === "advisor" || raw === "ambassador") return raw;
  return null;
}

function revalidateSessionPaths(kind: AdminSessionKind, id: number) {
  revalidatePath("/admin/sessions");
  revalidatePath("/admin/sessions/ambassador");
  revalidatePath("/admin/sessions/pending");
  revalidatePath("/admin/sessions/completed");
  revalidatePath(getAdminSessionDetailHref(kind, id));
}

function readTrimmed(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseOptionalIsoDateTime(raw: string): string | null {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function updateAdminAdvisorSessionStatus(
  sessionIdRaw: string,
  statusRaw: string,
): Promise<AdminSessionActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const sessionId = parseSessionId(sessionIdRaw);
  if (sessionId == null) {
    return { ok: false, error: "Invalid session." };
  }

  const status = statusRaw.trim() as AdvisorSessionStatus;
  if (!ADVISOR_STATUSES.has(status)) {
    return { ok: false, error: "Select a valid status." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: existing, error: fetchErr } = await secret
    .from("advisor_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { ok: false, error: "Session not found." };
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
    .eq("id", sessionId);

  if (updateErr) {
    console.error("[updateAdminAdvisorSessionStatus]", updateErr);
    return { ok: false, error: "Could not update session status." };
  }

  revalidateSessionPaths("advisor", sessionId);
  return { ok: true };
}

export async function updateAdminAmbassadorSessionStatus(
  sessionIdRaw: string,
  statusRaw: string,
): Promise<AdminSessionActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const sessionId = parseSessionId(sessionIdRaw);
  if (sessionId == null) {
    return { ok: false, error: "Invalid session." };
  }

  const status = statusRaw.trim() as AmbassadorSessionStatus;
  if (!AMBASSADOR_STATUSES.has(status)) {
    return { ok: false, error: "Select a valid status." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: existing, error: fetchErr } = await secret
    .from("ambassador_session_requests")
    .select("id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { ok: false, error: "Session not found." };
  }

  if (existing.status === "cancelled") {
    return { ok: false, error: "Cancelled sessions cannot be updated." };
  }

  if (existing.status === status) {
    return { ok: true };
  }

  const { error: updateErr } = await secret
    .from("ambassador_session_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (updateErr) {
    console.error("[updateAdminAmbassadorSessionStatus]", updateErr);
    return { ok: false, error: "Could not update session status." };
  }

  revalidateSessionPaths("ambassador", sessionId);
  return { ok: true };
}

export async function updateAdminAdvisorSessionDetails(
  formData: FormData,
): Promise<AdminSessionActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const sessionId = parseSessionId(readTrimmed(formData, "sessionId"));
  if (sessionId == null) {
    return { ok: false, error: "Invalid session." };
  }

  const studentName = readTrimmed(formData, "studentName");
  const studentEmail = readTrimmed(formData, "studentEmail");
  const studentPhone = readTrimmed(formData, "studentPhone");
  const destinationCountryCode = readTrimmed(formData, "destinationCountryCode").toUpperCase();
  const currentStage = readTrimmed(formData, "currentStage");
  const specificUni = readTrimmed(formData, "specificUni") || null;
  const helpWith = readTrimmed(formData, "helpWith") || null;
  const bookedAtRaw = readTrimmed(formData, "bookedAt");
  const bookedAt = bookedAtRaw ? parseOptionalIsoDateTime(bookedAtRaw) : null;

  if (!studentName || !studentEmail) {
    return { ok: false, error: "Student name and email are required." };
  }
  if (!studentPhone) {
    return { ok: false, error: "Student phone is required." };
  }
  if (!isValidAlpha2Code(destinationCountryCode)) {
    return { ok: false, error: "Select a valid destination country." };
  }
  if (!currentStage) {
    return { ok: false, error: "Current stage is required." };
  }
  if (bookedAtRaw && !bookedAt) {
    return { ok: false, error: "Booked date/time is invalid." };
  }

  const secret = await createSupabaseSecretClient();
  const { error } = await secret
    .from("advisor_sessions")
    .update({
      student_name: studentName,
      student_email: studentEmail,
      student_phone: studentPhone,
      destination_country_code: destinationCountryCode,
      current_stage: currentStage,
      specific_uni: specificUni,
      help_with: helpWith,
      booked_at: bookedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    console.error("[updateAdminAdvisorSessionDetails]", error);
    return { ok: false, error: "Could not save session details." };
  }

  revalidateSessionPaths("advisor", sessionId);
  return { ok: true };
}

export async function updateAdminAmbassadorSessionDetails(
  formData: FormData,
): Promise<AdminSessionActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const sessionId = parseSessionId(readTrimmed(formData, "sessionId"));
  if (sessionId == null) {
    return { ok: false, error: "Invalid session." };
  }

  const studentName = readTrimmed(formData, "studentName");
  const studentEmail = readTrimmed(formData, "studentEmail");
  const studentPhone = readTrimmed(formData, "studentPhone");
  const discussionTopics = readTrimmed(formData, "discussionTopics") || null;

  const prefTime1 = parseOptionalIsoDateTime(readTrimmed(formData, "prefTime1"));
  const prefTime2Raw = readTrimmed(formData, "prefTime2");
  const prefTime3Raw = readTrimmed(formData, "prefTime3");
  const prefTime2 = prefTime2Raw ? parseOptionalIsoDateTime(prefTime2Raw) : null;
  const prefTime3 = prefTime3Raw ? parseOptionalIsoDateTime(prefTime3Raw) : null;

  if (!studentName || !studentEmail) {
    return { ok: false, error: "Student name and email are required." };
  }
  if (!studentPhone) {
    return { ok: false, error: "Student phone is required." };
  }
  if (!prefTime1) {
    return { ok: false, error: "Preferred time 1 is required and must be valid." };
  }
  if (prefTime2Raw && !prefTime2) {
    return { ok: false, error: "Preferred time 2 is invalid." };
  }
  if (prefTime3Raw && !prefTime3) {
    return { ok: false, error: "Preferred time 3 is invalid." };
  }

  const secret = await createSupabaseSecretClient();
  const { error } = await secret
    .from("ambassador_session_requests")
    .update({
      student_name: studentName,
      student_email: studentEmail,
      student_phone: studentPhone,
      pref_time_1: prefTime1,
      pref_time_2: prefTime2,
      pref_time_3: prefTime3,
      discussion_topics: discussionTopics,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    console.error("[updateAdminAmbassadorSessionDetails]", error);
    return { ok: false, error: "Could not save session details." };
  }

  revalidateSessionPaths("ambassador", sessionId);
  return { ok: true };
}

export async function updateAdminSessionStatus(
  kindRaw: string,
  sessionIdRaw: string,
  statusRaw: string,
): Promise<AdminSessionActionResult> {
  const kind = parseKind(kindRaw);
  if (!kind) {
    return { ok: false, error: "Invalid session type." };
  }

  if (kind === "advisor") {
    return updateAdminAdvisorSessionStatus(sessionIdRaw, statusRaw);
  }

  return updateAdminAmbassadorSessionStatus(sessionIdRaw, statusRaw);
}

export async function cancelAdminAdvisorSession(
  sessionIdRaw: string,
): Promise<AdminSessionActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const sessionId = parseSessionId(sessionIdRaw);
  if (sessionId == null) {
    return { ok: false, error: "Invalid session." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: existing, error: fetchErr } = await secret
    .from("advisor_sessions")
    .select("id, status, student_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { ok: false, error: "Session not found." };
  }

  if (existing.status === "cancelled") {
    return { ok: true };
  }

  if (!existing.student_id) {
    return { ok: false, error: "Session has no linked student." };
  }

  const { data: studentRow, error: studentErr } = await secret
    .from("student_profiles")
    .select("school_id")
    .eq("id", existing.student_id)
    .maybeSingle();

  if (studentErr || !studentRow?.school_id) {
    return { ok: false, error: "Could not verify student school for credit refund." };
  }

  const refund = await refundSessionCredit(secret, {
    studentId: existing.student_id,
    schoolId: studentRow.school_id,
    creditType: "advisor",
    sessionId,
  });
  if (!refund.ok) return refund;

  const { error: updateErr } = await secret
    .from("advisor_sessions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (updateErr) {
    console.error("[cancelAdminAdvisorSession]", updateErr);
    return { ok: false, error: "Could not cancel session." };
  }

  revalidateSessionPaths("advisor", sessionId);
  return { ok: true };
}

export async function cancelAdminAmbassadorSession(
  sessionIdRaw: string,
): Promise<AdminSessionActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const sessionId = parseSessionId(sessionIdRaw);
  if (sessionId == null) {
    return { ok: false, error: "Invalid session." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: existing, error: fetchErr } = await secret
    .from("ambassador_session_requests")
    .select("id, status, student_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { ok: false, error: "Session not found." };
  }

  if (existing.status === "cancelled") {
    return { ok: true };
  }

  if (!existing.student_id) {
    return { ok: false, error: "Session has no linked student." };
  }

  const { data: studentRow, error: studentErr } = await secret
    .from("student_profiles")
    .select("school_id")
    .eq("id", existing.student_id)
    .maybeSingle();

  if (studentErr || !studentRow?.school_id) {
    return { ok: false, error: "Could not verify student school for credit refund." };
  }

  const refund = await refundSessionCredit(secret, {
    studentId: existing.student_id,
    schoolId: studentRow.school_id,
    creditType: "ambassador",
    sessionId,
  });
  if (!refund.ok) return refund;

  const { error: updateErr } = await secret
    .from("ambassador_session_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (updateErr) {
    console.error("[cancelAdminAmbassadorSession]", updateErr);
    return { ok: false, error: "Could not cancel session." };
  }

  revalidateSessionPaths("ambassador", sessionId);
  return { ok: true };
}

export async function cancelAdminSession(
  kindRaw: string,
  sessionIdRaw: string,
): Promise<AdminSessionActionResult> {
  const kind = parseKind(kindRaw);
  if (!kind) {
    return { ok: false, error: "Invalid session type." };
  }

  if (kind === "advisor") {
    return cancelAdminAdvisorSession(sessionIdRaw);
  }

  return cancelAdminAmbassadorSession(sessionIdRaw);
}
