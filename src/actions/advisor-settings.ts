"use server";

import { parseMultilineStringList } from "@/lib/admin-csv-utils";
import { assertAdvisorAccess } from "@/lib/advisor-access";
import {
  replaceAdvisorSpecializations,
  replaceAdvisorTags,
} from "@/lib/advisor-csv-import";
import {
  isAllowedImageFile,
  publicStorageObjectUrl,
  resolveContentType,
  sanitizeFilename,
} from "@/lib/storage-utils";
import type { Json } from "@/database.types";
import type { GeneralResponse } from "@/utils/response";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

const ADVISOR_AVATARS_BUCKET = "advisor-avatars";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function parseOptionalInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number.parseInt(trimmed.replace(/,/g, ""), 10);
  return Number.isFinite(value) ? value : null;
}

function parseCommaList(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function toJsonArray(values: string[]): Json | null {
  return values.length > 0 ? values : null;
}

async function uploadAdvisorAvatar(
  service: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  advisorId: string,
  file: File,
): Promise<string> {
  if (!isAllowedImageFile(file)) {
    throw new Error("Profile photo must be a PNG, JPEG, WebP, or GIF image.");
  }

  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Profile photo must be 5 MB or smaller.");
  }

  const safeName = sanitizeFilename(file.name);
  const path = `${advisorId}/${Date.now()}_${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const contentType = resolveContentType(file);

  const { error } = await service.storage.from(ADVISOR_AVATARS_BUCKET).upload(path, buf, {
    contentType,
    upsert: true,
  });

  if (error) throw error;

  return publicStorageObjectUrl(ADVISOR_AVATARS_BUCKET, path);
}

export async function updateAdvisorProfileAction(
  _prev: GeneralResponse<null> | null,
  formData: FormData,
): Promise<GeneralResponse<null>> {
  const access = await assertAdvisorAccess();
  if (!access.ok) {
    return { data: null, error: access.error };
  }

  const advisorId = access.advisorId;
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = phoneRaw.length > 0 ? phoneRaw.slice(0, 64) : null;
  const title = String(formData.get("title") ?? "").trim();
  const languages = String(formData.get("languages") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const bestFor = String(formData.get("bestFor") ?? "").trim();
  const sessionFor = String(formData.get("sessionFor") ?? "").trim();
  const about = String(formData.get("about") ?? "").trim();
  const sessionCoverageRaw = String(formData.get("sessionCoverage") ?? "");
  const questionsRaw = String(formData.get("questions") ?? "");
  const tagsRaw = String(formData.get("tags") ?? "");
  const avatarFile = formData.get("avatar");
  const removeAvatar =
    formData.get("remove_avatar") === "1" || formData.get("remove_avatar") === "true";
  const nationalityCountryCode = String(formData.get("nationalityCountryCode") ?? "")
    .trim()
    .toUpperCase();
  const experienceYears = parseOptionalInt(String(formData.get("experienceYears") ?? ""));

  const specializationCountryCodes = formData
    .getAll("specializationCountryCodes")
    .map((value) => String(value).trim().toUpperCase())
    .filter(Boolean);

  if (!firstName || !lastName) {
    return { data: null, error: "First name and last name are required." };
  }

  const service = await createSupabaseSecretClient();

  const { data: existing, error: fetchError } = await service
    .from("advisors")
    .select("id, nationality_country_code")
    .eq("id", advisorId)
    .maybeSingle();

  if (fetchError || !existing) {
    console.error("[advisor-settings] fetch", fetchError);
    return { data: null, error: "Advisor profile not found." };
  }

  let resolvedNationalityCountryCode = existing.nationality_country_code;

  if (nationalityCountryCode) {
    const { data: nationalityCountry } = await service
      .from("countries")
      .select("id")
      .eq("id", nationalityCountryCode)
      .maybeSingle();

    if (!nationalityCountry) {
      return { data: null, error: "Select a valid nationality country." };
    }

    resolvedNationalityCountryCode = nationalityCountryCode;
  }

  if (specializationCountryCodes.length > 0) {
    const { data: specializationCountries, error: specializationError } = await service
      .from("countries")
      .select("id")
      .in("id", specializationCountryCodes);

    if (specializationError) {
      console.error("[advisor-settings] specializations", specializationError);
      return { data: null, error: "Could not validate specialization countries." };
    }

    if ((specializationCountries ?? []).length !== specializationCountryCodes.length) {
      return { data: null, error: "One or more specialization countries are invalid." };
    }
  }

  const now = new Date().toISOString();

  let avatar_url: string | null | undefined;
  if (avatarFile instanceof File && avatarFile.size > 0) {
    try {
      avatar_url = await uploadAdvisorAvatar(service, advisorId, avatarFile);
    } catch (error) {
      console.error("[advisor-settings] upload avatar", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Could not upload profile photo.",
      };
    }
  } else if (removeAvatar) {
    avatar_url = null;
  }

  const { error: updateError } = await service
    .from("advisors")
    .update({
      first_name: firstName,
      last_name: lastName,
      phone,
      title: title || null,
      languages: languages || null,
      nationality_country_code: resolvedNationalityCountryCode,
      experience_years: experienceYears,
      description: description || null,
      best_for: bestFor || null,
      session_for: sessionFor || null,
      session_coverage: toJsonArray(parseMultilineStringList(sessionCoverageRaw)),
      about: about || null,
      questions: toJsonArray(parseMultilineStringList(questionsRaw)),
      ...(avatar_url !== undefined ? { avatar_url } : {}),
      updated_at: now,
    })
    .eq("id", advisorId);

  if (updateError) {
    console.error("[advisor-settings] update", updateError);
    return { data: null, error: updateError.message || "Could not save your profile." };
  }

  try {
    await replaceAdvisorTags(service, advisorId, parseCommaList(tagsRaw));
    await replaceAdvisorSpecializations(service, advisorId, specializationCountryCodes);
  } catch (error) {
    console.error("[advisor-settings] post-update", error);
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Profile saved but tags or specializations could not be updated.",
    };
  }

  revalidatePath("/advisor", "layout");
  revalidatePath("/advisor/settings");
  return { data: null, error: null };
}
