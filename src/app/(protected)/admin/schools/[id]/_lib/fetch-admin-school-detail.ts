import { formatCreditAssignerName } from "@/lib/student-credit-assignment-log";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { buildStudentAllocations } from "@/app/(protected)/school/settings/_lib/build-student-allocations";
import { netSessionCreditsUsedFromRows } from "@/app/(protected)/school/settings/_lib/net-session-credits-used";
import type {
  RechargeHistoryRow,
  SchoolCreditsSummary,
  StudentUsageRow,
} from "@/app/(protected)/school/settings/_components/school-settings-credits-panel";
import type { StudentAllocationRow } from "@/app/(protected)/school/settings/_lib/build-student-allocations";

export type AdminSchoolDetailPayload = {
  school: {
    id: string;
    name: string;
    code: string;
    contactEmail: string;
    city: string | null;
    countryCode: string;
    countryName: string;
    locationLabel: string;
    isActive: boolean;
    studentsLimit: number | null;
    studentCount: number;
    teacherCount: number;
    ownerName: string;
    renewalDate: string | null;
    renewalLabel: string;
    subscriptionStatus: string;
  };
  credits: SchoolCreditsSummary;
  rechargeHistory: RechargeHistoryRow[];
  studentUsageHistory: StudentUsageRow[];
  studentAllocations: StudentAllocationRow[];
  countries: { id: string; name: string }[];
  tabCounts: {
    students: number;
    teachers: number;
  };
};

function formatRenewal(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatLocation(city: string | null, countryCode: string): string {
  const country = getCountryNameByAlpha2(countryCode);
  if (city?.trim() && country) return `${city.trim()}, ${country}`;
  if (city?.trim()) return city.trim();
  if (country) return country;
  return "—";
}

function formatOwnerName(firstName: string, lastName: string): string {
  const full = [firstName, lastName].filter(Boolean).join(" ").trim();
  return full || "—";
}

export async function fetchAdminSchoolDetail(
  schoolId: string,
): Promise<AdminSchoolDetailPayload | null> {
  const supabase = await createSupabaseSecretClient();

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select(
      "id, name, code, contact_email, city, country_code, is_active, students_limit, credit_pool, yearly_credit_plan, renewal_date, subscription_status, default_advisor_credit_limit, default_ambasador_credit_limit",
    )
    .eq("id", schoolId)
    .maybeSingle();

  if (schoolError) {
    console.error("[admin-school-detail] school", schoolError);
    return null;
  }

  if (!school) return null;

  const year = new Date().getUTCFullYear();
  const yearStartUtc = `${year}-01-01T00:00:00.000Z`;

  const [
    { data: countries },
    { count: studentCount },
    { count: teacherCount },
    { data: ownerRows },
    { data: creditRowsYear },
    { data: rechargeHistory },
    { data: usageRows },
    { data: studentProfiles },
    { data: allocationCreditRows },
  ] = await Promise.all([
    supabase.from("countries").select("id, name").order("name", { ascending: true }),
    supabase
      .from("student_profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId),
    supabase
      .from("school_admin_profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId),
    supabase
      .from("school_admin_profiles")
      .select("first_name, last_name")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1),
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
        assigned_by_admin_id,
        assigned_by_school_admin_id,
        student_profiles ( first_name, last_name ),
        admins:assigned_by_admin_id ( first_name, last_name ),
        school_admin_profiles:assigned_by_school_admin_id ( first_name, last_name )
      `,
      )
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("student_profiles")
      .select(
        "id, first_name, last_name, advisor_credit_limit, ambassador_credit_limit",
      )
      .eq("school_id", schoolId)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true }),
    supabase
      .from("student_credits_history")
      .select("student_id, amount, status, type")
      .eq("school_id", schoolId),
  ]);

  const owner = ownerRows?.[0];
  const ownerName = owner
    ? formatOwnerName(owner.first_name, owner.last_name)
    : "—";

  const creditsUsedThisYear = netSessionCreditsUsedFromRows(creditRowsYear ?? []);

  const rechargeHistorySafe: RechargeHistoryRow[] = (rechargeHistory ?? []).map((r) => ({
    id: r.id,
    amount: r.amount,
    kind: String(r.kind ?? "EXTRA"),
    created_at: r.created_at ?? null,
  }));

  const studentUsageHistory: StudentUsageRow[] = (usageRows ?? []).map((r) => {
    const embed = r.student_profiles as
      | { first_name: string; last_name: string }
      | { first_name: string; last_name: string }[]
      | null;
    const sp = Array.isArray(embed) ? embed[0] : embed;
    const studentName =
      `${sp?.first_name?.trim() ?? ""} ${sp?.last_name?.trim() ?? ""}`.trim() ||
      "Student";

    const adminEmbed = r.admins as
      | { first_name: string; last_name: string }
      | { first_name: string; last_name: string }[]
      | null;
    const admin = Array.isArray(adminEmbed) ? adminEmbed[0] : adminEmbed;

    const schoolAdminEmbed = r.school_admin_profiles as
      | { first_name: string; last_name: string }
      | { first_name: string; last_name: string }[]
      | null;
    const schoolAdmin = Array.isArray(schoolAdminEmbed)
      ? schoolAdminEmbed[0]
      : schoolAdminEmbed;

    return {
      id: r.id,
      amount: r.amount,
      type: String(r.type),
      status: r.status ?? null,
      created_at: r.created_at ?? null,
      studentName,
      addedByName: formatCreditAssignerName({
        adminFirst: admin?.first_name,
        adminLast: admin?.last_name,
        schoolAdminFirst: schoolAdmin?.first_name,
        schoolAdminLast: schoolAdmin?.last_name,
      }),
    };
  });

  const studentAllocations = buildStudentAllocations(
    studentProfiles ?? [],
    allocationCreditRows ?? [],
  );

  const countryName = getCountryNameByAlpha2(school.country_code) ?? school.country_code;

  return {
    school: {
      id: school.id,
      name: school.name.trim(),
      code: school.code.trim(),
      contactEmail: school.contact_email.trim(),
      city: school.city?.trim() ?? null,
      countryCode: school.country_code,
      countryName,
      locationLabel: formatLocation(school.city, school.country_code),
      isActive: school.is_active,
      studentsLimit: school.students_limit,
      studentCount: studentCount ?? 0,
      teacherCount: teacherCount ?? 0,
      ownerName,
      renewalDate: school.renewal_date,
      renewalLabel: formatRenewal(school.renewal_date),
      subscriptionStatus: String(school.subscription_status ?? "ACTIVE"),
    },
    credits: {
      usedThisYear: creditsUsedThisYear,
      defaultAmbassadorLimit: school.default_ambasador_credit_limit,
      defaultAdvisorLimit: school.default_advisor_credit_limit,
      yearlyCreditPlan: school.yearly_credit_plan,
      renewalDate: school.renewal_date,
      subscriptionStatus: String(school.subscription_status ?? "ACTIVE"),
      creditPool: school.credit_pool,
    },
    rechargeHistory: rechargeHistorySafe,
    studentUsageHistory,
    studentAllocations,
    countries: (countries ?? []).map((c) => ({ id: c.id, name: c.name })),
    tabCounts: {
      students: studentCount ?? 0,
      teachers: teacherCount ?? 0,
    },
  };
}
