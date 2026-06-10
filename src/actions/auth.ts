"use server";

import { STUDENT_SCHOOL_GRADE_OPTIONS } from "@/lib/school-portal-destination-options";
import { SCHOOL_DEACTIVATED_LOGIN_MESSAGE, isSchoolActive } from "@/lib/school-access";
import { GeneralResponse } from "@/utils/response";
import { sendPasswordResetLinkViaResend } from "@/lib/password-reset-email";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { redirect } from "next/navigation";

import { DEACTIVATED_LOGIN_MESSAGE } from "@/lib/student-ai-usage-log";

const GRADE_ALLOWED = new Set<string>(STUDENT_SCHOOL_GRADE_OPTIONS);

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
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        return {
            data: null,
            error: error.message,
        };
    }

    const user = authData.user;
    const meta = user?.user_metadata as { type?: string } | undefined;
    if (user?.id && meta?.type === "student") {
        const secret = await createSupabaseSecretClient();
        const { data: studentProfile } = await secret
            .from("student_profiles")
            .select("is_active, total_logins, email, school_id")
            .eq("id", user.id)
            .maybeSingle();

        if (studentProfile && studentProfile.is_active === false) {
            await supabase.auth.signOut();
            return {
                data: null,
                error: DEACTIVATED_LOGIN_MESSAGE,
            };
        }

        if (studentProfile?.school_id) {
            const schoolActive = await isSchoolActive(studentProfile.school_id);
            if (schoolActive === false) {
                await supabase.auth.signOut();
                return {
                    data: null,
                    error: SCHOOL_DEACTIVATED_LOGIN_MESSAGE,
                };
            }
        }

        if (studentProfile) {
            await secret
                .from("student_profiles")
                .update({
                    total_logins: (studentProfile.total_logins ?? 0) + 1,
                })
                .eq("id", user.id);
        }
    } else if (user?.id && meta?.type === "school") {
        const secret = await createSupabaseSecretClient();
        const { data: teacherProfile } = await secret
            .from("school_admin_profiles")
            .select("is_active, school_id")
            .eq("id", user.id)
            .maybeSingle();

        if (teacherProfile && teacherProfile.is_active === false) {
            await supabase.auth.signOut();
            return {
                data: null,
                error: DEACTIVATED_LOGIN_MESSAGE,
            };
        }

        if (teacherProfile?.school_id) {
            const schoolActive = await isSchoolActive(teacherProfile.school_id);
            if (schoolActive === false) {
                await supabase.auth.signOut();
                return {
                    data: null,
                    error: SCHOOL_DEACTIVATED_LOGIN_MESSAGE,
                };
            }
        }
    } else if (user?.id && meta?.type === "admin") {
        const secret = await createSupabaseSecretClient();
        const { data: adminProfile } = await secret
            .from("admins")
            .select("is_active")
            .eq("id", user.id)
            .maybeSingle();

        if (adminProfile && adminProfile.is_active === false) {
            await supabase.auth.signOut();
            return {
                data: null,
                error: DEACTIVATED_LOGIN_MESSAGE,
            };
        }
    } else {
        const { data: studentProfile } = await supabase
            .from("student_profiles")
            .select("total_logins")
            .eq("email", email)
            .maybeSingle();

        if (studentProfile) {
            await supabase
                .from("student_profiles")
                .update({
                    total_logins: (studentProfile.total_logins ?? 0) + 1,
                })
                .eq("email", email);
        }
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

    const result = await sendPasswordResetLinkViaResend(email, {
        silentIfMissing: true,
    });

    if ("error" in result) {
        return {
            data: false,
            error: result.error,
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
    const grade = String(formData.get("grade") ?? "").trim();

    if (!firstName || !lastName || !email || !nationalityCountryCode || !residenceCountryCode || !phoneNumber || !password || !schoolAccessCode || !grade) {
        return {
            data: false,
            error: "Missing required profile or country data."
        };
    }

    if (!GRADE_ALLOWED.has(grade)) {
        return {
            data: false,
            error: "Please select a valid grade (Grade 9 through Grade 12).",
        };
    }

    const supabase = await createSupabaseSecretClient();
    const emailNormalized = email.trim().toLowerCase();

    const { data: school, error: schoolError } = await supabase
        .from("schools")
        .select(
            "id, students_limit, default_advisor_credit_limit, default_ambasador_credit_limit, is_active",
        )
        .eq("code", schoolAccessCode)
        .maybeSingle();

    if (schoolError || !school) {
        console.error(schoolError);
        return {
            data: false,
            error: "Invalid school access code."
        };
    }

    if (school.is_active === false) {
        return {
            data: false,
            error: SCHOOL_DEACTIVATED_LOGIN_MESSAGE,
        };
    }

    const { data: schoolStudent, error: schoolStudentError } = await supabase
        .from("school_students")
        .select("id, signed_up, grade")
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
        .eq("email", emailNormalized)
        .maybeSingle();

    if (studentError || student) {
        return {
            data: false,
            error: "Student already exists."
        };
    }

    const { data, error } = await supabase.auth.admin.createUser({
        email: emailNormalized,
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
            email: emailNormalized,
            first_name: firstName,
            last_name: lastName,
            school_id: school.id,
            nationality_country_code: nationalityCountryCode,
            grade,
            advisor_credit_limit: school.default_advisor_credit_limit ?? null,
            ambassador_credit_limit: school.default_ambasador_credit_limit ?? null,
            signup_advisor_credit_limit: school.default_advisor_credit_limit ?? null,
            signup_ambassador_credit_limit: school.default_ambasador_credit_limit ?? null,
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
            grade,
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
        email: emailNormalized,
        password,
    });

    redirect("/");
}