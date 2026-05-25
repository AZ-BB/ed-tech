"use server";

import type { Database } from "@/database.types";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

type Gender = Database["public"]["Enums"]["gender"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TITLE_TO_GENDER: Record<string, Gender> = {
  Mr: "male",
  Ms: "female",
};

type AdminTeacherActionResult = { ok: true } | { ok: false; error: string };

type AdminTeacherActionResultWithMessage =
  | { ok: true; message?: string }
  | { ok: false; error: string };

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
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[admin-teachers] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return { ok: false as const, error: "You do not have permission to manage teachers." };
  }

  return { ok: true as const, userId: user.id };
}

function displayNameFromParts(first: string, last: string): string {
  return [first.trim(), last.trim()].filter(Boolean).join(" ").trim() || "Teacher";
}

async function resolveSiteUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

type CreateAdminTeacherResult = { ok: true } | { ok: false; error: string };

export async function createAdminTeacher(formData: FormData): Promise<CreateAdminTeacherResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const schoolId = String(formData.get("schoolId") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const titleRaw = String(formData.get("title") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!schoolId) {
    return { ok: false, error: "Select a school." };
  }

  if (!firstName || !lastName) {
    return { ok: false, error: "First name and last name are required." };
  }

  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const gender = TITLE_TO_GENDER[titleRaw];
  if (!gender) {
    return { ok: false, error: "Select a valid title (Mr. or Ms.)." };
  }

  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const service = await createSupabaseSecretClient();

  const { data: school, error: schoolError } = await service
    .from("schools")
    .select("id")
    .eq("id", schoolId)
    .maybeSingle();

  if (schoolError) {
    console.error("[createAdminTeacher] school lookup", schoolError);
    return { ok: false, error: "Could not verify the selected school." };
  }

  if (!school) {
    return { ok: false, error: "Selected school was not found." };
  }

  const { data: existingTeacher } = await service
    .from("school_admin_profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingTeacher) {
    return { ok: false, error: "A teacher with this email already exists." };
  }

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      firstName,
      lastName,
      type: "school",
    },
  });

  if (authError || !authData.user) {
    console.error("[createAdminTeacher] auth.admin.createUser", authError);
    return { ok: false, error: authError?.message ?? "Could not create teacher account." };
  }

  const { error: profileError } = await service.from("school_admin_profiles").insert({
    id: authData.user.id,
    school_id: schoolId,
    email,
    first_name: firstName,
    last_name: lastName,
    gender,
  });

  if (profileError) {
    console.error("[createAdminTeacher] school_admin_profiles insert", profileError);
    await service.auth.admin.deleteUser(authData.user.id);
    return { ok: false, error: profileError.message || "Could not save teacher profile." };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/teachers");

  return { ok: true };
}

export async function updateAdminTeacherProfile(
  teacherId: string,
  formData: FormData,
): Promise<AdminTeacherActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = teacherId.trim();
  if (!id || !UUID_RE.test(id)) {
    return { ok: false, error: "Invalid teacher." };
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const titleRaw = String(formData.get("title") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = phoneRaw.length > 0 ? phoneRaw.slice(0, 64) : null;

  if (!firstName) return { ok: false, error: "Enter a first name." };
  if (!lastName) return { ok: false, error: "Enter a last name." };

  const gender = TITLE_TO_GENDER[titleRaw];
  if (!gender) {
    return { ok: false, error: "Select a valid title (Mr. or Ms.)." };
  }

  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();

  const { error: updateErr } = await secret
    .from("school_admin_profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      gender,
      phone,
      updated_at: now,
    })
    .eq("id", id);

  if (updateErr) {
    console.error("[updateAdminTeacherProfile]", updateErr);
    return { ok: false, error: updateErr.message || "Could not update teacher." };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/teachers");
  revalidatePath(`/admin/users/teachers/${id}`);
  return { ok: true };
}

export async function resetAdminTeacherPassword(
  teacherId: string,
): Promise<AdminTeacherActionResultWithMessage> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = teacherId.trim();
  if (!id || !UUID_RE.test(id)) {
    return { ok: false, error: "Invalid teacher." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: teacher, error: fetchErr } = await secret
    .from("school_admin_profiles")
    .select("email, first_name, last_name")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !teacher?.email) {
    console.error("[resetAdminTeacherPassword] fetch", fetchErr);
    return { ok: false, error: "Teacher not found." };
  }

  const email = teacher.email.trim().toLowerCase();
  const siteUrl = await resolveSiteUrl();
  const redirectTo = `${siteUrl}/auth/reset-password`;

  const { data, error } = await secret.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (error) {
    console.error("[resetAdminTeacherPassword] generateLink", error);
    return { ok: false, error: error.message || "Could not generate reset link." };
  }

  const link = data.properties?.action_link ?? data.properties?.hashed_token;
  const teacherName = displayNameFromParts(teacher.first_name, teacher.last_name);
  console.log(
    `[resetAdminTeacherPassword] recovery link for ${teacherName} (${email}):`,
    link,
  );

  return {
    ok: true,
    message:
      "Password reset link generated and logged to the server console (email integration pending).",
  };
}

