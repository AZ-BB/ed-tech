import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { fetchApplicationReceivingAdvisor } from "@/lib/advisor-receiving-flags";
import {
  fetchPlatformSettings,
  isPlatformFeatureEnabled,
  PLATFORM_FEATURE_LABELS,
} from "@/lib/platform-settings";
import { loadStudentFormDefaults } from "@/lib/load-student-form-defaults";
import { requireStudentSession } from "@/lib/student-ai-usage-log";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ApplicationSupportClient } from "./_components/application-support-client";
import { ApplicationSupportStatusView } from "./_components/application-support-status-view";
import { StudentApplicationSupportDashboard } from "./_components/student-application-support-dashboard";
import { fetchStudentApplicationSupportView } from "./_lib/fetch-student-application-support-view";
import { StudentFeatureUnavailable } from "../_components/student-feature-unavailable";

export const dynamic = "force-dynamic";

export default async function StudentApplicationSupportPage() {
  const { features } = await fetchPlatformSettings();
  if (!isPlatformFeatureEnabled(features, "application_support")) {
    return (
      <StudentFeatureUnavailable featureLabel={PLATFORM_FEATURE_LABELS.application_support} />
    );
  }

  const auth = await requireStudentSession();
  if (!auth.ok) {
    redirect("/login");
  }

  const secret = await createSupabaseSecretClient();
  const view = await fetchStudentApplicationSupportView(secret, auth.studentId);

  if (view.kind === "dashboard") {
    return (
      <Suspense fallback={null}>
        <StudentApplicationSupportDashboard initial={view.payload} />
      </Suspense>
    );
  }

  if (
    view.kind === "scheduled" ||
    view.kind === "payment_pending" ||
    view.kind === "awaiting_review"
  ) {
    return <ApplicationSupportStatusView {...view} />;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: plans }, applicationReceivingAdvisor, profileDefaults] =
    await Promise.all([
      secret
        .from("applications_plans")
        .select("*")
        .eq("is_active", true)
        .order("universities_count", { ascending: true }),
      fetchApplicationReceivingAdvisor(),
      loadStudentFormDefaults(auth.studentId, user?.email),
    ]);

  return (
    <ApplicationSupportClient
      plans={plans ?? []}
      applicationReceivingAdvisor={applicationReceivingAdvisor}
      profileDefaults={profileDefaults}
    />
  );
}
