"use server";

import type { Database } from "@/database.types";
import { buildPasswordResetRedirectUrl } from "@/lib/resend/site-url";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type AdminRole = Database["public"]["Enums"]["admin_role"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ADMIN_ROLE_OPTIONS: { value: AdminRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
  { value: "super_admin", label: "Super Admin" },
];

const ADMIN_ROLE_VALUES = new Set<string>(ADMIN_ROLE_OPTIONS.map((option) => option.value));

type AdminPlatformAdminActionResult = { ok: true } | { ok: false; error: string };

type AdminPlatformAdminActionResultWithMessage =
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
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[admin-admins] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return { ok: false as const, error: "You do not have permission to manage admins." };
  }

  if (admin.is_active === false) {
    return { ok: false as const, error: "Your admin account is inactive." };
  }

  return { ok: true as const, userId: user.id };
}

function displayNameFromParts(first: string, last: string): string {
  return [first.trim(), last.trim()].filter(Boolean).join(" ").trim() || "Admin";
}

export async function updateAdminAdminProfile(
  adminId: string,
  formData: FormData,
): Promise<AdminPlatformAdminActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = adminId.trim();
  if (!id || !UUID_RE.test(id)) {
    return { ok: false, error: "Invalid admin." };
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = phoneRaw.length > 0 ? phoneRaw.slice(0, 64) : null;
  const roleRaw = String(formData.get("role") ?? "").trim();

  if (!firstName || !lastName) {
    return { ok: false, error: "First name and last name are required." };
  }

  if (!ADMIN_ROLE_VALUES.has(roleRaw)) {
    return { ok: false, error: "Select a valid admin role." };
  }

  const role = roleRaw as AdminRole;
  const secret = await createSupabaseSecretClient();

  const { data: existing, error: fetchErr } = await secret
    .from("admins")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !existing) {
    console.error("[updateAdminAdminProfile] fetch", fetchErr);
    return { ok: false, error: "Admin not found." };
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await secret
    .from("admins")
    .update({
      first_name: firstName,
      last_name: lastName,
      phone,
      role,
      updated_at: now,
    })
    .eq("id", id);

  if (updateErr) {
    console.error("[updateAdminAdminProfile] update", updateErr);
    return { ok: false, error: updateErr.message || "Could not update admin." };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/admins");
  revalidatePath(`/admin/users/admins/${id}`);
  return { ok: true };
}

export async function resetAdminAdminPassword(
  adminId: string,
): Promise<AdminPlatformAdminActionResultWithMessage> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = adminId.trim();
  if (!id || !UUID_RE.test(id)) {
    return { ok: false, error: "Invalid admin." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: admin, error: fetchErr } = await secret
    .from("admins")
    .select("email, first_name, last_name")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !admin?.email) {
    console.error("[resetAdminAdminPassword] fetch", fetchErr);
    return { ok: false, error: "Admin not found." };
  }

  const email = admin.email.trim().toLowerCase();
  const redirectTo = await buildPasswordResetRedirectUrl();

  const { data, error } = await secret.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (error) {
    console.error("[resetAdminAdminPassword] generateLink", error);
    return { ok: false, error: error.message || "Could not generate reset link." };
  }

  const link = data.properties?.action_link ?? data.properties?.hashed_token;
  const adminName = displayNameFromParts(admin.first_name, admin.last_name);
  console.log(
    `[resetAdminAdminPassword] recovery link for ${adminName} (${email}):`,
    link,
  );

  return {
    ok: true,
    message:
      "Password reset link generated and logged to the server console (email integration pending).",
  };
}

export async function deactivateAdminAdmin(
  adminId: string,
): Promise<AdminPlatformAdminActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = adminId.trim();
  if (!id || !UUID_RE.test(id)) {
    return { ok: false, error: "Invalid admin." };
  }

  if (id === access.userId) {
    return { ok: false, error: "You cannot deactivate your own account." };
  }

  const secret = await createSupabaseSecretClient();

  const [{ data: target, error: targetErr }, { data: actor }] = await Promise.all([
    secret
      .from("admins")
      .select("id, first_name, last_name, is_active")
      .eq("id", id)
      .maybeSingle(),
    secret
      .from("admins")
      .select("first_name, last_name")
      .eq("id", access.userId)
      .maybeSingle(),
  ]);

  if (targetErr || !target) {
    console.error("[deactivateAdminAdmin] fetch", targetErr);
    return { ok: false, error: "Admin not found." };
  }

  if (!target.is_active) {
    return { ok: false, error: "Admin is already inactive." };
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await secret
    .from("admins")
    .update({ is_active: false, updated_at: now })
    .eq("id", id);

  if (updateErr) {
    console.error("[deactivateAdminAdmin] update", updateErr);
    return { ok: false, error: "Could not deactivate admin." };
  }

  const targetName = displayNameFromParts(target.first_name, target.last_name);
  const actorName = displayNameFromParts(
    actor?.first_name ?? "",
    actor?.last_name ?? "",
  );
  const logMessage = `Platform admin ${actorName} deactivated admin ${targetName}.`;

  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: "admin",
    entity_id: id,
    action: "admin_deactivated",
    message: logMessage,
    created_by_type: "admin",
    admin_id: access.userId,
    school_admin_id: null,
    student_id: null,
  });

  if (logErr) {
    console.error("[deactivateAdminAdmin] activity log", logErr);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/admins");
  revalidatePath(`/admin/users/admins/${id}`);
  return { ok: true };
}

export async function activateAdminAdmin(
  adminId: string,
): Promise<AdminPlatformAdminActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = adminId.trim();
  if (!id || !UUID_RE.test(id)) {
    return { ok: false, error: "Invalid admin." };
  }

  const secret = await createSupabaseSecretClient();

  const [{ data: target, error: targetErr }, { data: actor }] = await Promise.all([
    secret
      .from("admins")
      .select("id, first_name, last_name, is_active")
      .eq("id", id)
      .maybeSingle(),
    secret
      .from("admins")
      .select("first_name, last_name")
      .eq("id", access.userId)
      .maybeSingle(),
  ]);

  if (targetErr || !target) {
    console.error("[activateAdminAdmin] fetch", targetErr);
    return { ok: false, error: "Admin not found." };
  }

  if (target.is_active) {
    return { ok: false, error: "Admin is already active." };
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await secret
    .from("admins")
    .update({ is_active: true, updated_at: now })
    .eq("id", id);

  if (updateErr) {
    console.error("[activateAdminAdmin] update", updateErr);
    return { ok: false, error: "Could not activate admin." };
  }

  const targetName = displayNameFromParts(target.first_name, target.last_name);
  const actorName = displayNameFromParts(
    actor?.first_name ?? "",
    actor?.last_name ?? "",
  );
  const logMessage = `Platform admin ${actorName} reactivated admin ${targetName}.`;

  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: "admin",
    entity_id: id,
    action: "admin_activated",
    message: logMessage,
    created_by_type: "admin",
    admin_id: access.userId,
    school_admin_id: null,
    student_id: null,
  });

  if (logErr) {
    console.error("[activateAdminAdmin] activity log", logErr);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/admins");
  revalidatePath(`/admin/users/admins/${id}`);
  return { ok: true };
}
