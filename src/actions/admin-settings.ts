"use server";

import {
  PLATFORM_SETTING_KEYS,
  type AiDailyLimitFeatureKey,
  type PlatformFeatureKey,
  platformFeatureSettingKey,
} from "@/lib/platform-settings";
import { assertAdminPermission } from "@/lib/assert-admin-permission";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type AdminSettingsActionResult = { ok: true } | { ok: false; error: string };

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
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[admin-settings] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return { ok: false as const, error: "You do not have permission to manage settings." };
  }

  if (admin.is_active === false) {
    return { ok: false as const, error: "Your admin account is inactive." };
  }

  return { ok: true as const, userId: user.id };
}

function parseOptionalNonNegativeInt(raw: FormDataEntryValue | null): number | null | "invalid" {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return n;
}

async function upsertSystemSetting(key: string, value: string): Promise<AdminSettingsActionResult> {
  const service = await createSupabaseSecretClient();
  const now = new Date().toISOString();
  const { error } = await service.from("system").upsert(
    { key, value, updated_at: now },
    { onConflict: "key" },
  );

  if (error) {
    console.error("[admin-settings] upsert", key, error);
    return { ok: false, error: "Could not save settings." };
  }

  return { ok: true };
}

function revalidateSettingsPaths() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/schools");
}

function revalidateAiFeaturePaths() {
  revalidatePath("/student/ai-matching");
  revalidatePath("/student/program-fit-test");
  revalidatePath("/student/essay-review");
}

export async function updatePlatformCreditDefaults(
  formData: FormData,
): Promise<AdminSettingsActionResult> {
  const access = await assertAdminPermission("edit_system_default");
  if (!access.ok) return access;

  const advisor = parseOptionalNonNegativeInt(formData.get("defaultAdvisorCreditLimit"));
  if (advisor === "invalid") {
    return { ok: false, error: "Default advisor credit must be a non-negative number." };
  }

  const ambassador = parseOptionalNonNegativeInt(formData.get("defaultAmbassadorCreditLimit"));
  if (ambassador === "invalid") {
    return { ok: false, error: "Default ambassador credit must be a non-negative number." };
  }

  const advisorResult = await upsertSystemSetting(
    PLATFORM_SETTING_KEYS.defaultAdvisorCreditLimit,
    advisor === null ? "" : String(advisor),
  );
  if (!advisorResult.ok) return advisorResult;

  const ambassadorResult = await upsertSystemSetting(
    PLATFORM_SETTING_KEYS.defaultAmbassadorCreditLimit,
    ambassador === null ? "" : String(ambassador),
  );
  if (!ambassadorResult.ok) return ambassadorResult;

  revalidateSettingsPaths();
  return { ok: true };
}

const AI_DAILY_LIMIT_FORM_FIELDS: { featureKey: AiDailyLimitFeatureKey; formName: string }[] = [
  { featureKey: "essay_review", formName: "aiDailyLimitEssayReview" },
  { featureKey: "ai_university_matching", formName: "aiDailyLimitUniversityMatching" },
  { featureKey: "ai_program_matching", formName: "aiDailyLimitProgramMatching" },
];

const AI_DAILY_LIMIT_SETTING_BY_FEATURE: Record<AiDailyLimitFeatureKey, string> = {
  essay_review: PLATFORM_SETTING_KEYS.aiDailyLimitEssayReview,
  ai_university_matching: PLATFORM_SETTING_KEYS.aiDailyLimitUniversityMatching,
  ai_program_matching: PLATFORM_SETTING_KEYS.aiDailyLimitProgramMatching,
};

export async function updateAiDailyLimits(
  formData: FormData,
): Promise<AdminSettingsActionResult> {
  const access = await assertAdminPermission("edit_system_default");
  if (!access.ok) return access;

  for (const { featureKey, formName } of AI_DAILY_LIMIT_FORM_FIELDS) {
    const parsed = parseOptionalNonNegativeInt(formData.get(formName));
    if (parsed === "invalid") {
      return {
        ok: false,
        error: "AI daily limits must be non-negative numbers or blank for unlimited.",
      };
    }

    const result = await upsertSystemSetting(
      AI_DAILY_LIMIT_SETTING_BY_FEATURE[featureKey],
      parsed === null ? "" : String(parsed),
    );
    if (!result.ok) return result;
  }

  const funnelOverall = parseOptionalNonNegativeInt(
    formData.get("funnelOverallLimitEssayReview"),
  );
  if (funnelOverall === "invalid") {
    return {
      ok: false,
      error: "Funnel overall essay review limit must be a non-negative number or blank for unlimited.",
    };
  }

  const funnelOverallResult = await upsertSystemSetting(
    PLATFORM_SETTING_KEYS.funnelOverallLimitEssayReview,
    funnelOverall === null ? "" : String(funnelOverall),
  );
  if (!funnelOverallResult.ok) return funnelOverallResult;

  revalidateSettingsPaths();
  revalidateAiFeaturePaths();
  return { ok: true };
}

export async function updatePlatformFeatureFlags(
  formData: FormData,
): Promise<AdminSettingsActionResult> {
  const access = await assertAdminPermission("edit_system_features");
  if (!access.ok) return access;

  const featureKeys: PlatformFeatureKey[] = [
    "ai_university_matching",
    "ai_program_matching",
    "essay_review",
    "advisor_sessions",
    "ambassador_booking",
    "application_support",
  ];

  for (const featureKey of featureKeys) {
    const enabled = formData.get(`feature_${featureKey}`) === "on";
    const result = await upsertSystemSetting(
      platformFeatureSettingKey(featureKey),
      enabled ? "true" : "false",
    );
    if (!result.ok) return result;
  }

  revalidatePath("/admin/settings");
  revalidateAiFeaturePaths();
  revalidatePath("/student/advisor-sessions");
  revalidatePath("/student/ambassadors");
  revalidatePath("/student/application-support");
  return { ok: true };
}

export async function fetchAdminSchoolFormDefaults(): Promise<
  | {
      ok: true;
      defaultAdvisorCreditLimit: number | null;
      defaultAmbassadorCreditLimit: number | null;
    }
  | { ok: false; error: string }
> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const service = await createSupabaseSecretClient();
  const { data, error } = await service
    .from("system")
    .select("key, value")
    .in("key", [
      PLATFORM_SETTING_KEYS.defaultAdvisorCreditLimit,
      PLATFORM_SETTING_KEYS.defaultAmbassadorCreditLimit,
    ]);

  if (error) {
    console.error("[admin-settings] fetch defaults", error);
    return { ok: false, error: "Could not load default credits." };
  }

  const byKey = new Map((data ?? []).map((row) => [row.key, row.value]));

  function parseValue(key: string): number | null {
    const raw = byKey.get(key)?.trim() ?? "";
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  return {
    ok: true,
    defaultAdvisorCreditLimit: parseValue(PLATFORM_SETTING_KEYS.defaultAdvisorCreditLimit),
    defaultAmbassadorCreditLimit: parseValue(PLATFORM_SETTING_KEYS.defaultAmbassadorCreditLimit),
  };
}
