import { createSupabaseSecretClient } from "@/utils/supabase-server";

export const PLATFORM_SETTING_KEYS = {
  defaultAdvisorCreditLimit: "default_advisor_credit_limit",
  defaultAmbassadorCreditLimit: "default_ambassador_credit_limit",
  featureAiUniversityMatching: "feature_ai_university_matching",
  featureAiProgramMatching: "feature_ai_program_matching",
  featureEssayReview: "feature_essay_review",
  featureAdvisorSessions: "feature_advisor_sessions",
  featureAmbassadorBooking: "feature_ambassador_booking",
  featureApplicationSupport: "feature_application_support",
} as const;

export type PlatformFeatureKey =
  | "ai_university_matching"
  | "ai_program_matching"
  | "essay_review"
  | "advisor_sessions"
  | "ambassador_booking"
  | "application_support";

export const PLATFORM_FEATURE_LABELS: Record<PlatformFeatureKey, string> = {
  ai_university_matching: "AI University Matching",
  ai_program_matching: "AI Program Matching",
  essay_review: "Essay Review",
  advisor_sessions: "Advisor Sessions",
  ambassador_booking: "Ambassador Booking",
  application_support: "Application Support",
};

const FEATURE_KEY_TO_SETTING: Record<PlatformFeatureKey, string> = {
  ai_university_matching: PLATFORM_SETTING_KEYS.featureAiUniversityMatching,
  ai_program_matching: PLATFORM_SETTING_KEYS.featureAiProgramMatching,
  essay_review: PLATFORM_SETTING_KEYS.featureEssayReview,
  advisor_sessions: PLATFORM_SETTING_KEYS.featureAdvisorSessions,
  ambassador_booking: PLATFORM_SETTING_KEYS.featureAmbassadorBooking,
  application_support: PLATFORM_SETTING_KEYS.featureApplicationSupport,
};

export const PLATFORM_FEATURE_UNAVAILABLE_MESSAGE =
  "This service is currently unavailable.";

export type PlatformSettings = {
  defaultAdvisorCreditLimit: number | null;
  defaultAmbassadorCreditLimit: number | null;
  features: Record<PlatformFeatureKey, boolean>;
};

function parseOptionalNonNegativeInt(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseBooleanSetting(value: string | undefined, fallback = true): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return fallback;
}

function buildSettingsFromRows(rows: { key: string; value: string }[]): PlatformSettings {
  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  return {
    defaultAdvisorCreditLimit: parseOptionalNonNegativeInt(
      byKey.get(PLATFORM_SETTING_KEYS.defaultAdvisorCreditLimit),
    ),
    defaultAmbassadorCreditLimit: parseOptionalNonNegativeInt(
      byKey.get(PLATFORM_SETTING_KEYS.defaultAmbassadorCreditLimit),
    ),
    features: {
      ai_university_matching: parseBooleanSetting(
        byKey.get(PLATFORM_SETTING_KEYS.featureAiUniversityMatching),
      ),
      ai_program_matching: parseBooleanSetting(
        byKey.get(PLATFORM_SETTING_KEYS.featureAiProgramMatching),
      ),
      essay_review: parseBooleanSetting(byKey.get(PLATFORM_SETTING_KEYS.featureEssayReview)),
      advisor_sessions: parseBooleanSetting(
        byKey.get(PLATFORM_SETTING_KEYS.featureAdvisorSessions),
      ),
      ambassador_booking: parseBooleanSetting(
        byKey.get(PLATFORM_SETTING_KEYS.featureAmbassadorBooking),
      ),
      application_support: parseBooleanSetting(
        byKey.get(PLATFORM_SETTING_KEYS.featureApplicationSupport),
      ),
    },
  };
}

export function isPlatformFeatureEnabled(
  features: Record<PlatformFeatureKey, boolean>,
  key: PlatformFeatureKey,
): boolean {
  return features[key] !== false;
}

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  const service = await createSupabaseSecretClient();
  const { data, error } = await service.from("system").select("key, value");

  if (error) {
    console.error("[platform-settings] fetch", error);
    return buildSettingsFromRows([]);
  }

  return buildSettingsFromRows(data ?? []);
}

export async function isPlatformFeatureEnabledByKey(
  key: PlatformFeatureKey,
): Promise<boolean> {
  const settings = await fetchPlatformSettings();
  return isPlatformFeatureEnabled(settings.features, key);
}

export function platformFeatureSettingKey(key: PlatformFeatureKey): string {
  return FEATURE_KEY_TO_SETTING[key];
}
