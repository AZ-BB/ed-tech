import "server-only";

import { fetchApplicationReceivingAdvisor } from "@/lib/advisor-receiving-flags";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import type { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { StudentApplicationSupportAdvisor } from "./student-application-support-dashboard-types";

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

type AdvisorRow = {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  languages: string | null;
  experience_years: number | null;
  about: string | null;
  avatar_url: string | null;
  session_for: string | null;
  calendly_scheduling_url: string | null;
  advisor_specializations_countries: { country_code: string }[] | null;
};

function formatSpecializationsLabel(codes: string[]): string | null {
  const names = codes
    .map((code) => getCountryNameByAlpha2(code) ?? code)
    .filter(Boolean);
  if (names.length === 0) return null;
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

function mapAdvisorRow(row: AdvisorRow): StudentApplicationSupportAdvisor {
  const countryCodes =
    row.advisor_specializations_countries
      ?.map((entry) => entry.country_code?.trim().toUpperCase())
      .filter((code): code is string => typeof code === "string" && code.length === 2) ??
    [];

  return {
    id: row.id,
    firstName: row.first_name?.trim() ?? "",
    lastName: row.last_name?.trim() ?? "",
    title: row.title?.trim() || null,
    languages: row.languages?.trim() || null,
    experienceYears: row.experience_years,
    about: row.about?.trim() || null,
    avatarUrl: row.avatar_url?.trim() || null,
    sessionFor: row.session_for?.trim() || null,
    specializationsLabel: formatSpecializationsLabel(countryCodes),
    calendlySchedulingUrl: row.calendly_scheduling_url?.trim() || null,
  };
}

async function queryAdvisorById(
  secret: SecretClient,
  advisorId: string,
): Promise<StudentApplicationSupportAdvisor | null> {
  const { data, error } = await secret
    .from("advisors")
    .select(
      `
      id,
      first_name,
      last_name,
      title,
      languages,
      experience_years,
      about,
      avatar_url,
      session_for,
      calendly_scheduling_url,
      advisor_specializations_countries ( country_code )
    `,
    )
    .eq("id", advisorId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[fetchStudentApplicationSupportAdvisor]", error);
    return null;
  }

  if (!data) return null;
  return mapAdvisorRow(data as AdvisorRow);
}

export async function fetchStudentApplicationSupportAdvisor(
  secret: SecretClient,
  assignedTo: string | null | undefined,
): Promise<StudentApplicationSupportAdvisor | null> {
  const assignedAdvisorId = assignedTo?.trim();
  if (assignedAdvisorId) {
    const assigned = await queryAdvisorById(secret, assignedAdvisorId);
    if (assigned) return assigned;
  }

  const receivingAdvisor = await fetchApplicationReceivingAdvisor();
  if (!receivingAdvisor) return null;

  return queryAdvisorById(secret, receivingAdvisor.id);
}
