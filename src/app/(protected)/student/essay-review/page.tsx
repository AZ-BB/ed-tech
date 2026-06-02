import { EssayReviewClient } from "./_components/essay-review-client";
import { StudentFeatureUnavailable } from "../_components/student-feature-unavailable";
import {
  fetchPlatformSettings,
  isPlatformFeatureEnabled,
  PLATFORM_FEATURE_LABELS,
} from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

export default async function StudentEssayReviewPage() {
  const { features } = await fetchPlatformSettings();
  if (!isPlatformFeatureEnabled(features, "essay_review")) {
    return <StudentFeatureUnavailable featureLabel={PLATFORM_FEATURE_LABELS.essay_review} />;
  }

  return <EssayReviewClient />;
}
