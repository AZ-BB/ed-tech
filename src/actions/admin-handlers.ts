"use server";

import { ADMIN_USERS_HOME } from "@/app/(protected)/admin/users/_data/users-tabs-data";
import { assertAdminPermission } from "@/lib/assert-admin-permission";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type AdminHandlerActionResult = { ok: true } | { ok: false; error: string };

export type CreateAdminHandlerResult =
  | { ok: true; handlerId: string }
  | { ok: false; error: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function revalidateHandlerPaths() {
  revalidatePath(`${ADMIN_USERS_HOME}/handlers`);
  revalidatePath("/admin/applications");
}

function parseHandlerId(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  if (!UUID_RE.test(value)) return null;
  return value;
}

function parseIsActive(formData: FormData, mode: "create" | "update"): boolean {
  if (mode === "create") {
    const raw = formData.get("isActive");
    if (raw == null) return true;
    return raw === "true";
  }

  return formData.get("isActive") === "true";
}

function parseHandlerFields(formData: FormData, mode: "create" | "update") {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const isActive = parseIsActive(formData, mode);

  if (!firstName) {
    return { ok: false as const, error: "First name is required." };
  }
  if (!lastName) {
    return { ok: false as const, error: "Last name is required." };
  }
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false as const, error: "Enter a valid email address." };
  }

  return {
    ok: true as const,
    fields: {
      firstName,
      lastName,
      email,
      phone: phone || null,
      isActive,
    },
  };
}

export async function createAdminHandler(
  formData: FormData,
): Promise<CreateAdminHandlerResult> {
  const access = await assertAdminPermission("edit_applications");
  if (!access.ok) return access;

  const parsed = parseHandlerFields(formData, "create");
  if (!parsed.ok) return parsed;

  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();

  const { data, error } = await secret
    .from("handlers")
    .insert({
      first_name: parsed.fields.firstName,
      last_name: parsed.fields.lastName,
      email: parsed.fields.email,
      phone: parsed.fields.phone,
      is_active: parsed.fields.isActive,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createAdminHandler]", error);
    if (error?.code === "23505") {
      return { ok: false, error: "A handler with that email already exists." };
    }
    return { ok: false, error: "Could not create handler." };
  }

  revalidateHandlerPaths();
  return { ok: true, handlerId: data.id };
}

export async function updateAdminHandler(
  formData: FormData,
): Promise<AdminHandlerActionResult> {
  const access = await assertAdminPermission("edit_applications");
  if (!access.ok) return access;

  const id = parseHandlerId(formData.get("handlerId"));
  if (!id) {
    return { ok: false, error: "Invalid handler." };
  }

  const parsed = parseHandlerFields(formData, "update");
  if (!parsed.ok) return parsed;

  const secret = await createSupabaseSecretClient();
  const { error } = await secret
    .from("handlers")
    .update({
      first_name: parsed.fields.firstName,
      last_name: parsed.fields.lastName,
      email: parsed.fields.email,
      phone: parsed.fields.phone,
      is_active: parsed.fields.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[updateAdminHandler]", error);
    if (error.code === "23505") {
      return { ok: false, error: "A handler with that email already exists." };
    }
    return { ok: false, error: "Could not update handler." };
  }

  revalidateHandlerPaths();
  return { ok: true };
}

export async function deleteAdminHandler(handlerId: string): Promise<AdminHandlerActionResult> {
  const access = await assertAdminPermission("edit_applications");
  if (!access.ok) return access;

  if (!UUID_RE.test(handlerId.trim())) {
    return { ok: false, error: "Invalid handler." };
  }

  const secret = await createSupabaseSecretClient();
  const { error } = await secret.from("handlers").delete().eq("id", handlerId.trim());

  if (error) {
    console.error("[deleteAdminHandler]", error);
    return { ok: false, error: "Could not delete handler." };
  }

  revalidateHandlerPaths();
  return { ok: true };
}
