import type { Database } from "@/database.types";
import {
  fetchPlatformSettings,
  PLATFORM_FEATURE_LABELS,
  type AiDailyLimitFeatureKey,
} from "@/lib/platform-settings";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type AiUsageType = Database["public"]["Enums"]["ai_usage_type"];

export type { AiDailyLimitFeatureKey };

export type StudentAiDailyLimitStatus = {
  allowed: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
};

export const AI_DAILY_LIMIT_USAGE_TYPE: Record<AiDailyLimitFeatureKey, AiUsageType> = {
  essay_review: "essay_review",
  ai_university_matching: "matching",
  ai_program_matching: "program_matching",
};

export const AI_DAILY_LIMIT_FEATURE_KEYS: AiDailyLimitFeatureKey[] = [
  "essay_review",
  "ai_university_matching",
  "ai_program_matching",
];

export const AI_DAILY_LIMIT_LABELS: Record<AiDailyLimitFeatureKey, string> = {
  essay_review: PLATFORM_FEATURE_LABELS.essay_review,
  ai_university_matching: PLATFORM_FEATURE_LABELS.ai_university_matching,
  ai_program_matching: PLATFORM_FEATURE_LABELS.ai_program_matching,
};

const USAGE_TYPE_TO_FEATURE_KEY: Record<AiUsageType, AiDailyLimitFeatureKey> = {
  essay_review: "essay_review",
  matching: "ai_university_matching",
  program_matching: "ai_program_matching",
};

export const AI_DAILY_LIMIT_EXCEEDED_CODE = "daily_limit_exceeded";

export const AI_DAILY_LIMIT_EXCEEDED_MESSAGE =
  "You have reached your daily limit for this feature. Try again tomorrow.";

export function buildAiDailyLimitExceededPayload(status: StudentAiDailyLimitStatus) {
  return {
    error: AI_DAILY_LIMIT_EXCEEDED_MESSAGE,
    code: AI_DAILY_LIMIT_EXCEEDED_CODE,
    limit: status.limit,
    used: status.used,
  };
}

export type AiDailyLimitApiError = {
  error?: string;
  code?: string;
  limit?: number | null;
  used?: number;
};

export function isAiDailyLimitExceededResponse(
  data: unknown,
): data is AiDailyLimitApiError & { code: typeof AI_DAILY_LIMIT_EXCEEDED_CODE } {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { code?: string }).code === AI_DAILY_LIMIT_EXCEEDED_CODE
  );
}

export function dailyLimitStatusFromApiPayload(data: AiDailyLimitApiError): StudentAiDailyLimitStatus {
  const limit = typeof data.limit === "number" ? data.limit : null;
  const used = typeof data.used === "number" ? data.used : 0;
  return {
    allowed: false,
    limit,
    used,
    remaining: limit === null ? null : Math.max(0, limit - used),
  };
}

export function getUtcDayStart(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
}

export function featureKeyFromAiUsageType(type: AiUsageType): AiDailyLimitFeatureKey {
  return USAGE_TYPE_TO_FEATURE_KEY[type];
}

export async function getStudentAiUsageCountToday(
  studentId: string,
  type: AiUsageType,
): Promise<number> {
  const secret = await createSupabaseSecretClient();
  const { count, error } = await secret
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("type", type)
    .gte("created_at", getUtcDayStart());

  if (error) {
    console.error("[student-ai-daily-limit] count failed:", {
      message: error.message,
      studentId,
      type,
    });
    return 0;
  }

  return count ?? 0;
}

export async function checkStudentAiDailyLimit(
  studentId: string,
  type: AiUsageType,
): Promise<StudentAiDailyLimitStatus> {
  const featureKey = featureKeyFromAiUsageType(type);
  const settings = await fetchPlatformSettings();
  const limit = settings.aiDailyLimits[featureKey];

  const used = await getStudentAiUsageCountToday(studentId, type);

  if (limit === null) {
    return { allowed: true, limit: null, used, remaining: null };
  }

  const remaining = Math.max(0, limit - used);
  return {
    allowed: used < limit,
    limit,
    used,
    remaining,
  };
}

export async function checkStudentAiDailyLimitByFeature(
  studentId: string,
  featureKey: AiDailyLimitFeatureKey,
): Promise<StudentAiDailyLimitStatus> {
  return checkStudentAiDailyLimit(studentId, AI_DAILY_LIMIT_USAGE_TYPE[featureKey]);
}

export function isAiDailyLimitFeatureKey(value: string): value is AiDailyLimitFeatureKey {
  return (AI_DAILY_LIMIT_FEATURE_KEYS as string[]).includes(value);
}
