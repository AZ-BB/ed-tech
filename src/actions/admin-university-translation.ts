"use server";

import type { Json } from "@/database.types";
import { translateTextEnToAr } from "@/lib/translation/agrid-api";
import { translateUniversityMajorProgramCatalog } from "@/lib/translation/translate-major-program-catalog";
import { translateIntakesToArabic } from "@/lib/translation/translate-intakes";
import { getLocalizedCountryName } from "@/lib/countries";
import {
  buildTranslatableUniversityFields,
  getUniversityDocumentLines,
  parseUniversityContentAr,
  parseUniversityContentArMeta,
  serializeUniversityContentAr,
  serializeUniversityContentArMeta,
  universityCitySourceHash,
  universityCountrySourceHash,
  universityDocumentsSourceHash,
  universityIntakesSourceHash,
  type UniversityContentAr,
  type UniversityContentArKey,
} from "@/lib/university-translatable-fields";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_CONTENT_AR_KEYS = new Set<UniversityContentArKey>([
  "name",
  "description",
  "tuition_display",
  "living_display",
  "tuition_sentence",
  "living_sentence",
  "sat_policy",
  "method",
  "intakes",
  "city",
  "country_name",
  "documents",
  "scholarship_note",
]);

export type TranslateAdminUniversityResult =
  | { ok: true; translatedCount: number; errors: string[] }
  | { ok: false; error: string };

export type UpdateAdminUniversityArabicContentResult =
  | { ok: true }
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
    console.error("[admin-university-translation] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage university translations.",
    };
  }

  return { ok: true as const, userId: user.id };
}

