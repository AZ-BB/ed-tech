"use server";

import type { Database } from "@/database.types";
import { isResendConfigured } from "@/lib/resend/config";
import { buildRecommendationSubmitUrl } from "@/lib/resend/site-url";
import { sendRecommendationRequestEmail } from "@/lib/resend/recommendation-request-email";
import { requireStudentSession } from "@/lib/student-ai-usage-log";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

type RecRow =
  Database["public"]["Tables"]["student_my_application_recommendations"]["Row"];

const STORAGE_BUCKET = "student-my-applications";

const ALLOWED_LETTER_EXTENSIONS = new Set(["pdf", "doc", "docx"]);

export type CreateRecommendationRequestInput = {
  teacher_name: string;
  teacher_subject?: string | null;
  teacher_email: string;
  for_application: string;
  personal_note?: string | null;
  needed_by: string;
};

export type RecommendationSubmitContext = {
  teacherName: string;
  studentName: string;
  schoolName: string;
  grade: string;
  forApplication: string;
  neededBy: string;
  personalNote: string | null;
  status: string;
  alreadySubmitted: boolean;
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
}

function resolveContentType(file: File): string {
  const fromBrowser = file.type?.trim();
  if (fromBrowser) return fromBrowser;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const byExt: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return byExt[ext] ?? "application/octet-stream";
}

type RecommendationEmailFields = Pick<
  RecRow,
  | "id"
  | "teacher_name"
  | "teacher_email"
  | "teacher_subject"
  | "submit_token"
  | "student_id"
  | "for_application"
  | "personal_note"
  | "needed_by"
>;

async function fetchStudentName(studentId: string): Promise<string> {
  const secret = await createSupabaseSecretClient();
  const { data: profile } = await secret
    .from("student_profiles")
    .select("first_name, last_name")
    .eq("id", studentId)
    .maybeSingle();
  if (!profile) return "A student";
  return `${profile.first_name} ${profile.last_name}`.trim() || "A student";
}

async function sendEmailForRecommendation(
  rec: RecommendationEmailFields,
): Promise<{ ok: true } | { error: string }> {
  if (!isResendConfigured()) {
    return {
      error:
        "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    };
  }

  const studentName = await fetchStudentName(rec.student_id);
  const submitUrl = await buildRecommendationSubmitUrl(rec.submit_token);

  const result = await sendRecommendationRequestEmail({
    to: rec.teacher_email,
    teacherName: rec.teacher_name,
    studentName,
    forApplication: rec.for_application,
    personalNote: rec.personal_note,
    neededBy: rec.needed_by,
    submitUrl,
    teacherSubject: rec.teacher_subject,
  });

  if ("error" in result) {
    return { error: result.error || "Could not send the recommendation request email." };
  }

  return { ok: true };
}

export async function createRecommendationRequest(
  input: CreateRecommendationRequestInput,
): Promise<{ row: RecRow } | { error: string }> {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return { error: auth.message };
  }

  const teacherName = input.teacher_name.trim();
  const teacherEmail = input.teacher_email.trim().toLowerCase();
  const forApplication = input.for_application.trim();

  if (!teacherName || !teacherEmail || !forApplication) {
    return { error: "Teacher name, email, and application are required." };
  }
  if (!input.needed_by) {
    return { error: "Pick a deadline first." };
  }

  if (!isResendConfigured()) {
    return {
      error:
        "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    };
  }

  const secret = await createSupabaseSecretClient();
  const { data, error } = await secret
    .from("student_my_application_recommendations")
    .insert({
      student_id: auth.studentId,
      teacher_name: teacherName,
      teacher_subject: input.teacher_subject?.trim() || null,
      teacher_email: teacherEmail,
      for_application: forApplication,
      personal_note: input.personal_note?.trim() || null,
      needed_by: input.needed_by,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error(error);
    return { error: error?.message ?? "Could not send request." };
  }

  const emailResult = await sendEmailForRecommendation(data);
  if ("error" in emailResult) {
    await secret
      .from("student_my_application_recommendations")
      .delete()
      .eq("id", data.id);
    return { error: emailResult.error };
  }

  return { row: data };
}

export async function resendRecommendationRequestEmail(
  recommendationId: string,
): Promise<{ ok: true } | { error: string }> {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return { error: auth.message };
  }

  const supabase = await createSupabaseServerClient();
  const { data: rec, error } = await supabase
    .from("student_my_application_recommendations")
    .select(
      "id, student_id, teacher_name, teacher_email, teacher_subject, submit_token, for_application, personal_note, needed_by, status",
    )
    .eq("id", recommendationId)
    .maybeSingle();

  if (error || !rec) {
    return { error: "Recommendation request not found." };
  }
  if (rec.student_id !== auth.studentId) {
    return { error: "You do not have access to this request." };
  }
  if (rec.status === "submitted") {
    return { error: "This letter has already been submitted." };
  }

  const emailResult = await sendEmailForRecommendation(rec);
  if ("error" in emailResult) {
    return { error: emailResult.error };
  }

  return { ok: true };
}

type SchoolEmbed = { name?: string | null } | null;

export async function getRecommendationSubmitContext(
  token: string,
): Promise<{ context: RecommendationSubmitContext } | { error: string }> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { error: "Invalid link." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: rec, error } = await secret
    .from("student_my_application_recommendations")
    .select(
      `
      teacher_name,
      for_application,
      needed_by,
      personal_note,
      status,
      student_profiles (
        first_name,
        last_name,
        grade,
        schools ( name )
      )
    `,
    )
    .eq("submit_token", trimmed)
    .maybeSingle();

  if (error || !rec) {
    return { error: "This recommendation link is invalid or has expired." };
  }

  const profileRaw = rec.student_profiles as
    | {
        first_name?: string;
        last_name?: string;
        grade?: string;
        schools?: SchoolEmbed | SchoolEmbed[];
      }
    | null
    | undefined;

  const schoolsRaw = profileRaw?.schools;
  const schoolEmbed = Array.isArray(schoolsRaw)
    ? (schoolsRaw[0] ?? null)
    : (schoolsRaw ?? null);
  const schoolName =
    typeof schoolEmbed?.name === "string" && schoolEmbed.name.trim()
      ? schoolEmbed.name.trim()
      : "—";

  const studentName = profileRaw
    ? `${profileRaw.first_name ?? ""} ${profileRaw.last_name ?? ""}`.trim() ||
      "Student"
    : "Student";

  const grade =
    typeof profileRaw?.grade === "string" && profileRaw.grade.trim()
      ? profileRaw.grade.trim()
      : "—";

  return {
    context: {
      teacherName: rec.teacher_name,
      studentName,
      schoolName,
      grade,
      forApplication: rec.for_application,
      neededBy: rec.needed_by,
      personalNote: rec.personal_note,
      status: rec.status,
      alreadySubmitted: rec.status === "submitted",
    },
  };
}

function isAllowedLetterFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_LETTER_EXTENSIONS.has(ext);
}

export async function submitRecommendationByToken(
  token: string,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { error: "Invalid link." };
  }

  const file = formData.get("letter");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please upload a recommendation letter (PDF, DOC, or DOCX)." };
  }
  if (!isAllowedLetterFile(file)) {
    return { error: "Only PDF, DOC, and DOCX files are allowed." };
  }

  const notesRaw = formData.get("notes");
  const notes =
    typeof notesRaw === "string" && notesRaw.trim() ? notesRaw.trim() : null;

  const secret = await createSupabaseSecretClient();
  const { data: rec, error: fetchErr } = await secret
    .from("student_my_application_recommendations")
    .select("id, student_id, status")
    .eq("submit_token", trimmed)
    .maybeSingle();

  if (fetchErr || !rec) {
    return { error: "This recommendation link is invalid or has expired." };
  }
  if (rec.status === "submitted") {
    return { error: "This recommendation has already been submitted." };
  }

  const safeName = sanitizeFilename(file.name);
  const path = `${rec.student_id}/recommendations/${rec.id}/${Date.now()}_${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const contentType = resolveContentType(file);

  const { error: upErr } = await secret.storage
    .from(STORAGE_BUCKET)
    .upload(path, buf, { contentType, upsert: true });

  if (upErr) {
    console.error(upErr);
    return { error: "Could not upload the file. Try again later." };
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await secret
    .from("student_my_application_recommendations")
    .update({
      letter_storage_path: path,
      letter_file_name: file.name,
      submitter_notes: notes,
      status: "submitted",
      submitted_at: now,
      updated_at: now,
    })
    .eq("id", rec.id);

  if (updateErr) {
    console.error(updateErr);
    return { error: "Could not save your submission. Try again later." };
  }

  return { ok: true };
}

export async function getRecommendationLetterViewUrl(
  recommendationId: string,
): Promise<{ url: string } | { error: string }> {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return { error: auth.message };
  }

  const supabase = await createSupabaseServerClient();
  const { data: rec, error } = await supabase
    .from("student_my_application_recommendations")
    .select("id, student_id, letter_storage_path, status")
    .eq("id", recommendationId)
    .maybeSingle();

  if (error || !rec?.letter_storage_path) {
    return { error: "No uploaded letter for this request." };
  }
  if (rec.student_id !== auth.studentId) {
    return { error: "You do not have access to this request." };
  }
  if (rec.status !== "submitted") {
    return { error: "This letter has not been submitted yet." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: signed, error: signErr } = await secret.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(rec.letter_storage_path, 120);

  if (signErr || !signed?.signedUrl) {
    console.error(signErr);
    return { error: "Could not open the file. Try again later." };
  }

  return { url: signed.signedUrl };
}
