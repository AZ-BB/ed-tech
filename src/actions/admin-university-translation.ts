"use server";

import type { Json } from "@/database.types";
import { translateUniversityById } from "@/lib/translation/translate-university";
import {
  serializeUniversityContentAr,
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

  const supabase = await createSupabaseSecretClient();
  const result = await translateUniversityById(supabase, universityId, {
    requestedBy: access.userId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidateUniversityPaths(universityId);
  return {
    ok: true,
    translatedCount: result.translatedCount,
    errors: result.errors,
  };
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
