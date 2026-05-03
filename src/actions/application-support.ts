"use server";

import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

import type { Database } from "@/database.types";

const APPLICATION_DOCUMENTS_BUCKET = "application-documents";

/** Matches application_support vf.html — onboarding deposit, not full package. */
const ONBOARDING_DEPOSIT_AED = 200;

async function requireStudentActor(): Promise<
  { studentId: string; schoolId: string } | { error: string }
> {
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
    .select("id, school_id")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.error(error);
    return { error: "Could not verify your student profile." };
  }
  if (!profile) {
    return { error: "Student profile not found." };
  }
  return { studentId: user.id, schoolId: profile.school_id };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
}

function resolveContentType(file: File): string {
  const fromBrowser = file.type?.trim();
  if (fromBrowser) return fromBrowser;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const byExt: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
  };
  return byExt[ext] ?? "application/octet-stream";
}

export type ApplicationSupportPayload = {
  planUniversitiesCount: 5 | 10 | 15;
  studentName: string;
  email: string;
  phone: string;
  nationality: string;
  countryOfResidence: string;
  schoolName: string;
  currentGradeYear: string;
  destinations: string[];
  fieldOfStudy: string;
  applyTiming: string | null;
  planClarity: "clear" | "some" | "help" | null;
  universities: string[];
  uniNotes: string;
  uniIntent: "shortlist" | "ideas" | "help" | null;
};

function buildIntakeNotes(payload: ApplicationSupportPayload): string {
  const lines = [
    "--- Application support intake (guided) ---",
    payload.currentGradeYear?.trim() && `School year: ${payload.currentGradeYear.trim()}`,
    payload.destinations?.length && `Destinations: ${payload.destinations.join(", ")}`,
    payload.fieldOfStudy?.trim() && `Field of study (direction): ${payload.fieldOfStudy.trim()}`,
    payload.applyTiming && `When applying: ${payload.applyTiming}`,
    payload.planClarity && `Plan clarity: ${payload.planClarity}`,
    payload.uniIntent && `University list approach: ${payload.uniIntent}`,
  ].filter(Boolean) as string[];
  return lines.join("\n");
}

