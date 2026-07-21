import { assertAdvisorAccess } from "@/lib/advisor-access";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

function jsonArrayToMultiline(raw: unknown): string {
  if (!raw) return "";
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

export type AdvisorSettingsPagePayload = {
  authEmail: string;
  profileEmail: string;
  calendlyConnected: boolean;
  calendlyConnectedAt: string | null;
  calendlyWebhookActive: boolean;
  defaults: {
    firstName: string;
    lastName: string;
    phone: string;
    title: string;
    languages: string;
    experienceYears: string;
    nationalityCountryCode: string;
    specializationCountryCodes: string[];
    description: string;
    bestFor: string;
    sessionFor: string;
    sessionCoverage: string;
    about: string;
    questions: string;
    tags: string;
    avatarUrl: string | null;
  };
  countries: { id: string; name: string }[];
};

export async function fetchAdvisorSettingsPage(): Promise<AdvisorSettingsPagePayload | null> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const authEmail = user?.email?.trim() ?? access.email;

  const service = await createSupabaseSecretClient();

  const [
    { data: advisor, error: advisorError },
    { data: tagRows, error: tagError },
    { data: specRows, error: specError },
    { data: countries, error: countriesError },
  ] = await Promise.all([
    service
      .from("advisors")
      .select(
        `id, email, first_name, last_name, phone, title, languages, experience_years,
        nationality_country_code, description, best_for, session_for, session_coverage,
        about, questions, avatar_url, calendly_refresh_token, calendly_connected_at, calendly_webhook_subscription_uri`,
      )
      .eq("id", access.advisorId)
      .maybeSingle(),
    service
      .from("advisor_tags_joint")
      .select("advisor_tags(text)")
      .eq("advisor_id", access.advisorId),
    service
      .from("advisor_specializations_countries")
      .select("country_code")
      .eq("advisor_id", access.advisorId),
    service.from("countries").select("id, name").order("name"),
  ]);

  if (advisorError || !advisor) {
    console.error("[fetchAdvisorSettingsPage] advisor", advisorError);
    return null;
  }

  if (tagError) console.error("[fetchAdvisorSettingsPage] tags", tagError);
  if (specError) console.error("[fetchAdvisorSettingsPage] specs", specError);
  if (countriesError) console.error("[fetchAdvisorSettingsPage] countries", countriesError);

  const tags: string[] = [];
  for (const row of tagRows ?? []) {
    const tag = row.advisor_tags;
    if (tag && typeof tag === "object" && !Array.isArray(tag) && "text" in tag) {
      const text = (tag as { text: string }).text?.trim();
      if (text) tags.push(text);
    } else if (Array.isArray(tag)) {
      for (const t of tag) {
        const text = t?.text?.trim();
        if (text) tags.push(text);
      }
    }
  }

  const specializationCountryCodes = (specRows ?? [])
    .map((row) => row.country_code?.trim().toUpperCase())
    .filter(Boolean) as string[];

  return {
    authEmail,
    profileEmail: advisor.email?.trim() || authEmail,
    calendlyConnected: Boolean(advisor.calendly_refresh_token?.trim()),
    calendlyConnectedAt: advisor.calendly_connected_at?.trim() || null,
    calendlyWebhookActive: Boolean(advisor.calendly_webhook_subscription_uri?.trim()),
    defaults: {
      firstName: advisor.first_name ?? "",
      lastName: advisor.last_name ?? "",
      phone: advisor.phone?.trim() ?? "",
      title: advisor.title?.trim() ?? "",
      languages: advisor.languages?.trim() ?? "",
      experienceYears:
        advisor.experience_years != null ? String(advisor.experience_years) : "",
      nationalityCountryCode: advisor.nationality_country_code ?? "",
      specializationCountryCodes,
      description: advisor.description?.trim() ?? "",
      bestFor: advisor.best_for?.trim() ?? "",
      sessionFor: advisor.session_for?.trim() ?? "",
      sessionCoverage: jsonArrayToMultiline(advisor.session_coverage),
      about: advisor.about?.trim() ?? "",
      questions: jsonArrayToMultiline(advisor.questions),
      tags: tags.join(", "),
      avatarUrl: advisor.avatar_url?.trim() || null,
    },
    countries: (countries ?? []) as { id: string; name: string }[],
  };
}
