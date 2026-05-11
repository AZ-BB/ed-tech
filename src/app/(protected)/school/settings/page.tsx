import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/utils/supabase-server";

import { netSessionCreditsUsedFromRows } from "./_lib/net-session-credits-used";
import { SchoolSettingsClient } from "./_components/school-settings-client";

export default async function SchoolSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("school_admin_profiles")
    .select(
      `first_name, last_name, email, phone, school_id, schools(
        id, name, country_code, city, students_limit, credit_pool, extra_credits,
        yearly_credit_plan, renewal_date, subscription_status,
        default_ambasador_credit_limit, default_advisor_credit_limit
      )`,
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[school-settings] profile", profileError);
    redirect("/login");
  }

  if (!profile?.school_id) {
    redirect("/login");
  }

  const schoolRow = profile.schools;
  const school =
    schoolRow && !Array.isArray(schoolRow)
      ? schoolRow
      : Array.isArray(schoolRow)
        ? schoolRow[0]
        : null;

  const schoolId = profile.school_id;
  const schoolName = school?.name ?? "";
  const countryCode = school?.country_code ?? "";
  const schoolCity = school?.city?.trim() ?? "";
  const studentsLimit = school?.students_limit ?? null;

  const year = new Date().getUTCFullYear();
  const yearStartUtc = `${year}-01-01T00:00:00.000Z`;

  const [
    { data: countries },
    { count: signedUpCount },
    { count: inviteCount },
    { count: counselorCount },
    { data: creditRowsYear },
    { data: rechargeHistory },
    { data: usageRows },
  ] = await Promise.all([
    supabase.from("countries").select("id, name").order("name", { ascending: true }),
    supabase
      .from("student_profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId),
    supabase
      .from("school_students")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("signed_up", false),
    supabase
      .from("school_admin_profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId),
    supabase
      .from("student_credits_history")
      .select("amount, status, type")
      .eq("school_id", schoolId)
      .gte("created_at", yearStartUtc),
    supabase
      .from("school_recharge_history")
      .select("id, amount, kind, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("student_credits_history")
      .select(
        `
        id,
        amount,
        type,
        status,
        created_at,
        student_profiles ( first_name, last_name )
      `,
      )
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(150),
  ]);

  const creditsUsedThisYear = netSessionCreditsUsedFromRows(creditRowsYear ?? []);

  const rechargeHistorySafe = (rechargeHistory ?? []).map((r) => ({
    id: r.id,
    amount: r.amount,
    kind: String(r.kind ?? "EXTRA"),
    created_at: r.created_at ?? null,
  }));

  const studentUsageHistory = (usageRows ?? []).map((r) => {
    const embed = r.student_profiles as
      | { first_name: string; last_name: string }
      | { first_name: string; last_name: string }[]
      | null;
    const sp = Array.isArray(embed) ? embed[0] : embed;
    const studentName =
      `${sp?.first_name?.trim() ?? ""} ${sp?.last_name?.trim() ?? ""}`.trim() ||
      "Student";
    return {
      id: r.id,
      amount: r.amount,
      type: String(r.type),
      status: r.status ?? null,
      created_at: r.created_at ?? null,
      studentName,
    };
  });

  const initialFullName = [profile.first_name, profile.last_name]
    .map((s) => s?.trim() ?? "")
    .filter(Boolean)
    .join(" ");

  return (
    <SchoolSettingsClient
      authEmail={user.email ?? ""}
      profileEmail={profile.email}
      initialPhone={profile.phone?.trim() ?? ""}
      initialFullName={initialFullName}
      initialSchoolName={schoolName}
      initialSchoolCity={schoolCity}
      initialCountryCode={countryCode}
      countries={countries ?? []}
      stats={{
        signedUpCount: signedUpCount ?? 0,
        inviteCount: inviteCount ?? 0,
        counselorCount: counselorCount ?? 0,
        seatsLimit: studentsLimit,
      }}
      credits={{
        usedThisYear: creditsUsedThisYear,
        defaultAmbassadorLimit: school?.default_ambasador_credit_limit ?? null,
        defaultAdvisorLimit: school?.default_advisor_credit_limit ?? null,
        yearlyCreditPlan: school?.yearly_credit_plan ?? null,
        renewalDate: school?.renewal_date ?? null,
        subscriptionStatus: String(school?.subscription_status ?? "ACTIVE"),
        creditPool: school?.credit_pool ?? null,
        extraCredits: school?.extra_credits ?? null,
      }}
      rechargeHistory={rechargeHistorySafe}
      studentUsageHistory={studentUsageHistory}
    />
  );
}