function revalidateUniversityPaths(universityId: string) {
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/universities/${universityId}`);
  revalidatePath("/student/universities");
  revalidatePath(`/student/universities/${universityId}`);
  revalidatePath("/student/programs");
}

function sanitizeContentAr(input: UniversityContentAr): UniversityContentAr {
  const out: UniversityContentAr = {};

  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_CONTENT_AR_KEYS.has(key as UniversityContentArKey)) continue;

    if (key === "documents") {
      if (!Array.isArray(value)) continue;
      const docs = value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
      if (docs.length > 0) out.documents = docs;
      continue;
    }

    if (typeof value === "string" && value.trim()) {
      out[key as Exclude<UniversityContentArKey, "documents">] = value.trim();
    }
  }

  return out;
}

export async function translateAdminUniversity(
  universityId: string,
): Promise<TranslateAdminUniversityResult> {
  if (!UUID_RE.test(universityId)) {
    return { ok: false, error: "Invalid university id." };
  }

  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const logContext = {
    entityType: "university",
    entityId: universityId,
    requestedBy: access.userId,
  };

  const supabase = await createSupabaseSecretClient();
  const { data: university, error } = await supabase
    .from("universities")
    .select(
      "id, name, city, country_code, description, tuition_display, tuition_per_year, living_display, estimated_living_cost_per_year, sat_policy, method, intakes, documents, is_scholarship_available, content_ar, content_ar_meta",
    )
    .eq("id", universityId)
    .maybeSingle();

  if (error || !university) {
    if (error) console.error("[admin-university-translation] fetch", error);
    return { ok: false, error: "University not found." };
  }

  const row = {
    name: university.name,
    city: university.city,
    country_code: university.country_code,
    description: university.description,
    tuition_display: university.tuition_display,
    tuition_per_year: university.tuition_per_year,
    living_display: university.living_display,
    estimated_living_cost_per_year: university.estimated_living_cost_per_year,
    sat_policy: university.sat_policy,
    method: university.method,
    intakes: university.intakes,
    documents: university.documents,
    is_scholarship_available: university.is_scholarship_available,
  };

  const fields = buildTranslatableUniversityFields(row);
  const documentLines = getUniversityDocumentLines(row);

  if (
    fields.length === 0 &&
    documentLines.length === 0 &&
    !row.intakes?.trim() &&
    !row.city?.trim() &&
    !row.country_code?.trim()
  ) {
    return { ok: false, error: "No translatable English content found for this university." };
  }

  const existingContent = parseUniversityContentAr(university.content_ar);
  const existingMeta = parseUniversityContentArMeta(university.content_ar_meta);
  const nextContent: UniversityContentAr = { ...existingContent };
  const fieldHashes: Partial<Record<UniversityContentArKey, string>> = {
    ...existingMeta?.field_hashes,
  };
  const errors: string[] = [];
  let translatedCount = 0;

  for (const field of fields) {
    if (field.key === "city") {
      const cityHash = universityCitySourceHash(university.city);
      const storedCityHash = existingMeta?.field_hashes.city;
      if (
        existingContent.city?.trim() &&
        cityHash &&
        storedCityHash === cityHash
      ) {
        nextContent.city = existingContent.city;
        fieldHashes.city = cityHash;
        continue;
      }
    }

    try {
      const translated = await translateTextEnToAr(field.sourceText, {
        ...logContext,
        fieldKey: field.key,
      });
      fieldHashes[field.key] = field.sourceHash;
      nextContent[field.key as Exclude<UniversityContentArKey, "documents">] = translated;
      translatedCount += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown translation error";
      errors.push(`${field.key}: ${message}`);
      console.error(`[admin-university-translation] ${field.key}`, err);
    }
  }

  if (documentLines.length > 0) {
    const translatedDocs: string[] = [];
    let allDocumentsTranslated = true;

    for (let index = 0; index < documentLines.length; index += 1) {
      const line = documentLines[index];
      try {
        const translated = await translateTextEnToAr(line, {
          ...logContext,
          fieldKey: `documents[${index}]`,
        });
        translatedDocs.push(translated);
        translatedCount += 1;
      } catch (err) {
        allDocumentsTranslated = false;
        const message = err instanceof Error ? err.message : "Unknown translation error";
        errors.push(`documents[${index}]: ${message}`);
        console.error(`[admin-university-translation] documents[${index}]`, err);
        translatedDocs.push(line);
      }
    }

    nextContent.documents = translatedDocs;
    if (allDocumentsTranslated) {
      fieldHashes.documents = universityDocumentsSourceHash(documentLines);
    }
  }

  const intakesAr = translateIntakesToArabic(row.intakes);
  if (intakesAr) {
    nextContent.intakes = intakesAr;
    const intakesHash = universityIntakesSourceHash(row.intakes);
    if (intakesHash) fieldHashes.intakes = intakesHash;
  }

  if (university.country_code?.trim()) {
    nextContent.country_name = getLocalizedCountryName(university.country_code, "ar");
    const countryHash = universityCountrySourceHash(university.country_code);
    if (countryHash) fieldHashes.country_name = countryHash;
  }

  const catalogTranslation = await translateUniversityMajorProgramCatalog(
    supabase,
    universityId,
    logContext,
  );
  translatedCount += catalogTranslation.translatedCount;
  errors.push(...catalogTranslation.errors);

  if (translatedCount === 0 && !intakesAr && !nextContent.country_name) {
    return {
      ok: false,
      error: errors[0] ?? "Translation failed for all fields.",
    };
  }

  const meta = {
    translated_at: new Date().toISOString(),
    field_hashes: fieldHashes,
  };

  const { error: updateError } = await supabase
    .from("universities")
    .update({
      content_ar: serializeUniversityContentAr(nextContent),
      content_ar_meta: serializeUniversityContentArMeta(meta),
    })
    .eq("id", universityId);

  if (updateError) {
    console.error("[admin-university-translation] update", updateError);
    return { ok: false, error: "Could not save Arabic translations." };
  }

  revalidateUniversityPaths(universityId);
  return { ok: true, translatedCount, errors };
}

export async function updateAdminUniversityArabicContent(
  universityId: string,
  contentArInput: UniversityContentAr,
): Promise<UpdateAdminUniversityArabicContentResult> {
  if (!UUID_RE.test(universityId)) {
    return { ok: false, error: "Invalid university id." };
  }

  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const contentAr = sanitizeContentAr(contentArInput);
  const supabase = await createSupabaseSecretClient();

  const { error } = await supabase
    .from("universities")
    .update({
      content_ar: serializeUniversityContentAr(contentAr) as Json,
    })
    .eq("id", universityId);

  if (error) {
    console.error("[admin-university-translation] manual update", error);
    return { ok: false, error: "Could not save Arabic content." };
  }

  revalidateUniversityPaths(universityId);
  return { ok: true };
}
