import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { fetchApplicationReceivingAdvisor } from "@/lib/advisor-receiving-flags";
import {
  fetchPlatformSettings,
  isPlatformFeatureEnabled,
  PLATFORM_FEATURE_LABELS,
} from "@/lib/platform-settings";

import { ApplicationSupportClient } from "./_components/application-support-client";
import { StudentFeatureUnavailable } from "../_components/student-feature-unavailable";

export const dynamic = "force-dynamic";

export default async function StudentApplicationSupportPage() {
  const { features } = await fetchPlatformSettings();
  if (!isPlatformFeatureEnabled(features, "application_support")) {
    return (
      <StudentFeatureUnavailable featureLabel={PLATFORM_FEATURE_LABELS.application_support} />
    );
  }

  const secret = await createSupabaseSecretClient();
  const [{ data: plans }, applicationReceivingAdvisor] = await Promise.all([
    secret
      .from("applications_plans")
      .select("*")
      .eq("is_active", true)
      .order("universities_count", { ascending: true }),
    fetchApplicationReceivingAdvisor(),
  ]);

  return (
    <ApplicationSupportClient
      plans={plans ?? []}
      applicationReceivingAdvisor={applicationReceivingAdvisor}
    />
  );
}
