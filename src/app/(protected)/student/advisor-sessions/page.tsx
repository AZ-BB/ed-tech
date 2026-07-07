import { requireStudentSession } from "@/lib/student-ai-usage-log";
import {
  fetchPlatformSettings,
  isPlatformFeatureEnabled,
  PLATFORM_FEATURE_LABELS,
} from "@/lib/platform-settings";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StudentFeatureUnavailable } from "../_components/student-feature-unavailable";
import { AdvisorSessionsClient } from "./_components/advisor-sessions-client";
import { mapAdvisorRows, type AdvisorQueryRow } from "./_lib/advisor-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "1:1 Advisor Sessions",
};

export default async function AdvisorSessionsPage() {
  const { features } = await fetchPlatformSettings();
  if (!isPlatformFeatureEnabled(features, "advisor_sessions")) {
    return <StudentFeatureUnavailable featureLabel={PLATFORM_FEATURE_LABELS.advisor_sessions} />;
  }

  const auth = await requireStudentSession();
  if (!auth.ok) {
    redirect("/login");
  }

  // Catalog read uses the secret client so nested embeds are not stripped by
  // per-table RLS (PostgREST can return empty parents when child RLS differs).
  const secret = await createSupabaseSecretClient();

  const [{ data: rows }, { data: countryRows }] = await Promise.all([
    secret
      .from("advisors")
      .select(
        `
        id,
        first_name,
        last_name,
        avatar_url,
        title,
        experience_years,
        languages,
        description,
        best_for,
        session_for,
        about,
        session_coverage,
        questions,
        nationality_country_code,
        calendly_scheduling_url,
        advisor_tags_joint ( advisor_tags ( text ) ),
        advisor_specializations_countries ( country_code )
      `,
      )
      .eq("is_active", true)
      .order("last_name"),
    secret.from("countries").select("id, name").order("name"),
  ]);

  const advisors = mapAdvisorRows((rows ?? []) as AdvisorQueryRow[]);
  const catalogCountries = (countryRows ?? []) as { id: string; name: string }[];

  return <AdvisorSessionsClient initialAdvisors={advisors} catalogCountries={catalogCountries} />;
}
