"use server";

import { GeneralResponse } from "@/utils/response";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function login(
    _prev: GeneralResponse<null> | null,
    formData: FormData,
): Promise<GeneralResponse<null>> {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const nextRaw = String(formData.get("next") ?? "").trim();
    const next =
        nextRaw.startsWith("/") && !nextRaw.startsWith("//") && !nextRaw.includes("://")
            ? nextRaw
            : "/";

    if (!email || !password) {
        return {
            data: null,
            error: "Please enter your email and password.",
        };
    }

    const supabase = await createSupabaseServerClient();
    const { data: studentProfile } = await supabase
        .from("student_profiles")
        .select("total_logins")
        .eq("email", email)
        .maybeSingle();

    await supabase.from("student_profiles").update({
        total_logins: studentProfile?.total_logins ? studentProfile.total_logins + 1 : 1,
    }).eq("email", email);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        return {
            data: null,
            error: error.message,
        };
    }

    redirect(next);
}

export async function logout() {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect("/login");
}

export async function requestPasswordReset(
    _prev: GeneralResponse<boolean> | null,
    formData: FormData,
): Promise<GeneralResponse<boolean>> {
    const email = String(formData.get("forgot-email") ?? "").trim();

    if (!email) {
        return {
            data: false,
            error: "Enter your email address.",
        };
    }

    const supabase = await createSupabaseServerClient();
    const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    let siteUrl = fromEnv;
    if (!siteUrl) {
        const h = await headers();
        const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
        const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
        siteUrl = `${proto}://${host}`;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/reset-password`,
    });

    if (error) {
        return {
            data: false,
            error: error.message,
        };
    }

    return {
        data: true,
        error: null,
    };
}


export async function studentSignUp(
    formData: FormData,
): Promise<GeneralResponse<boolean>> {
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const nationalityCountryCode = String(formData.get("nationalityCountryCode") ?? "").trim();
    const residenceCountryCode = String(formData.get("residenceCountryCode") ?? "").trim();
    const phoneNumber = String(formData.get("phoneNumber") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const schoolAccessCode = String(formData.get("schoolAccessCode") ?? "").trim();

    if (!firstName || !lastName || !email || !nationalityCountryCode || !residenceCountryCode || !phoneNumber || !password || !schoolAccessCode) {
        return {
            data: false,
            error: "Missing required profile or country data."
        };
    }

    const supabase = await createSupabaseSecretClient();
    const emailNormalized = email.trim().toLowerCase();

    const { data: school, error: schoolError } = await supabase
        .from("schools")
        .select("id, students_limit")
        .eq("code", schoolAccessCode)
        .maybeSingle();

    if (schoolError || !school) {
        console.error(schoolError);
        return {
            data: false,
            error: "Invalid school access code."
        };
    }

    const { data: schoolStudent, error: schoolStudentError } = await supabase
        .from("school_students")
        .select("id, signed_up")
        .eq("school_id", school.id)
        .eq("email", emailNormalized)
        .maybeSingle();

    if (schoolStudentError) {
        console.error(schoolStudentError);
        return {
            data: false,
            error: "Could not verify school enrollment."
        };
    }

    if (!schoolStudent) {
        return {
            data: false,
            error: "This email is not on the approved list for this school."
        };
    }

    if (schoolStudent.signed_up) {
        return {
            data: false,
            error: "This email has already completed registration for this school."
        };
    }

    const { data: student, error: studentError } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

    if (studentError || student) {
        return {
            data: false,
            error: "Student already exists."
        };
    }

    const { error: studentsCountError, count: studentsCountCount } = await supabase
        .from("student_profiles")
        .select("id", { count: "exact", head: true })
        .eq("school_id", school.id);

    if (studentsCountError || studentsCountCount === null) {
        return {
            data: false,
            error: "School not found."
        };
    }

    if (studentsCountCount >= school.students_limit!) {
        return {
            data: false,
            error: "School has reached its students limit."
        };
    }

    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
            firstName,
            lastName,
            type: "student"
        },
        email_confirm: true
    })

    if (error) {
        return {
            data: false,
            error: error.message
        };
    }

    const { data: studentProfile, error: studentProfileError } = await supabase
        .from("student_profiles")
        .insert({
            id: data.user.id,
            email,
            first_name: firstName,
            last_name: lastName,
            school_id: school.id,
            nationality_country_code: nationalityCountryCode,
        });

    if (studentProfileError) {
        await supabase.auth.admin.deleteUser(data.user.id);
        return {
            data: false,
            error: studentProfileError.message
        };
    }

    const { error: markSignedUpError } = await supabase
        .from("school_students")
        .update({
            signed_up: true,
            updated_at: new Date().toISOString(),
        })
        .eq("id", schoolStudent.id);

    if (markSignedUpError) {
        await supabase.auth.admin.deleteUser(data.user.id);
        return {
            data: false,
            error: markSignedUpError.message
        };
    }

    const supabaseClient = await createSupabaseServerClient();

    await supabaseClient.auth.signInWithPassword({
        email,
        password,
    });

    redirect("/");
}