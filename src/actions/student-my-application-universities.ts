"use server";

import {
  buildShortlistInsertFromCatalogUniversity,
  type CatalogUniversityShortlistEmbed,
} from "@/lib/catalog-university-shortlist-row";
import type { GeneralResponse } from "@/utils/response";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

import type { Database } from "@/database.types";

const MY_APPLICATIONS_PATH = "/student/my-applications";
const UNIVERSITIES_LIST_PATH = "/student/universities";

type ShortlistRow = Database["public"]["Tables"]["student_shortlist_universities"]["Row"];

function uuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

async function appendStudentUniversityLog(
  secret: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  studentId: string,
  universityId: string,
  action: string,
  message: string,
): Promise<void> {
  const { error } = await secret.from("acitivity_logs").insert({
    entitiy_type: "university",
    entity_id: universityId,
    action,
    message,
    created_by_type: "student",
    student_id: studentId,
    admin_id: null,
    school_admin_id: null,
  });
  if (error) {
    console.error("[acitivity_logs] insert failed:", error);
  }
}

/** Ensures `student_activities` has a catalog shortlist row (University Search UI). */
async function ensureCatalogShortlistActivity(
  server: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  secret: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  studentId: string,
  universityId: string,
): Promise<{ error: string | null }> {
  const { data: existing } = await server
    .from("student_activities")
    .select("id")
    .eq("student_id", studentId)
    .eq("uni_id", universityId)
    .eq("entity_type", "university")
    .eq("type", "shortlist")
    .maybeSingle();
  if (existing) {
    return { error: null };
  }

  const { error: insertErr } = await server.from("student_activities").insert({
    student_id: studentId,
    type: "shortlist",
    entity_type: "university",
    uni_id: universityId,
    advisor_id: null,
    ambassador_id: null,
    scholarship_id: null,
  });
  if (insertErr) {
    return { error: insertErr.message };
  }

  await appendStudentUniversityLog(
    secret,
    studentId,
    universityId,
    "university_shortlist_add",
    "Student added a university to their shortlist.",
  );
  return { error: null };
}

/**
 * Returns the list of majors associated with a catalog university.
 * Used by the "Move to shortlist" modal so the student can pick a major.
 */
export async function getUniversityMajors(
  universityId: string,
): Promise<GeneralResponse<{ id: number; name: string }[]>> {
  const id = typeof universityId === "string" ? universityId.trim() : "";
  if (!uuidLike(id)) {
    return { data: [], error: "Invalid university." };
  }

  const server = await createSupabaseServerClient();
  const { data, error } = await server
    .from("university_majors")
    .select("major_id, majors ( name )")
    .eq("university_id", id);

  if (error) {
    return { data: [], error: error.message };
  }

  const majors = (data ?? [])
    .map((row) => ({
      id: row.major_id,
      name: (row.majors as unknown as { name: string } | null)?.name?.trim() ?? "",
    }))
    .filter((m) => m.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  return { data: majors, error: null };
}

/**
 * Creates a `student_shortlist_universities` row from a catalog university and
 * removes the student's `student_activities` favourite (`type` save) for that uni.
 * If the student already has a catalog-linked shortlist row (e.g. from University Search), only removes the favourite.
 * Ensures a `student_activities` shortlist row exists so University Search shows the school as shortlisted.
 */
export async function moveCatalogFavouriteToApplicationShortlist(
  universityId: string,
  majorProgram?: string,
): Promise<GeneralResponse<ShortlistRow | null>> {
  const id = typeof universityId === "string" ? universityId.trim() : "";
  if (!uuidLike(id)) {
    return { data: null, error: "Invalid university." };
  }

  const actor = await requireStudentActor();
  if ("error" in actor) {
    return { data: null, error: actor.error };
  }

  const server = await createSupabaseServerClient();
  const secret = await createSupabaseSecretClient();

  const { data: existingRow } = await server
    .from("student_shortlist_universities")
    .select("*")
    .eq("student_id", actor.studentId)
    .eq("catalog_university_id", id)
    .maybeSingle();

  if (existingRow) {
    if (majorProgram?.trim()) {
      const { data: updated } = await server
        .from("student_shortlist_universities")
        .update({ major_program: majorProgram.trim() })
        .eq("id", existingRow.id)
        .select("*")
        .single();
      if (updated) {
        Object.assign(existingRow, updated);
      }
    }

    const actRes = await ensureCatalogShortlistActivity(server, secret, actor.studentId, id);
    if (actRes.error) {
      return { data: null, error: actRes.error };
    }

    const { error: delErr } = await server
      .from("student_activities")
      .delete()
      .eq("student_id", actor.studentId)
      .eq("uni_id", id)
      .eq("entity_type", "university")
      .eq("type", "save");

    if (delErr) {
      console.error("[moveCatalogFavouriteToApplicationShortlist] remove favourite:", delErr);
    }

    revalidatePath(MY_APPLICATIONS_PATH);
    revalidatePath(UNIVERSITIES_LIST_PATH);
    revalidatePath(`${UNIVERSITIES_LIST_PATH}/${id}`);
    return { data: existingRow, error: null };
  }

  const { data: uni, error: uniErr } = await server
    .from("universities")
    .select(
      `
      id,
      name,
      city,
      country_code,
      method,
      deadline_date,
      countries ( name )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (uniErr || !uni) {
    return { data: null, error: uniErr?.message ?? "University not found." };
  }

  const { data: sortRows, error: sortErr } = await server
    .from("student_shortlist_universities")
    .select("sort_order")
    .eq("student_id", actor.studentId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (sortErr) {
    return { data: null, error: sortErr.message };
  }

  const nextSort =
    sortRows && sortRows.length > 0 && typeof sortRows[0].sort_order === "number"
      ? sortRows[0].sort_order + 1
      : 0;

  const insert = buildShortlistInsertFromCatalogUniversity({
    studentId: actor.studentId,
    uni: uni as CatalogUniversityShortlistEmbed,
    sortOrder: nextSort,
    majorProgram,
  });

  const { data: row, error: insErr } = await server
    .from("student_shortlist_universities")
    .insert(insert)
    .select("*")
    .single();

  if (insErr || !row) {
    return { data: null, error: insErr?.message ?? "Could not add to shortlist." };
  }

  const actRes = await ensureCatalogShortlistActivity(server, secret, actor.studentId, id);
  if (actRes.error) {
    await server.from("student_shortlist_universities").delete().eq("id", row.id);
    return { data: null, error: actRes.error };
  }

  const { error: delErr } = await server
    .from("student_activities")
    .delete()
    .eq("student_id", actor.studentId)
    .eq("uni_id", id)
    .eq("entity_type", "university")
    .eq("type", "save");

  if (delErr) {
    console.error("[moveCatalogFavouriteToApplicationShortlist] remove favourite:", delErr);
  }

  revalidatePath(MY_APPLICATIONS_PATH);
  revalidatePath(UNIVERSITIES_LIST_PATH);
  revalidatePath(`${UNIVERSITIES_LIST_PATH}/${id}`);
  return { data: row, error: null };
}
