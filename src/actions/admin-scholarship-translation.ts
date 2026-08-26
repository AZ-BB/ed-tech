"use server";

import type { Json } from "@/database.types";
import { translateScholarshipById } from "@/lib/translation/translate-scholarship";
import {
  serializeScholarshipContentAr,
  type ScholarshipContentAr,
  type ScholarshipContentArKey,
} from "@/lib/scholarship-translatable-fields";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_CONTENT_AR_KEYS = new Set<ScholarshipContentArKey>([
  "name",
  "provider",
  "country",
  "type",
  "shortSummary",
  "eligSummary",
  "degreeLevels",
  "fieldsOfStudy",
  "academicElig",
  "englishReq",
  "otherElig",
  "applicationMethod",
  "coverageLabel",
  "tooltip",
  "competition",
  "renewable",
  "deadline",
  "linkNotes",
  "applicationWebsiteName",
  "importantNotes",
  "coverage_tuition",
  "coverage_stipend",
  "coverage_travel",
  "coverage_other",
  "description",
  "target_students",
  "level",
  "sat_policy",
  "method",
  "intakes",
  "city",
  "other",
  "requiredDocs",
  "destinations",
]);

export type TranslateAdminScholarshipResult =
  | { ok: true; translatedCount: number; errors: string[] }
  | { ok: false; error: string };

export type UpdateAdminScholarshipArabicContentResult =
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
    console.error("[admin-scholarship-translation] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage scholarship translations.",
    };
  }

  return { ok: true as const, userId: user.id };
}

function revalidateScholarshipPaths(scholarshipId: string) {
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/scholarships/${scholarshipId}`);
  revalidatePath("/student/scholarships");
}

function sanitizeContentAr(input: ScholarshipContentAr): ScholarshipContentAr {
  const out: ScholarshipContentAr = {};

  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_CONTENT_AR_KEYS.has(key as ScholarshipContentArKey)) continue;

    if (key === "requiredDocs" || key === "destinations") {
      if (!Array.isArray(value)) continue;
      const items = value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
      if (items.length > 0) {
        out[key] = items;
      }
      continue;
    }

    if (typeof value === "string" && value.trim()) {
      (out as Record<string, string>)[key] = value.trim();
    }
  }

  return out;
}

export async function translateAdminScholarship(
  scholarshipId: string,
): Promise<TranslateAdminScholarshipResult> {
  if (!UUID_RE.test(scholarshipId)) {
    return { ok: false, error: "Invalid scholarship id." };
  }

  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const supabase = await createSupabaseSecretClient();
  const result = await translateScholarshipById(supabase, scholarshipId, {
    requestedBy: access.userId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidateScholarshipPaths(scholarshipId);
  return {
    ok: true,
    translatedCount: result.translatedCount,
    errors: result.errors,
  };
}

export async function updateAdminScholarshipArabicContent(
  scholarshipId: string,
  contentArInput: ScholarshipContentAr,
): Promise<UpdateAdminScholarshipArabicContentResult> {
  if (!UUID_RE.test(scholarshipId)) {
    return { ok: false, error: "Invalid scholarship id." };
  }

  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const contentAr = sanitizeContentAr(contentArInput);
  const supabase = await createSupabaseSecretClient();

  const { error } = await supabase
    .from("scholarships")
    .update({
      content_ar: serializeScholarshipContentAr(contentAr) as Json,
    })
    .eq("id", scholarshipId);

  if (error) {
    console.error("[admin-scholarship-translation] manual update", error);
    return { ok: false, error: "Could not save Arabic content." };
  }

  revalidateScholarshipPaths(scholarshipId);
  return { ok: true };
}
