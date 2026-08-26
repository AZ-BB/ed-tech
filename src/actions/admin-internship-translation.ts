"use server";

import type { Json } from "@/database.types";
import {
  serializeInternshipContentAr,
  type InternshipContentAr,
  type InternshipContentArKey,
} from "@/lib/internship-translatable-fields";
import { translateInternshipById } from "@/lib/translation/translate-internship";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_CONTENT_AR_KEYS = new Set<InternshipContentArKey>([
  "name",
  "provider",
  "locationLabel",
  "field",
  "payLabel",
  "duration",
  "summary",
  "eligibility",
  "howToApply",
  "countryName",
  "whatYoullDo",
  "whatYoullGain",
]);

export type TranslateAdminInternshipResult =
  | { ok: true; translatedCount: number; errors: string[] }
  | { ok: false; error: string };

export type UpdateAdminInternshipArabicContentResult =
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
    console.error("[admin-internship-translation] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage internship translations.",
    };
  }

  return { ok: true as const, userId: user.id };
}

function revalidateInternshipPaths(internshipId: string) {
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/internships/${internshipId}`);
  revalidatePath("/student/internships");
}

function sanitizeContentAr(input: InternshipContentAr): InternshipContentAr {
  const out: InternshipContentAr = {};

  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_CONTENT_AR_KEYS.has(key as InternshipContentArKey)) continue;

    if (key === "whatYoullDo" || key === "whatYoullGain") {
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

export async function translateAdminInternship(
  internshipId: string,
): Promise<TranslateAdminInternshipResult> {
  if (!UUID_RE.test(internshipId)) {
    return { ok: false, error: "Invalid internship id." };
  }

  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const supabase = await createSupabaseSecretClient();
  const result = await translateInternshipById(supabase, internshipId, {
    requestedBy: access.userId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidateInternshipPaths(internshipId);
  return {
    ok: true,
    translatedCount: result.translatedCount,
    errors: result.errors,
  };
}

export async function updateAdminInternshipArabicContent(
  internshipId: string,
  contentArInput: InternshipContentAr,
): Promise<UpdateAdminInternshipArabicContentResult> {
  if (!UUID_RE.test(internshipId)) {
    return { ok: false, error: "Invalid internship id." };
  }

  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const contentAr = sanitizeContentAr(contentArInput);
  const supabase = await createSupabaseSecretClient();

  const { error } = await supabase
    .from("internships")
    .update({
      content_ar: serializeInternshipContentAr(contentAr) as Json,
    })
    .eq("id", internshipId);

  if (error) {
    console.error("[admin-internship-translation] manual update", error);
    return { ok: false, error: "Could not save Arabic content." };
  }

  revalidateInternshipPaths(internshipId);
  return { ok: true };
}
