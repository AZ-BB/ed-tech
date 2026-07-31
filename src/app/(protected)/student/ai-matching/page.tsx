import { AiUniversityMatching } from "./_components/ai-university-matching";
import { StudentFeatureUnavailable } from "../_components/student-feature-unavailable";
import { requireStudentSession } from "@/lib/student-ai-usage-log";
import {
  fetchPlatformSettings,
  isPlatformFeatureEnabled,
  PLATFORM_FEATURE_LABELS,
} from "@/lib/platform-settings";
import { checkStudentAiDailyLimitByFeature } from "@/lib/student-ai-daily-limit";
import { loadAiMatchingProfileDefaults } from "./_lib/load-ai-matching-profile-defaults";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudentAiMatchingPage() {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    redirect("/login");
  }

  const { features } = await fetchPlatformSettings();
  if (!isPlatformFeatureEnabled(features, "ai_university_matching")) {
    return (
      <StudentFeatureUnavailable featureLabel={PLATFORM_FEATURE_LABELS.ai_university_matching} />
    );
  }

  const [profileDefaults, dailyLimitStatus] = await Promise.all([
    loadAiMatchingProfileDefaults(),
    checkStudentAiDailyLimitByFeature(auth.studentId, "ai_university_matching"),
  ]);

  return (
    <AiUniversityMatching
      profileDefaults={profileDefaults}
      dailyLimitStatus={dailyLimitStatus}
    />
  );
}