export async function deactivateAdminTeacher(
  teacherId: string,
): Promise<AdminTeacherActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = teacherId.trim();
  if (!id || !UUID_RE.test(id)) {
    return { ok: false, error: "Invalid teacher." };
  }

  const secret = await createSupabaseSecretClient();

  const [{ data: teacher, error: teacherErr }, { data: admin }] = await Promise.all([
    secret
      .from("school_admin_profiles")
      .select("id, first_name, last_name, is_active")
      .eq("id", id)
      .maybeSingle(),
    secret
      .from("admins")
      .select("first_name, last_name")
      .eq("id", access.userId)
      .maybeSingle(),
  ]);

  if (teacherErr || !teacher) {
    console.error("[deactivateAdminTeacher] fetch", teacherErr);
    return { ok: false, error: "Teacher not found." };
  }

  if (!teacher.is_active) {
    return { ok: false, error: "Teacher is already inactive." };
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await secret
    .from("school_admin_profiles")
    .update({ is_active: false, updated_at: now })
    .eq("id", id);

  if (updateErr) {
    console.error("[deactivateAdminTeacher] update", updateErr);
    return { ok: false, error: "Could not deactivate teacher." };
  }

  const teacherName = displayNameFromParts(teacher.first_name, teacher.last_name);
  const adminName = displayNameFromParts(
    admin?.first_name ?? "",
    admin?.last_name ?? "",
  );
  const logMessage = `Platform admin ${adminName} deactivated teacher ${teacherName}.`;

  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: "school_admin",
    entity_id: id,
    action: "teacher_deactivated",
    message: logMessage,
    created_by_type: "admin",
    admin_id: access.userId,
    school_admin_id: id,
    student_id: null,
  });

  if (logErr) {
    console.error("[deactivateAdminTeacher] activity log", logErr);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/teachers");
  revalidatePath(`/admin/users/teachers/${id}`);
  return { ok: true };
}

export async function activateAdminTeacher(
  teacherId: string,
): Promise<AdminTeacherActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = teacherId.trim();
  if (!id || !UUID_RE.test(id)) {
    return { ok: false, error: "Invalid teacher." };
  }

  const secret = await createSupabaseSecretClient();

  const [{ data: teacher, error: teacherErr }, { data: admin }] = await Promise.all([
    secret
      .from("school_admin_profiles")
      .select("id, first_name, last_name, is_active")
      .eq("id", id)
      .maybeSingle(),
    secret
      .from("admins")
      .select("first_name, last_name")
      .eq("id", access.userId)
      .maybeSingle(),
  ]);

  if (teacherErr || !teacher) {
    console.error("[activateAdminTeacher] fetch", teacherErr);
    return { ok: false, error: "Teacher not found." };
  }

  if (teacher.is_active) {
    return { ok: false, error: "Teacher is already active." };
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await secret
    .from("school_admin_profiles")
    .update({ is_active: true, updated_at: now })
    .eq("id", id);

  if (updateErr) {
    console.error("[activateAdminTeacher] update", updateErr);
    return { ok: false, error: "Could not activate teacher." };
  }

  const teacherName = displayNameFromParts(teacher.first_name, teacher.last_name);
  const adminName = displayNameFromParts(
    admin?.first_name ?? "",
    admin?.last_name ?? "",
  );
  const logMessage = `Platform admin ${adminName} reactivated teacher ${teacherName}.`;

  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: "school_admin",
    entity_id: id,
    action: "teacher_activated",
    message: logMessage,
    created_by_type: "admin",
    admin_id: access.userId,
    school_admin_id: id,
    student_id: null,
  });

  if (logErr) {
    console.error("[activateAdminTeacher] activity log", logErr);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/teachers");
  revalidatePath(`/admin/users/teachers/${id}`);
  return { ok: true };
}
