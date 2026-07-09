"use server";

import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

export type ProgramActivityActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireStudent(): Promise<
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
      studentId: string;
    }
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
  programId: string,
  action: string,
  message: string,
): Promise<{ ok: false; error: string } | null> {
  const supabase = await createSupabaseSecretClient();
  const { error } = await supabase.from("acitivity_logs").insert({
    action,
    message,
    entitiy_type: "program",
    entity_id: programId,
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

/** Resolves `programs_discovery.id` (UUID) from a discovery UI id (slug or row UUID). */
async function resolveProgramUuidForDiscoveryId(
  discoveryId: string,
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRe.test(discoveryId)) {
    const { data, error } = await supabase
      .from("programs_discovery")
      .select("id")
      .eq("id", discoveryId)
      .maybeSingle();
    if (!error && data?.id) return data.id;
  }
  const { data: bySlug } = await supabase
    .from("programs_discovery")
    .select("id")
    .eq("slug", discoveryId)
    .maybeSingle();
  return bySlug?.id ?? null;
}

/** Records `student_activities` (type `save`) + `acitivity_logs`. */
export async function saveProgram(
  discoveryId: string,
): Promise<ProgramActivityActionResult> {
  const auth = await requireStudent();
  if (!auth.ok) return auth;

  const programId = await resolveProgramUuidForDiscoveryId(discoveryId.trim());
  if (!programId) {
    return { ok: false, error: "Program not found." };
  }

  const { supabase, studentId } = auth;

  const { data: existing } = await supabase
    .from("student_activities")
    .select("id")
    .eq("student_id", studentId)
    .eq("entity_type", "program")
    .eq("type", "save")
    .eq("program_discovery_id", programId)
    .maybeSingle();

  if (existing) {
    return { ok: true };
  }

  const { error: actError } = await supabase.from("student_activities").insert({
    student_id: studentId,
    entity_type: "program",
    type: "save",
    program_discovery_id: programId,
    scholarship_id: null,
    uni_id: null,
    internship_id: null,
    advisor_id: null,
    ambassador_id: null,
  });

  if (actError) {
    console.error("[saveProgram]", actError.message);
    return { ok: false, error: actError.message };
  }

  const logErr = await insertActivityLog(
    studentId,
    programId,
    "program_saved",
    "Student saved a program to their list.",
  );
  if (logErr) return logErr;

  return { ok: true };
}

/** Removes a `save` activity for this program. */
export async function unsaveProgram(
  discoveryId: string,
): Promise<ProgramActivityActionResult> {
  const auth = await requireStudent();
  if (!auth.ok) return auth;

  const programId = await resolveProgramUuidForDiscoveryId(discoveryId.trim());
  if (!programId) {
    return { ok: false, error: "Program not found." };
  }

  const { supabase, studentId } = auth;

  const { error } = await supabase
    .from("student_activities")
    .delete()
    .eq("student_id", studentId)
    .eq("entity_type", "program")
    .eq("type", "save")
    .eq("program_discovery_id", programId);

  if (error) {
    console.error("[unsaveProgram]", error.message);
    return { ok: false, error: error.message };
  }

  const logErr = await insertActivityLog(
    studentId,
    programId,
    "program_unsaved",
    "Student removed a program from their saved list.",
  );
  if (logErr) return logErr;

  return { ok: true };
}
