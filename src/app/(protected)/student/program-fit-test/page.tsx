import { requireStudentSession } from "@/lib/student-ai-usage-log";
import {
  fetchPlatformSettings,
  isPlatformFeatureEnabled,
  PLATFORM_FEATURE_LABELS,
} from "@/lib/platform-settings";
import { checkStudentAiDailyLimitByFeature } from "@/lib/student-ai-daily-limit";
import { requiresFunnelSubscription } from "@/lib/student-subscription";
import { redirect } from "next/navigation";
import { StudentFeatureUnavailable } from "../_components/student-feature-unavailable";
import { AiProgramFitTest } from "./_components/ai-program-fit-test";

export const dynamic = "force-dynamic";

export default async function StudentProgramFitTestPage() {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    redirect("/login");
  }

  if (requiresFunnelSubscription(auth)) {
    redirect("/student/programs?subscribe=1");
  }

  const { features } = await fetchPlatformSettings();
  if (!isPlatformFeatureEnabled(features, "ai_program_matching")) {
    return (
      <StudentFeatureUnavailable
        featureLabel={PLATFORM_FEATURE_LABELS.ai_program_matching}
      />
    );
  }

  const dailyLimitStatus = await checkStudentAiDailyLimitByFeature(
    auth.studentId,
    "ai_program_matching",
  );

  return <AiProgramFitTest dailyLimitStatus={dailyLimitStatus} />;
}
