"use server";

import { revalidatePath } from "next/cache";

import {
  isAllowedImageFile,
  publicStorageObjectUrl,
  resolveContentType,
  sanitizeFilename,
} from "@/lib/storage-utils";
import type { GeneralResponse } from "@/utils/response";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

import { requireSchoolAdminContext } from "./school-settings-helpers";

const SCHOOL_ADMIN_AVATARS_BUCKET = "school-admin-avatars";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

async function uploadSchoolAdminAvatar(
  service: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  schoolAdminId: string,
  file: File,
): Promise<string> {
  if (!isAllowedImageFile(file)) {
    throw new Error("Profile photo must be a PNG, JPEG, WebP, or GIF image.");
  }

  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Profile photo must be 5 MB or smaller.");
  }

  const safeName = sanitizeFilename(file.name);
  const path = `${schoolAdminId}/${Date.now()}_${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const contentType = resolveContentType(file);

  const { error } = await service.storage.from(SCHOOL_ADMIN_AVATARS_BUCKET).upload(path, buf, {
    contentType,
    upsert: true,
  });

  if (error) throw error;

  return publicStorageObjectUrl(SCHOOL_ADMIN_AVATARS_BUCKET, path);
}

function splitFullName(full: string): { first_name: string; last_name: string } {
  const t = full.trim();
  if (!t) {
    return { first_name: "", last_name: "" };
  }
  const i = t.search(/\s/);
  if (i === -1) {
    return { first_name: t, last_name: "-" };
  }
  const first = t.slice(0, i).trim();
  const last = t.slice(i + 1).trim() || "-";
  return { first_name: first, last_name: last };
}

export async function updateSchoolAdminProfileAction(
  _prev: GeneralResponse<null> | null,
  formData: FormData,
): Promise<GeneralResponse<null>> {
  const ctx = await requireSchoolAdminContext();
  if ("error" in ctx) {
    return { data: null, error: ctx.error };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) {
    return { data: null, error: "Enter your full name." };
  }

  const { first_name, last_name } = splitFullName(fullName);
  if (!first_name) {
    return { data: null, error: "Enter your full name." };
  }

  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = phoneRaw.length > 0 ? phoneRaw.slice(0, 64) : null;
  const avatarFile = formData.get("avatar");
  const removeAvatar =
    formData.get("remove_avatar") === "1" || formData.get("remove_avatar") === "true";
  const now = new Date().toISOString();

  let avatar_url: string | null | undefined;
  if (avatarFile instanceof File && avatarFile.size > 0) {
    try {
      const service = await createSupabaseSecretClient();
      avatar_url = await uploadSchoolAdminAvatar(service, ctx.userId, avatarFile);
    } catch (error) {
      console.error("[school-settings] upload avatar", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Could not upload profile photo.",
      };
    }
  } else if (removeAvatar) {
    avatar_url = null;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("school_admin_profiles")
    .update({
      first_name,
      last_name,
      phone,
      ...(avatar_url !== undefined ? { avatar_url } : {}),
      updated_at: now,
    })
    .eq("id", ctx.userId);

  if (error) {
    console.error("[school-settings] update profile", error);
    return { data: null, error: "Could not save your profile." };
  }

  revalidatePath("/school", "layout");
  revalidatePath("/school/settings");
  return { data: null, error: null };
}

export async function updateSchoolSettingsAction(
  _prev: GeneralResponse<null> | null,
  formData: FormData,
): Promise<GeneralResponse<null>> {
  const ctx = await requireSchoolAdminContext();
  if ("error" in ctx) {
    return { data: null, error: ctx.error };
  }

  const name = String(formData.get("school_name") ?? "").trim();
  const countryCode = String(formData.get("country_code") ?? "").trim().toUpperCase();

  if (!name) {
    return { data: null, error: "Enter the school name." };
  }

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return { data: null, error: "Pick a valid country." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: countryOk } = await supabase
    .from("countries")
    .select("id")
    .eq("id", countryCode)
    .maybeSingle();

  if (!countryOk) {
    return { data: null, error: "Pick a valid country." };
  }

  const cityRaw = String(formData.get("school_city") ?? "").trim();
  const city = cityRaw.length > 0 ? cityRaw.slice(0, 120) : null;

  const { error } = await supabase
    .from("schools")
    .update({
      name,
      country_code: countryCode,
      city,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.schoolId);

  if (error) {
    console.error("[school-settings] update school", error);
    return { data: null, error: "Could not save school information." };
  }

  revalidatePath("/school", "layout");
  revalidatePath("/school/settings");
  return { data: null, error: null };
}
