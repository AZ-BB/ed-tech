"use server";

import type { Json } from "@/database.types";
import {
  serializeWebinarContentAr,
  type WebinarContentAr,
  type WebinarContentArKey,
} from "@/lib/webinar-translatable-fields";
import { translateWebinarById } from "@/lib/translation/translate-webinar";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

const ALLOWED_CONTENT_AR_KEYS = new Set<WebinarContentArKey>([
  "title",
  "description",
  "format",
  "speakerName",
  "speakerTitle",
  "speakerBio",
  "tags",
  "agenda",
]);

export type TranslateAdminWebinarResult =
  | { ok: true; translatedCount: number; errors: string[] }
  | { ok: false; error: string };

export type UpdateAdminWebinarArabicContentResult =
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
    console.error("[admin-webinar-translation] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage webinar translations.",
    };
  }

  return { ok: true as const, userId: user.id };
}

function revalidateWebinarPaths(webinarId: number) {
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/webinars/${webinarId}`);
  revalidatePath("/student/webinars");
  revalidatePath("/ar/webinars");
  revalidatePath("/en/webinars");
}

function sanitizeContentAr(input: WebinarContentAr): WebinarContentAr {
  const out: WebinarContentAr = {};

  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_CONTENT_AR_KEYS.has(key as WebinarContentArKey)) continue;

    if (key === "tags" || key === "agenda") {
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

export async function translateAdminWebinar(
  webinarId: number,
): Promise<TranslateAdminWebinarResult> {
  if (!Number.isFinite(webinarId) || webinarId <= 0) {
    return { ok: false, error: "Invalid webinar id." };
  }

  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const supabase = await createSupabaseSecretClient();
  const result = await translateWebinarById(supabase, webinarId, {
    requestedBy: access.userId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidateWebinarPaths(webinarId);
  return {
    ok: true,
    translatedCount: result.translatedCount,
    errors: result.errors,
  };
}

export async function updateAdminWebinarArabicContent(
  webinarId: number,
  contentArInput: WebinarContentAr,
): Promise<UpdateAdminWebinarArabicContentResult> {
  if (!Number.isFinite(webinarId) || webinarId <= 0) {
    return { ok: false, error: "Invalid webinar id." };
  }

  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const contentAr = sanitizeContentAr(contentArInput);
  const supabase = await createSupabaseSecretClient();

  const { error } = await supabase
    .from("webinars")
    .update({
      content_ar: serializeWebinarContentAr(contentAr) as Json,
    })
    .eq("id", webinarId);

  if (error) {
    console.error("[admin-webinar-translation] manual update", error);
    return { ok: false, error: "Could not save Arabic content." };
  }

  revalidateWebinarPaths(webinarId);
  return { ok: true };
}
