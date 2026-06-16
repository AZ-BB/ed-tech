import { getCountryNameByAlpha2 } from "@/lib/countries";
import { findAuthUserByEmail } from "@/lib/auth-user-lookup";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { formatDistanceToNow } from "date-fns";

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

export type AdminAdvisorDetailPayload = {
  advisor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    title: string | null;
    languages: string | null;
    experienceYears: number | null;
    nationalityCountryCode: string;
    nationalityName: string;
    specializationsLabel: string;
    tagsLabel: string;
    description: string | null;
    bestFor: string | null;
    sessionFor: string | null;
    sessionCoverage: string;
    about: string | null;
    questions: string;
    tags: string;
    avatarUrl: string | null;
    isActive: boolean;
    payoutPercentage: number;
    loginCredentialsSent: boolean;
    joinedLabel: string;
    lastLoggedInLabel: string;
    lastSessionLabel: string;
    specializationCountryCodes: string[];
  };
};

function formatJoined(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatLastLoggedIn(iso: string | null | undefined): string {
  if (!iso) return "Never";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Never";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "Never";
  }
}

function formatLastActive(iso: string | null | undefined): string {
  if (!iso) return "No sessions yet";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "No sessions yet";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "No sessions yet";
  }
}

function formatCountryCodes(codes: string[]): string {
  const names = codes
    .map((code) => getCountryNameByAlpha2(code.trim().toUpperCase()) ?? code.trim().toUpperCase())
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : "—";
}

async function assertAdminAccess() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) return false;

  const secret = await createSupabaseSecretClient();
  const { data: admin } = await secret
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return Boolean(admin);
}

export async function fetchAdminAdvisorDetail(
  advisorId: string,
): Promise<AdminAdvisorDetailPayload | null> {
  const isAdmin = await assertAdminAccess();
  if (!isAdmin) return null;

  const secret = await createSupabaseSecretClient();

  const { data: row, error } = await secret
    .from("advisors")
    .select(
      `
      id,
      first_name,
      last_name,
      email,
      phone,
      title,
      languages,
      experience_years,
      nationality_country_code,
      description,
      best_for,
      session_for,
      session_coverage,
      about,
      questions,
      avatar_url,
      is_active,
      payout_percentage,
      created_at,
      countries!advisors_nationality_country_code_fkey ( name ),
      advisor_tags_joint ( advisor_tags ( text ) ),
      advisor_specializations_countries ( country_code )
    `,
    )
    .eq("id", advisorId)
    .maybeSingle();

  if (error || !row) {
    console.error("[fetchAdminAdvisorDetail]", error);
    return null;
  }

  const { data: latestSession } = await secret
    .from("advisor_sessions")
    .select("created_at")
    .eq("advisor_id", advisorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const tags =
    row.advisor_tags_joint
      ?.map((joint) => {
        const embed = joint.advisor_tags as { text?: string } | { text?: string }[] | null;
        const tag = Array.isArray(embed) ? embed[0] : embed;
        return tag?.text?.trim();
      })
      .filter((tag): tag is string => Boolean(tag)) ?? [];

  const specializationCountryCodes =
    row.advisor_specializations_countries
      ?.map((entry) => entry.country_code?.trim().toUpperCase())
      .filter((code): code is string => Boolean(code)) ?? [];

  const countriesEmbed = row.countries as { name?: string } | { name?: string }[] | null;
  const nationalityName = Array.isArray(countriesEmbed)
    ? countriesEmbed[0]?.name?.trim() ?? "—"
    : countriesEmbed?.name?.trim() ?? "—";

  const advisorEmail = row.email?.trim().toLowerCase() ?? "";
  const authLookup = advisorEmail
    ? await findAuthUserByEmail(secret, advisorEmail)
    : { user: null, error: null };
  const authUser = authLookup.user;
  const authMeta = authUser?.user_metadata as { type?: string } | undefined;
  const loginCredentialsSent = authMeta?.type === "advisor";
  const lastLoggedInLabel = formatLastLoggedIn(
    loginCredentialsSent ? authUser?.last_sign_in_at : null,
  );

  return {
    advisor: {
      id: row.id,
      firstName: row.first_name?.trim() ?? "",
      lastName: row.last_name?.trim() ?? "",
      email: row.email?.trim() ?? "",
      phone: row.phone?.trim() || null,
      title: row.title?.trim() || null,
      languages: row.languages?.trim() || null,
      experienceYears: row.experience_years,
      nationalityCountryCode: row.nationality_country_code?.trim().toUpperCase() ?? "",
      nationalityName,
      specializationsLabel: formatCountryCodes(specializationCountryCodes),
      tagsLabel: tags.length > 0 ? tags.join(", ") : "—",
      description: row.description?.trim() || null,
      bestFor: row.best_for?.trim() || null,
      sessionFor: row.session_for?.trim() || null,
      sessionCoverage: jsonArrayToMultiline(row.session_coverage),
      about: row.about?.trim() || null,
      questions: jsonArrayToMultiline(row.questions),
      tags: tags.join(", "),
      avatarUrl: row.avatar_url?.trim() || null,
      isActive: row.is_active,
      payoutPercentage: row.payout_percentage ?? 0,
      loginCredentialsSent,
      joinedLabel: formatJoined(row.created_at),
      lastLoggedInLabel,
      lastSessionLabel: formatLastActive(latestSession?.created_at),
      specializationCountryCodes,
    },
  };
}
