import { requireStudentSession } from "@/lib/student-ai-usage-log";
import { createSupabaseServerClient } from "@/utils/supabase-server";
import { format } from "date-fns";
import { notFound, redirect } from "next/navigation";
import { StudentSettingsClient } from "./_components/student-settings-client";

type SchoolEmbed = {
  name?: string | null;
  countries?: { name?: string | null } | null;
} | null;

export default async function StudentSettingsPage() {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile, error } = await supabase
    .from("student_profiles")
    .select(
      `
      first_name,
      last_name,
      email,
      phone,
      nationality_country_code,
      notification_app_updates,
      notification_news_platform,
      countries!student_profiles_nationality_country_code_fkey(name),
      schools(
        name,
        countries!schools_country_code_fkey(name)
      )
    `,
    )
    .eq("id", auth.studentId)
    .maybeSingle();

  if (error || !profile) {
    if (error) console.error("[StudentSettingsPage]", error);
    notFound();
  }

  const { data: countries } = await supabase
    .from("countries")
    .select("id, name")
    .order("name", { ascending: true });

  const lastSignInLabel =
    user?.last_sign_in_at != null
      ? `Last login: ${format(new Date(user.last_sign_in_at), "MMM d, yyyy 'at' h:mm a")}`
      : "Last login: —";

  const schoolsRaw = profile.schools as SchoolEmbed | SchoolEmbed[] | null;
  const schoolEmbed = Array.isArray(schoolsRaw)
    ? (schoolsRaw[0] ?? null)
    : schoolsRaw;
  const schoolCountryName =
    typeof schoolEmbed?.countries?.name === "string"
      ? schoolEmbed.countries.name.trim() || "—"
      : "—";
  const schoolName =
    typeof schoolEmbed?.name === "string"
      ? schoolEmbed.name.trim() || "—"
      : "—";

  const nationalityName =
    typeof (profile.countries as { name?: string } | null)?.name === "string"
      ? (profile.countries as { name: string }).name.trim() || "—"
      : "—";

  return (
    <StudentSettingsClient
      authEmail={user?.email?.trim() ?? ""}
      lastSignInLabel={lastSignInLabel}
      countries={countries ?? []}
      initial={{
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: profile.email,
        phone: profile.phone ?? "",
        nationalityCountryCode: profile.nationality_country_code,
        nationalityName,
        notificationAppUpdates: profile.notification_app_updates,
        notificationNewsPlatform: profile.notification_news_platform,
        schoolName,
        schoolCountryName,
      }}
    />
  );
}
