import { EssayReviewClient } from "./_components/essay-review-client";
import { StudentFeatureUnavailable } from "../_components/student-feature-unavailable";
import { requireStudentSession } from "@/lib/student-ai-usage-log";
import {
  fetchPlatformSettings,
  isPlatformFeatureEnabled,
  PLATFORM_FEATURE_LABELS,
} from "@/lib/platform-settings";
import { checkStudentAiDailyLimitByFeature } from "@/lib/student-ai-daily-limit";
import { checkFunnelOverallEssayReviewLimit } from "@/lib/student-ai-funnel-overall-limit";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudentEssayReviewPage() {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    redirect("/login");
  }

  const { features } = await fetchPlatformSettings();
  if (!isPlatformFeatureEnabled(features, "essay_review")) {
    return <StudentFeatureUnavailable featureLabel={PLATFORM_FEATURE_LABELS.essay_review} />;
  }

  const [dailyLimitStatus, funnelOverallLimitStatus] = await Promise.all([
    checkStudentAiDailyLimitByFeature(auth.studentId, "essay_review"),
    checkFunnelOverallEssayReviewLimit(auth.studentId, auth),
  ]);

  return (
    <EssayReviewClient
      dailyLimitStatus={dailyLimitStatus}
      funnelOverallLimitStatus={funnelOverallLimitStatus}
    />
  );
}
