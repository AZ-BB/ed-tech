"use server";

import { ADMIN_DISCOVERY_JOURNEY_HOME } from "@/app/(protected)/admin/content/_data/content-tabs-data";
import {
  sanitizeDiscoveryModuleContentAr,
  sanitizeDiscoverySettingsContentAr,
  serializeDiscoveryContentArMeta,
  serializeDiscoveryModuleContentAr,
  serializeDiscoverySettingsContentAr,
  type DiscoveryModuleContentAr,
  type DiscoverySettingsContentAr,
} from "@/lib/discovery-translatable-fields";
import { translateDiscoveryModuleById } from "@/lib/translation/translate-discovery-module";
import { translateDiscoverySettings } from "@/lib/translation/translate-discovery-settings";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

export type TranslateAdminDiscoveryModuleResult =
  | { ok: true; translatedCount: number; errors: string[] }
  | { ok: false; error: string };

export type UpdateAdminDiscoveryModuleArabicContentResult =
  | { ok: true }
  | { ok: false; error: string };

export type TranslateAdminDiscoverySettingsResult =
  | { ok: true; translatedCount: number; errors: string[] }
  | { ok: false; error: string };

export type UpdateAdminDiscoverySettingsArabicContentResult =
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
    console.error("[admin-discovery-journey-translation] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage discovery journey translations.",
    };
  }

  return { ok: true as const, userId: user.id };
}

function revalidateDiscoveryPaths() {
  revalidatePath(ADMIN_DISCOVERY_JOURNEY_HOME);
  revalidatePath("/student/discovery-journey");
}

export async function translateAdminDiscoveryModule(
  moduleId: string,
): Promise<TranslateAdminDiscoveryModuleResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return auth;

  const service = await createSupabaseSecretClient();
  const result = await translateDiscoveryModuleById(service, moduleId, {
    requestedBy: auth.userId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidateDiscoveryPaths();
  return { ok: true, translatedCount: result.translatedCount, errors: result.errors };
}

export async function translateAdminDiscoverySettings(): Promise<TranslateAdminDiscoverySettingsResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return auth;

  const service = await createSupabaseSecretClient();
  const result = await translateDiscoverySettings(service, { requestedBy: auth.userId });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidateDiscoveryPaths();
  return { ok: true, translatedCount: result.translatedCount, errors: result.errors };
}

export async function updateAdminDiscoveryModuleArabicContent(
  moduleId: string,
  contentArInput: DiscoveryModuleContentAr,
): Promise<UpdateAdminDiscoveryModuleArabicContentResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return auth;

  const trimmedId = moduleId?.trim();
  if (!trimmedId) {
    return { ok: false, error: "Invalid module id." };
  }

  const contentAr = sanitizeDiscoveryModuleContentAr(contentArInput);
  const service = await createSupabaseSecretClient();

  const { error } = await service
    .from("discovery_modules")
    .update({ content_ar: serializeDiscoveryModuleContentAr(contentAr) })
    .eq("id", trimmedId);

  if (error) {
    console.error("[admin-discovery-journey-translation] update module ar", error);
    return { ok: false, error: "Could not save Arabic content." };
  }

  revalidateDiscoveryPaths();
  return { ok: true };
}

export async function updateAdminDiscoverySettingsArabicContent(
  contentArInput: DiscoverySettingsContentAr,
): Promise<UpdateAdminDiscoverySettingsArabicContentResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return auth;

  const contentAr = sanitizeDiscoverySettingsContentAr(contentArInput);
  const service = await createSupabaseSecretClient();

  const { error } = await service
    .from("discovery_settings")
    .update({ content_ar: serializeDiscoverySettingsContentAr(contentAr) })
    .eq("id", "default");

  if (error) {
    console.error("[admin-discovery-journey-translation] update settings ar", error);
    return { ok: false, error: "Could not save Arabic settings content." };
  }

  revalidateDiscoveryPaths();
  return { ok: true };
}

export async function updateAdminDiscoveryModuleArabicContentWithMeta(
  moduleId: string,
  contentArInput: DiscoveryModuleContentAr,
  metaInput: { translated_at: string; field_hashes: Record<string, string> },
): Promise<UpdateAdminDiscoveryModuleArabicContentResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return auth;

  const trimmedId = moduleId?.trim();
  if (!trimmedId) {
    return { ok: false, error: "Invalid module id." };
  }

  const contentAr = sanitizeDiscoveryModuleContentAr(contentArInput);
  const service = await createSupabaseSecretClient();

  const { error } = await service
    .from("discovery_modules")
    .update({
      content_ar: serializeDiscoveryModuleContentAr(contentAr),
      content_ar_meta: serializeDiscoveryContentArMeta(metaInput),
    })
    .eq("id", trimmedId);

  if (error) {
    console.error("[admin-discovery-journey-translation] update module ar+meta", error);
    return { ok: false, error: "Could not save Arabic content." };
  }

  revalidateDiscoveryPaths();
  return { ok: true };
}
