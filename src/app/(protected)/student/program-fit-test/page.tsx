import { AiProgramFitTest } from "./_components/ai-program-fit-test";
import { StudentFeatureUnavailable } from "../_components/student-feature-unavailable";
import {
  fetchPlatformSettings,
  isPlatformFeatureEnabled,
  PLATFORM_FEATURE_LABELS,
} from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

export default async function StudentProgramFitTestPage() {
  const { features } = await fetchPlatformSettings();
  if (!isPlatformFeatureEnabled(features, "ai_program_matching")) {
    return (
      <StudentFeatureUnavailable
        featureLabel={PLATFORM_FEATURE_LABELS.ai_program_matching}
      />
    );
  }

  return <AiProgramFitTest />;
}
