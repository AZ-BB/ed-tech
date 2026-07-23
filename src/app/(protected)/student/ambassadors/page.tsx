import type { StudentContactDefaults } from "./_components/request-specific-ambassador-modal";
import { requireStudentSession } from "@/lib/student-ai-usage-log";
import {
  fetchPlatformSettings,
  isPlatformFeatureEnabled,
  PLATFORM_FEATURE_LABELS,
} from "@/lib/platform-settings";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StudentFeatureUnavailable } from "../_components/student-feature-unavailable";
import { AmbassadorsClient } from "./_components/ambassadors-client";
import { mapAmbassadorRows, type AmbassadorQueryRow } from "./_lib/ambassador-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "University Ambassadors",
};

const AMBASSADOR_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseOpenAmbassadorId(
  sp: Record<string, string | string[] | undefined>,
): string | undefined {
  const raw =
    typeof sp.ambassador === "string"
      ? sp.ambassador
      : Array.isArray(sp.ambassador)
        ? sp.ambassador[0]
        : undefined;
  const id = raw?.trim();
  if (!id || !AMBASSADOR_UUID_RE.test(id)) return undefined;
  return id;
}

function parseSubscribePrompt(
  sp: Record<string, string | string[] | undefined>,
): boolean {
  const raw =
    typeof sp.subscribe === "string"
      ? sp.subscribe
      : Array.isArray(sp.subscribe)
        ? sp.subscribe[0]
        : undefined;
  return raw === "1";
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AmbassadorsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const openAmbassadorId = parseOpenAmbassadorId(sp);
  const openSubscribeModal = parseSubscribePrompt(sp);
  const { features } = await fetchPlatformSettings();
  if (!isPlatformFeatureEnabled(features, "ambassador_booking")) {
    return <StudentFeatureUnavailable featureLabel={PLATFORM_FEATURE_LABELS.ambassador_booking} />;
  }

  const auth = await requireStudentSession();
  if (!auth.ok) {
    redirect("/login");
  }

  const secret = await createSupabaseSecretClient();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: rows }, { data: countryRows }, { data: studentProfile }] = await Promise.all([
    secret
      .from("ambassadors")
      .select(
        `
        id,
        first_name,
        last_name,
        email,
        avatar_url,
        start_year,
        graduation_year,
        is_current_student,
        destination_country_code,
        nationality_country_code,
        university_id,
        university_name,
        major,
        about,
        help_in,
        ambassador_tags_joint ( ambassador_tags ( text ) ),
        universities ( name )
      `,
      )
      .eq("is_active", true)
      .order("last_name"),
    secret.from("countries").select("id, name").order("name"),
    secret
      .from("student_profiles")
      .select("first_name, last_name, email, phone")
      .eq("id", auth.studentId)
      .maybeSingle(),
  ]);

  const ambassadors = mapAmbassadorRows((rows ?? []) as AmbassadorQueryRow[]);
  const catalogCountries = (countryRows ?? []) as { id: string; name: string }[];

  const fullName = [studentProfile?.first_name, studentProfile?.last_name]
    .filter((p) => typeof p === "string" && p.trim().length > 0)
    .join(" ")
    .trim();
  const studentDefaults: StudentContactDefaults | undefined =
    fullName || studentProfile?.email || studentProfile?.phone || user?.email
      ? {
          fullName,
          email: (studentProfile?.email?.trim() || user?.email?.trim()) ?? "",
          phone: studentProfile?.phone?.trim() ?? "",
        }
      : undefined;

  return (
    <AmbassadorsClient
      initialAmbassadors={ambassadors}
      catalogCountries={catalogCountries}
      studentDefaults={studentDefaults}
      openAmbassadorId={openAmbassadorId}
      openSubscribeModal={openSubscribeModal}
    />
  );
}