export async function submitApplicationSupport(
  formData: FormData,
): Promise<{ ok: true; applicationId: number } | { ok: false; error: string }> {
  const actor = await requireStudentActor();
  if ("error" in actor) {
    return { ok: false, error: actor.error };
  }
  const studentId = actor.studentId;
  const schoolId = actor.schoolId;

  const rawPayload = formData.get("payload");
  if (typeof rawPayload !== "string") {
    return { ok: false, error: "Invalid request payload." };
  }

  let payload: ApplicationSupportPayload;
  try {
    payload = JSON.parse(rawPayload) as ApplicationSupportPayload;
  } catch {
    return { ok: false, error: "Could not read form data." };
  }

  const name = payload.studentName?.trim() ?? "";
  const email = payload.email?.trim() ?? "";
  const phone = payload.phone?.trim() ?? "";
  if (!name || !email || !phone) {
    return { ok: false, error: "Name, email, and phone are required." };
  }

  if (![5, 10, 15].includes(payload.planUniversitiesCount)) {
    return { ok: false, error: "Please choose a valid package." };
  }

  const secret = await createSupabaseSecretClient();

  const { data: plan, error: planErr } = await secret
    .from("applications_plans")
    .select("id")
    .eq("universities_count", payload.planUniversitiesCount)
    .eq("is_active", true)
    .maybeSingle();

  if (planErr || !plan) {
    console.error(planErr);
    return {
      ok: false,
      error: "Application plans are not configured. Please contact support.",
    };
  }

  const universities = (payload.universities ?? [])
    .map((u) => u.trim())
    .filter(Boolean);

  const contactHeader = [
    payload.nationality?.trim() ? `Nationality: ${payload.nationality.trim()}` : "",
    payload.countryOfResidence?.trim()
      ? `Country of residence: ${payload.countryOfResidence.trim()}`
      : "",
  ].filter(Boolean);

  const intake = buildIntakeNotes(payload);
  const additional_parts = [
    contactHeader.join("\n"),
    intake,
    payload.uniNotes?.trim() ? `Notes:\n${payload.uniNotes.trim()}` : "",
  ].filter(Boolean);

  const additional_notes = additional_parts.length ? additional_parts.join("\n\n") : null;

  const preferred =
    payload.destinations?.filter((d) => d && d !== "Not sure yet").join(", ") ||
    payload.fieldOfStudy?.trim() ||
    "—";

  const insertRow: Database["public"]["Tables"]["applications"]["Insert"] = {
    student_id: studentId,
    school_id: schoolId,
    student_name: name,
    student_email: email,
    student_phone: phone,
    school_name: payload.schoolName?.trim() || null,
    curriculum: "other",
    expected_graduation_year: null,
    preferences_universities: universities.length ? universities : null,
    preferences_universities_notes: payload.uniNotes?.trim() || null,
    final_grade: payload.currentGradeYear?.trim() || "—",
    gpa: null,
    sat: null,
    act: null,
    ielts: null,
    toefl: null,
    inteended_fields: payload.fieldOfStudy?.trim() || "—",
    open_to_realted_fields: false,
    preferred_uni_or_countries: preferred,
    extracurricular_activities: "—",
    awards: null,
    additional_notes,
    plan_id: plan.id,
    status: "new",
  };

  const { data: appRow, error: insErr } = await secret
    .from("applications")
    .insert(insertRow)
    .select("id")
    .single();

  if (insErr || !appRow) {
    console.error(insErr);
    return { ok: false, error: "Could not save your application. Please try again." };
  }

  const applicationId = appRow.id;

  type DocKey =
    | "transcript"
    | "english_test_result"
    | "personal_statement"
    | "cv";

  const docFormKeys: { key: DocKey; field: string }[] = [
    { key: "transcript", field: "doc_transcript" },
    { key: "personal_statement", field: "doc_ps" },
    { key: "cv", field: "doc_cv" },
    { key: "english_test_result", field: "doc_english" },
  ];

  async function uploadDoc(type: DocKey, file: File) {
    const buf = Buffer.from(await file.arrayBuffer());
    const safe = sanitizeFilename(file.name);
    const path = `${studentId}/${applicationId}/${type}_${safe}`;
    const contentType = resolveContentType(file);
    const { error: upErr } = await secret.storage.from(APPLICATION_DOCUMENTS_BUCKET).upload(path, buf, {
      contentType,
      upsert: true,
    });
    if (upErr) {
      console.error(upErr);
      throw new Error(`Upload failed for ${type}`);
    }

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
    const url = `${base}/storage/v1/object/${APPLICATION_DOCUMENTS_BUCKET}/${path}`;

    const { error: docErr } = await secret.from("application_documents").insert({
      application_id: applicationId,
      type,
      url,
      file_name: file.name,
      file_size: file.size,
      file_type: contentType,
      recommender_name: null,
      recommender_email: null,
    });
    if (docErr) {
      console.error(docErr);
      throw new Error(`Could not record document ${type}`);
    }
  }

  try {
    for (const { key, field } of docFormKeys) {
      const f = formData.get(field);
      if (f instanceof File && f.size > 0) {
        await uploadDoc(key, f);
      }
    }
  } catch (e) {
    console.error(e);
    return {
      ok: false,
      error: `Your application was saved (reference #${applicationId}), but uploading one or more documents failed. Please contact support with this reference number.`,
    };
  }

  const { error: payErr } = await secret.from("payments").insert({
    student_id: studentId,
    application_id: applicationId,
    amount: ONBOARDING_DEPOSIT_AED,
    status: "pending",
  });
  if (payErr) {
    console.error(payErr);
  }

  return { ok: true, applicationId };
}
