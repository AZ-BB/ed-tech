"use server";

import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import type { GeneralResponse } from "@/utils/response";
import { revalidatePath } from "next/cache";

const UNIVERSITIES_LIST_PATH = "/student/universities";

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

async function validateUniversity(secret: Awaited<ReturnType<typeof createSupabaseSecretClient>>, universityId: string): Promise<boolean> {
    const { data } = await secret.from("universities").select("id").eq("id", universityId).maybeSingle();
    return !!data;
}

export async function addUniversityToShortlist(universityId: string): Promise<GeneralResponse<boolean>> {
    const id = typeof universityId === "string" ? universityId.trim() : "";
    if (!uuidLike(id)) {
        return { data: false, error: "Invalid university." };
    }

    const actor = await requireStudentActor();
    if ("error" in actor) {
        return { data: false, error: actor.error };
    }

    const server = await createSupabaseServerClient();
    const secret = await createSupabaseSecretClient();
    const exists = await validateUniversity(secret, id);
    if (!exists) {
        return { data: false, error: "University not found." };
    }

    const { data: existing } = await server
        .from("student_activities")
        .select("id")
        .eq("student_id", actor.studentId)
        .eq("uni_id", id)
        .eq("entity_type", "university")
        .eq("type", "shortlist")
        .maybeSingle();

    if (!existing) {
        const { error: insertErr } = await server.from("student_activities").insert({
            student_id: actor.studentId,
            type: "shortlist",
            entity_type: "university",
            uni_id: id,
            advisor_id: null,
            ambassador_id: null,
            scholarship_id: null,
        });
        if (insertErr) {
            console.error(insertErr);
            return { data: false, error: insertErr.message };
        }
        await appendStudentUniversityLog(
            secret,
            actor.studentId,
            id,
            "university_shortlist_add",
            "Student added a university to their shortlist.",
        );
    }

    revalidatePath(UNIVERSITIES_LIST_PATH);
    revalidatePath(`${UNIVERSITIES_LIST_PATH}/${id}`);
    return { data: true, error: null };
}

export async function removeUniversityFromShortlist(universityId: string): Promise<GeneralResponse<boolean>> {
    const id = typeof universityId === "string" ? universityId.trim() : "";
    if (!uuidLike(id)) {
        return { data: false, error: "Invalid university." };
    }

    const actor = await requireStudentActor();
    if ("error" in actor) {
        return { data: false, error: actor.error };
    }

    const server = await createSupabaseServerClient();
    const secret = await createSupabaseSecretClient();

    const { error: delErr, data: deleted } = await server
        .from("student_activities")
        .delete()
        .eq("student_id", actor.studentId)
        .eq("uni_id", id)
        .eq("entity_type", "university")
        .eq("type", "shortlist")
        .select("id");

    if (delErr) {
        console.error(delErr);
        return { data: false, error: delErr.message };
    }

    if ((deleted ?? []).length > 0) {
        await appendStudentUniversityLog(
            secret,
            actor.studentId,
            id,
            "university_shortlist_remove",
            "Student removed a university from their shortlist.",
        );
    }

    revalidatePath(UNIVERSITIES_LIST_PATH);
    revalidatePath(`${UNIVERSITIES_LIST_PATH}/${id}`);
    return { data: true, error: null };
}

export async function addUniversityToFavourites(universityId: string): Promise<GeneralResponse<boolean>> {
    const id = typeof universityId === "string" ? universityId.trim() : "";
    if (!uuidLike(id)) {
        return { data: false, error: "Invalid university." };
    }

    const actor = await requireStudentActor();
    if ("error" in actor) {
        return { data: false, error: actor.error };
    }

    const server = await createSupabaseServerClient();
    const secret = await createSupabaseSecretClient();
    const exists = await validateUniversity(secret, id);
    if (!exists) {
        return { data: false, error: "University not found." };
    }

    const { data: existing } = await server
        .from("student_activities")
        .select("id")
        .eq("student_id", actor.studentId)
        .eq("uni_id", id)
        .eq("entity_type", "university")
        .eq("type", "save")
        .maybeSingle();

    if (!existing) {
        const { error: insertErr } = await server.from("student_activities").insert({
            student_id: actor.studentId,
            type: "save",
            entity_type: "university",
            uni_id: id,
            advisor_id: null,
            ambassador_id: null,
            scholarship_id: null,
        });
        if (insertErr) {
            console.error(insertErr);
            return { data: false, error: insertErr.message };
        }
        await appendStudentUniversityLog(
            secret,
            actor.studentId,
            id,
            "university_favourite_add",
            "Student added a university to their favourites.",
        );
    }

    revalidatePath(UNIVERSITIES_LIST_PATH);
    revalidatePath(`${UNIVERSITIES_LIST_PATH}/${id}`);
    return { data: true, error: null };
}

export async function removeUniversityFromFavourites(universityId: string): Promise<GeneralResponse<boolean>> {
    const id = typeof universityId === "string" ? universityId.trim() : "";
    if (!uuidLike(id)) {
        return { data: false, error: "Invalid university." };
    }

    const actor = await requireStudentActor();
    if ("error" in actor) {
        return { data: false, error: actor.error };
    }

    const server = await createSupabaseServerClient();
    const secret = await createSupabaseSecretClient();

    const { error: delErr, data: deleted } = await server
        .from("student_activities")
        .delete()
        .eq("student_id", actor.studentId)
        .eq("uni_id", id)
        .eq("entity_type", "university")
        .eq("type", "save")
        .select("id");

    if (delErr) {
        console.error(delErr);
        return { data: false, error: delErr.message };
    }

    if ((deleted ?? []).length > 0) {
        await appendStudentUniversityLog(
            secret,
            actor.studentId,
            id,
            "university_favourite_remove",
            "Student removed a university from their favourites.",
        );
    }

    revalidatePath(UNIVERSITIES_LIST_PATH);
    revalidatePath(`${UNIVERSITIES_LIST_PATH}/${id}`);
    return { data: true, error: null };
}
