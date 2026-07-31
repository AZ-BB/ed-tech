import { fetchPlatformSettings } from "@/lib/platform-settings";
import {
  requiresFunnelSubscription,
  type StudentSubscriptionSnapshot,
} from "@/lib/student-subscription";
import type { StudentAiDailyLimitStatus } from "@/lib/student-ai-daily-limit";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export const FUNNEL_OVERALL_LIMIT_EXCEEDED_CODE = "funnel_overall_limit_exceeded";

export const FUNNEL_OVERALL_LIMIT_EXCEEDED_MESSAGE =
  "You have used all of your free Essay Review runs. Subscribe to unlock unlimited access.";

export function buildFunnelOverallLimitExceededPayload(status: StudentAiDailyLimitStatus) {
  return {
    error: FUNNEL_OVERALL_LIMIT_EXCEEDED_MESSAGE,
    code: FUNNEL_OVERALL_LIMIT_EXCEEDED_CODE,
    limit: status.limit,
    used: status.used,
  };
}

export function isFunnelOverallLimitExceededResponse(
  data: unknown,
): data is { code: typeof FUNNEL_OVERALL_LIMIT_EXCEEDED_CODE; limit?: number | null; used?: number } {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { code?: string }).code === FUNNEL_OVERALL_LIMIT_EXCEEDED_CODE
  );
}

export function funnelOverallLimitStatusFromApiPayload(data: {
  limit?: number | null;
  used?: number;
}): StudentAiDailyLimitStatus {
  const limit = typeof data.limit === "number" ? data.limit : null;
  const used = typeof data.used === "number" ? data.used : 0;
  return {
    allowed: false,
    limit,
    used,
    remaining: limit === null ? null : Math.max(0, limit - used),
  };
}

export async function getStudentEssayReviewUsageTotal(studentId: string): Promise<number> {
  const secret = await createSupabaseSecretClient();
  const { count, error } = await secret
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("type", "essay_review");

  if (error) {
    console.error("[student-ai-funnel-overall-limit] count failed:", {
      message: error.message,
      studentId,
    });
    return 0;
  }

  return count ?? 0;
}

export async function checkFunnelOverallEssayReviewLimit(
  studentId: string,
  snapshot: Pick<StudentSubscriptionSnapshot, "studentType" | "subscriptionStatus">,
): Promise<StudentAiDailyLimitStatus> {
  const used = await getStudentEssayReviewUsageTotal(studentId);

  if (!requiresFunnelSubscription(snapshot)) {
    return { allowed: true, limit: null, used, remaining: null };
  }

  const settings = await fetchPlatformSettings();
  const limit = settings.funnelOverallLimitEssayReview;

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
