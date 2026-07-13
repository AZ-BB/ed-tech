"use server";

import { exportPortableDocument, fetchDiscoverySettings, loadDiscoveryConfig, replaceAllFromImport, saveDiscoveryModule, saveDiscoverySettings } from "@/lib/discovery/discovery-repository";
import { validateModuleConfig, validatePortableDiscoveryDocument } from "@/lib/discovery/validateDiscoveryConfig";
import type {
  DiscoveryModuleConfig,
  DiscoveryScales,
  PortableDiscoveryDocument,
  ScoringRulesConfig,
} from "@/types/discovery";
import type { CombinedProfileConfig } from "@/types/discovery";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

import { ADMIN_DISCOVERY_JOURNEY_HOME } from "@/app/(protected)/admin/content/_data/content-tabs-data";

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function assertAdminAccess(): Promise<
  { ok: true; adminId: string } | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, error: "You must be signed in." };
  }

  const service = await createSupabaseSecretClient();
  const { data: admin, error } = await service
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[admin-discovery-journey] admin lookup", error);
    return { ok: false, error: "Could not verify admin access." };
  }

  if (!admin) {
    return { ok: false, error: "You do not have permission to manage discovery journey." };
  }

  return { ok: true, adminId: admin.id };
}

function revalidateDiscoveryAdmin() {
  revalidatePath(ADMIN_DISCOVERY_JOURNEY_HOME);
}

export async function getAdminDiscoveryJourneyPageData(): Promise<
  ActionResult<{
    config: Awaited<ReturnType<typeof loadDiscoveryConfig>>;
    settings: Awaited<ReturnType<typeof fetchDiscoverySettings>>;
  }>
> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return auth;

  try {
    const service = await createSupabaseSecretClient();
    const [config, settings] = await Promise.all([
      loadDiscoveryConfig(service),
      fetchDiscoverySettings(service),
    ]);
    return { ok: true, data: { config, settings } };
  } catch (error) {
    console.error("[admin-discovery-journey] load", error);
    return { ok: false, error: "Failed to load discovery journey configuration." };
  }
}

export async function saveAdminDiscoveryModule(
  module: DiscoveryModuleConfig,
): Promise<ActionResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return auth;

  const validation = validateModuleConfig(module);
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.errors.map((e) => `${e.path}: ${e.message}`).join("; "),
    };
  }

  try {
    const service = await createSupabaseSecretClient();
    await saveDiscoveryModule(service, module, auth.adminId);
    revalidateDiscoveryAdmin();
    return { ok: true };
  } catch (error) {
    console.error("[admin-discovery-journey] save module", error);
    return { ok: false, error: "Failed to save module." };
  }
}

export async function saveAdminDiscoverySettings(input: {
  scales_json?: DiscoveryScales;
  combined_profiles_json?: CombinedProfileConfig[];
  scoring_rules_json?: ScoringRulesConfig;
}): Promise<ActionResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return auth;

  try {
    const service = await createSupabaseSecretClient();
    await saveDiscoverySettings(service, input, auth.adminId);
    revalidateDiscoveryAdmin();
    return { ok: true };
  } catch (error) {
    console.error("[admin-discovery-journey] save settings", error);
    return { ok: false, error: "Failed to save settings." };
  }
}

export async function exportAdminDiscoveryJourneyJson(): Promise<
  ActionResult<{ json: string; filename: string }>
> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return auth;

  try {
    const service = await createSupabaseSecretClient();
    const document = await exportPortableDocument(service);
    const day = new Date().toISOString().slice(0, 10);
    return {
      ok: true,
      data: {
        json: JSON.stringify(document, null, 2),
        filename: `discovery-journey-config-${day}.json`,
      },
    };
  } catch (error) {
    console.error("[admin-discovery-journey] export", error);
    return { ok: false, error: "Failed to export configuration." };
  }
}

export async function importAdminDiscoveryJourneyJson(
  document: PortableDiscoveryDocument,
): Promise<ActionResult<{ moduleCount: number; version: number }>> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return auth;

  const validation = validatePortableDiscoveryDocument(document);
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.errors.map((e) => `${e.path}: ${e.message}`).join("; "),
    };
  }

  try {
    const service = await createSupabaseSecretClient();
    const settings = await replaceAllFromImport(service, validation.document, auth.adminId);
    revalidateDiscoveryAdmin();
    return {
      ok: true,
      data: { moduleCount: validation.document.tests.length, version: settings.version },
    };
  } catch (error) {
    console.error("[admin-discovery-journey] import", error);
    return { ok: false, error: error instanceof Error ? error.message : "Import failed." };
  }
}

export async function createEmptyAdminDiscoveryModule(input: {
  moduleId: string;
  title: string;
  number: string;
  answerFormat: DiscoveryModuleConfig["answerFormat"];
  sortOrder: number;
}): Promise<ActionResult> {
  const module: DiscoveryModuleConfig = {
    moduleId: input.moduleId,
    title: input.title,
    number: input.number,
    subtitle: null,
    description: null,
    answerFormat: input.answerFormat,
    numItems: 0,
    isActive: true,
    sortOrder: input.sortOrder,
    categories: [],
    questions: [],
    profiles: [],
  };
  return saveAdminDiscoveryModule(module);
}
