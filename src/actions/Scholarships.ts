"use server";

import {
  getScholarshipDiscoveryPageData,
  parseScholarshipDiscoverySearchParams,
  resolveScholarshipUuidForDiscoveryId,
  type ScholarshipDiscoveryPageData,
} from "@/app/(protected)/student/scholarships/_lib/get-scholarship-discovery-programs";
import { createSupabaseServerClient } from "@/utils/supabase-server";
import { createClient } from "@supabase/supabase-js";

export type ScholarshipActivityActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireStudent(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>; studentId: string }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { ok: false, error: "You must be signed in." };
  }
  return { ok: true, supabase, studentId: user.id };
}

async function insertActivityLog(
  studentId: string,
  scholarshipUuid: string,
  action: string,
  message: string,
): Promise<{ ok: false; error: string } | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );
  const { error } = await supabase.from("acitivity_logs").insert({
    action,
    message,
    entitiy_type: "scholarship",
    entity_id: scholarshipUuid,
    created_by_type: "student",
    student_id: studentId,
    admin_id: null,
    school_admin_id: null,
  });
  if (error) {
    const msg =
      typeof error.message === "string" && error.message
        ? error.message
        : "Failed to write activity log.";
    console.error("[insertActivityLog]", msg);
    return { ok: false, error: msg };
  }
  return null;
}

/** Loads one discovery page (filters, search, pagination) from the database. */
export async function loadScholarshipDiscoveryPage(
  rawSearchParams: Record<string, string | string[] | undefined>,
): Promise<ScholarshipDiscoveryPageData> {
  return getScholarshipDiscoveryPageData(
    parseScholarshipDiscoverySearchParams(rawSearchParams),
  );
}

/** Convenience for RSC `searchParams` promises. */
export async function loadScholarshipDiscoveryPageFromSearchParams(
  searchParams: Promise<Record<string, string | string[] | undefined>> | undefined,
): Promise<ScholarshipDiscoveryPageData> {
  const raw = searchParams ? await searchParams : {};
  return loadScholarshipDiscoveryPage(raw);
}

/** Records `student_activities` (type `save`) + `acitivity_logs`. */
export async function saveScholarship(
  discoveryId: string,
): Promise<ScholarshipActivityActionResult> {
  const auth = await requireStudent();
  if (!auth.ok) return auth;

  const scholarshipId = await resolveScholarshipUuidForDiscoveryId(discoveryId.trim());
  if (!scholarshipId) {
    return { ok: false, error: "Scholarship not found." };
  }

  const { supabase, studentId } = auth;

  const { data: existing } = await supabase
    .from("student_activities")
    .select("id")
    .eq("student_id", studentId)
    .eq("entity_type", "scholarship")
    .eq("type", "save")
    .eq("scholarship_id", scholarshipId)
    .maybeSingle();

  if (existing) {
    return { ok: true };
  }

  const { error: actError } = await supabase.from("student_activities").insert({
    student_id: studentId,
    entity_type: "scholarship",
    type: "save",
    scholarship_id: scholarshipId,
    uni_id: null,
    advisor_id: null,
    ambassador_id: null,
  });

  if (actError) {
    console.error("[saveScholarship]", actError.message);
    return { ok: false, error: actError.message };
  }

  const logErr = await insertActivityLog(
    studentId,
    scholarshipId,
    "scholarship_saved",
    "Student saved a scholarship to their list.",
  );
  if (logErr) return logErr;

  return { ok: true };
}

/** Removes a `save` activity for this scholarship. */
export async function unsaveScholarship(
  discoveryId: string,
): Promise<ScholarshipActivityActionResult> {
  const auth = await requireStudent();
  if (!auth.ok) return auth;

  const scholarshipId = await resolveScholarshipUuidForDiscoveryId(discoveryId.trim());
  if (!scholarshipId) {
    return { ok: false, error: "Scholarship not found." };
  }

  const { supabase, studentId } = auth;

  const { error } = await supabase
    .from("student_activities")
    .delete()
    .eq("student_id", studentId)
    .eq("entity_type", "scholarship")
    .eq("type", "save")
    .eq("scholarship_id", scholarshipId);

  if (error) {
    console.error("[unsaveScholarship]", error.message);
    return { ok: false, error: error.message };
  }

  const logErr = await insertActivityLog(
    studentId,
    scholarshipId,
    "scholarship_unsaved",
    "Student removed a scholarship from their saved list.",
  );
  if (logErr) return logErr;

  return { ok: true };
}

/** Records `student_activities` (type `shortlist`) + `acitivity_logs`. */
export async function addScholarshipToShortlist(
  discoveryId: string,
): Promise<ScholarshipActivityActionResult> {
  const auth = await requireStudent();
  if (!auth.ok) return auth;

  const scholarshipId = await resolveScholarshipUuidForDiscoveryId(discoveryId.trim());
  if (!scholarshipId) {
    return { ok: false, error: "Scholarship not found." };
  }

  const { supabase, studentId } = auth;

  const { data: existing } = await supabase
    .from("student_activities")
    .select("id")
    .eq("student_id", studentId)
    .eq("entity_type", "scholarship")
    .eq("type", "shortlist")
    .eq("scholarship_id", scholarshipId)
    .maybeSingle();

  if (existing) {
    return { ok: true };
  }

  const { error: actError } = await supabase.from("student_activities").insert({
    student_id: studentId,
    entity_type: "scholarship",
    type: "shortlist",
    scholarship_id: scholarshipId,
    uni_id: null,
    advisor_id: null,
    ambassador_id: null,
  });

  if (actError) {
    console.error("[addScholarshipToShortlist]", actError.message);
    return { ok: false, error: actError.message };
  }

  const logErr = await insertActivityLog(
    studentId,
    scholarshipId,
    "scholarship_shortlisted",
    "Student added a scholarship to their shortlist.",
  );
  if (logErr) return logErr;

  return { ok: true };
}

/** Removes a `shortlist` activity for this scholarship. */
export async function removeScholarshipFromShortlist(
  discoveryId: string,
): Promise<ScholarshipActivityActionResult> {
  const auth = await requireStudent();
  if (!auth.ok) return auth;

  const scholarshipId = await resolveScholarshipUuidForDiscoveryId(discoveryId.trim());
  if (!scholarshipId) {
    return { ok: false, error: "Scholarship not found." };
  }

  const { supabase, studentId } = auth;

  const { error } = await supabase
    .from("student_activities")
    .delete()
    .eq("student_id", studentId)
    .eq("entity_type", "scholarship")
    .eq("type", "shortlist")
    .eq("scholarship_id", scholarshipId);

  if (error) {
    console.error("[removeScholarshipFromShortlist]", error.message);
    return { ok: false, error: error.message };
  }

  const logErr = await insertActivityLog(
    studentId,
    scholarshipId,
    "scholarship_shortlist_removed",
    "Student removed a scholarship from their shortlist.",
  );
  if (logErr) return logErr;

  return { ok: true };
}
