import type { SchoolStudentDetailPayload } from "@/app/(protected)/school/students/[id]/_lib/fetch-school-student-detail";
import { fetchSchoolStudentDetail } from "@/app/(protected)/school/students/[id]/_lib/fetch-school-student-detail";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

export type { AdminStudentUsageHistoryItem } from "@/lib/student-usage-history";

export type AdminStudentSchoolInfo = {
  id: string;
  name: string;
  countryName: string | null;
  contactEmail: string;
  schoolCode: string;
  studentsLimit: number | null;
  creditPool: number | null;
  defaultAdvisorCreditLimit: number | null;
  defaultAmbassadorCreditLimit: number | null;
  isActive: boolean;
  enrolledStudentsCount: number;
  pendingInvitesCount: number;
};

export type AdminStudentDetailPayload = SchoolStudentDetailPayload & {
  schoolInfo: AdminStudentSchoolInfo;
};

async function assertAdminAccess() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) return false;

  const service = await createSupabaseSecretClient();
  const { data: admin } = await service
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return Boolean(admin);
}


export async function fetchAdminStudentDetail(
  studentId: string,
): Promise<AdminStudentDetailPayload | null> {
  const isAdmin = await assertAdminAccess();
  if (!isAdmin) return null;

  const secret = await createSupabaseSecretClient();
  const base = await fetchSchoolStudentDetail(studentId, { dataClient: secret });
  if (!base) return null;

  const { data: profile, error: profileError } = await secret
    .from("student_profiles")
    .select("school_id")
    .eq("id", studentId)
    .maybeSingle();

  if (profileError || !profile?.school_id) {
    console.error("[fetchAdminStudentDetail] student_profiles", profileError);
    return null;
  }

  const schoolId = profile.school_id;

  const [
    { data: school, error: schoolError },
    { count: enrolledCount },
    { count: pendingCount },
  ] = await Promise.all([
    secret
      .from("schools")
      .select(
        `
        id,
        name,
        contact_email,
        code,
        students_limit,
        credit_pool,
        default_advisor_credit_limit,
        default_ambasador_credit_limit,
        is_active,
        countries ( name )
      `,
      )
      .eq("id", schoolId)
      .maybeSingle(),
    secret
      .from("student_profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId),
    secret
      .from("school_students")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("signed_up", false),
  ]);

  if (schoolError || !school) {
    console.error("[fetchAdminStudentDetail] schools", schoolError);
    return null;
  }

  const countriesEmbed = school.countries as { name?: string } | { name?: string }[] | null;
  const countryName = Array.isArray(countriesEmbed)
    ? countriesEmbed[0]?.name?.trim() ?? null
    : countriesEmbed?.name?.trim() ?? null;

  const schoolInfo: AdminStudentSchoolInfo = {
    id: school.id,
    name: school.name.trim(),
    countryName,
    contactEmail: school.contact_email.trim(),
    schoolCode: school.code.trim(),
    studentsLimit: school.students_limit,
    creditPool: school.credit_pool,
    defaultAdvisorCreditLimit: school.default_advisor_credit_limit,
    defaultAmbassadorCreditLimit: school.default_ambasador_credit_limit,
    isActive: school.is_active,
    enrolledStudentsCount: enrolledCount ?? 0,
    pendingInvitesCount: pendingCount ?? 0,
  };

  return {
    ...base,
    schoolInfo,
  };
}
