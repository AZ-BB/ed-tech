import type { Json } from "@/database.types";
import type { createSupabaseServerClient } from "@/utils/supabase-server";

export type StudentRouteSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Keys stored in `student_profiles.platform_completion` (boolean flags, once per student). */
export const STUDENT_PLATFORM_COMPLETION_FLAGS = {
    viewed_universities: "viewed_universities",
    viewed_ai_matching: "viewed_ai_matching",
    viewed_essay_review: "viewed_essay_review",
    viewed_advisor_sessions: "viewed_advisor_sessions",
    viewed_ambassadors: "viewed_ambassadors",
    viewed_application_support: "viewed_application_support",
    viewed_scholarships: "viewed_scholarships",
} as const;

export function hasPlatformCompletionFlag(pc: Json | null, flagKey: string): boolean {
    if (pc == null || typeof pc !== "object" || Array.isArray(pc)) return false;
    return (pc as Record<string, unknown>)[flagKey] === true;
}

const PLATFORM_FEATURE_FLAG_KEYS = Object.values(STUDENT_PLATFORM_COMPLETION_FLAGS);

export function getPlatformCompletionStats(pc: Json | null): {
    completed: number;
    total: number;
    percent: number;
} {
    const total = PLATFORM_FEATURE_FLAG_KEYS.length;
    const completed = PLATFORM_FEATURE_FLAG_KEYS.filter((key) =>
        hasPlatformCompletionFlag(pc, key),
    ).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { completed, total, percent };
}

export function mergePlatformCompletionFlag(
    existing: Json | null,
    flagKey: string,
    value: boolean = true,
): Json {
    const base =
        existing && typeof existing === "object" && !Array.isArray(existing)
            ? { ...(existing as Record<string, Json>) }
            : {};
    return { ...base, [flagKey]: value };
}

/** Idempotent: skips update if `flagKey` is already `true` in `platform_completion`. */
export async function recordStudentPlatformCompletionOnce(
    supabase: StudentRouteSupabase,
    userId: string,
    flagKey: string,
): Promise<void> {
    const { data: profile, error: fetchError } = await supabase
        .from("student_profiles")
        .select("platform_completion")
        .eq("id", userId)
        .maybeSingle();
    if (fetchError) {
        console.error(fetchError);
        return;
    }
    if (hasPlatformCompletionFlag(profile?.platform_completion ?? null, flagKey)) {
        return;
    }
    const { error: updateError } = await supabase
        .from("student_profiles")
        .update({
            platform_completion: mergePlatformCompletionFlag(profile?.platform_completion ?? null, flagKey),
        })
        .eq("id", userId);
    if (updateError) {
        console.error(updateError);
    }
}
