import { requireStudentSession } from "@/lib/student-ai-usage-log";
import { loadStudentFormDefaults } from "@/lib/load-student-form-defaults";
import {
  fetchPlatformSettings,
  isPlatformFeatureEnabled,
  PLATFORM_FEATURE_LABELS,
} from "@/lib/platform-settings";
import {
  buildCalendlySchedulingPageUrl,
  CALENDLY_INFLUENCER_ADVISOR_URL,
} from "@/lib/calendly-scheduling";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StudentFeatureUnavailable } from "../../../_components/student-feature-unavailable";
import { fetchAdvisorSessionsSharedCalendlyUrl } from "../../_lib/shared-calendly-advisor";
import { BookAdvisorSessionClient } from "./_components/book-advisor-session-client";
import { InfluencerAdvisorBookClient } from "./_components/influencer-advisor-book-client";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export const metadata: Metadata = {
  title: "Book advisor session",
};

type PageProps = { params: Promise<{ advisorId: string }> };

export default async function BookAdvisorSessionPage({ params }: PageProps) {
  const { features } = await fetchPlatformSettings();
  if (!isPlatformFeatureEnabled(features, "advisor_sessions")) {
    return <StudentFeatureUnavailable featureLabel={PLATFORM_FEATURE_LABELS.advisor_sessions} />;
  }

  const auth = await requireStudentSession();
  if (!auth.ok) {
    redirect("/login");
  }

  const { advisorId } = await params;
  if (!isUuid(advisorId)) {
    notFound();
  }

  const secret = await createSupabaseSecretClient();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data }, profileDefaults, sharedCalendlyUrl] = await Promise.all([
    secret
      .from("advisors")
      .select("id, first_name, last_name, title")
      .eq("id", advisorId)
      .eq("is_active", true)
      .maybeSingle(),
    loadStudentFormDefaults(auth.studentId, user?.email),
    fetchAdvisorSessionsSharedCalendlyUrl(secret),
  ]);

  if (!data) {
    notFound();
  }

  if (auth.studentType === "custom") {
    const name = profileDefaults.fullName.trim();
    const email = profileDefaults.email.trim();
    return (
      <InfluencerAdvisorBookClient
        advisorName={`${data.first_name} ${data.last_name}`.trim()}
        calendlyUrl={buildCalendlySchedulingPageUrl({
          base: CALENDLY_INFLUENCER_ADVISOR_URL,
          name,
          email,
          ctxParts: [],
        })}
        prefill={{ name, email }}
      />
    );
  }

  return (
    <BookAdvisorSessionClient
      advisor={{
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        title: data.title,
      }}
      calendlySchedulingUrl={sharedCalendlyUrl}
      profileDefaults={profileDefaults}
    />
  );
}
