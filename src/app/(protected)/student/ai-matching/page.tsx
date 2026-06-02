import { AiUniversityMatching } from "./_components/ai-university-matching";
import { StudentFeatureUnavailable } from "../_components/student-feature-unavailable";
import {
  fetchPlatformSettings,
  isPlatformFeatureEnabled,
  PLATFORM_FEATURE_LABELS,
} from "@/lib/platform-settings";
import { loadAiMatchingProfileDefaults } from "./_lib/load-ai-matching-profile-defaults";

export const dynamic = "force-dynamic";

export default async function StudentAiMatchingPage() {
  const { features } = await fetchPlatformSettings();
  if (!isPlatformFeatureEnabled(features, "ai_university_matching")) {
    return (
      <StudentFeatureUnavailable featureLabel={PLATFORM_FEATURE_LABELS.ai_university_matching} />
    );
  }

  const profileDefaults = await loadAiMatchingProfileDefaults();
  return <AiUniversityMatching profileDefaults={profileDefaults} />;
}
