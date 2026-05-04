import { requireStudentSession } from "@/lib/student-ai-usage-log";
import {
  recordStudentPlatformCompletionOnce,
  STUDENT_PLATFORM_COMPLETION_FLAGS,
} from "@/lib/student-platform-completion";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AmbassadorsClient } from "./_components/ambassadors-client";
import { mapAmbassadorRows, type AmbassadorQueryRow } from "./_lib/ambassador-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "University Ambassadors",
};

export default async function AmbassadorsPage() {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  await recordStudentPlatformCompletionOnce(
    supabase,
    auth.studentId,
    STUDENT_PLATFORM_COMPLETION_FLAGS.viewed_ambassadors,
  );

  const secret = await createSupabaseSecretClient();

  const [{ data: rows }, { data: countryRows }] = await Promise.all([
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
  ]);

  const ambassadors = mapAmbassadorRows((rows ?? []) as AmbassadorQueryRow[]);
  const catalogCountries = (countryRows ?? []) as { id: string; name: string }[];

  return <AmbassadorsClient initialAmbassadors={ambassadors} catalogCountries={catalogCountries} />;
}
