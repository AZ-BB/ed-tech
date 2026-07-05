import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { fetchApplicationReceivingAdvisor } from "@/lib/advisor-receiving-flags";
import {
  fetchPlatformSettings,
  isPlatformFeatureEnabled,
  PLATFORM_FEATURE_LABELS,
} from "@/lib/platform-settings";
import { loadStudentFormDefaults } from "@/lib/load-student-form-defaults";
import { requireStudentSession } from "@/lib/student-ai-usage-log";

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
  const supabase = await createSupabaseServerClient();
  const auth = await requireStudentSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: plans }, applicationReceivingAdvisor, profileDefaults] = await Promise.all([
    secret
      .from("applications_plans")
      .select("*")
      .eq("is_active", true)
      .order("universities_count", { ascending: true }),
    fetchApplicationReceivingAdvisor(),
    auth.ok ? loadStudentFormDefaults(auth.studentId, user?.email) : Promise.resolve(null),
  ]);

  return (
    <ApplicationSupportClient
      plans={plans ?? []}
      applicationReceivingAdvisor={applicationReceivingAdvisor}
      profileDefaults={profileDefaults}
    />
  );
}
