import { getCountryNameByAlpha2 } from "@/lib/countries";
import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import { fetchActiveApplicationPlans } from "@/lib/applications-plans";
import { fetchAdvisorSessionEditableApplication } from "@/lib/fetch-advisor-session-editable-application";
import type { ApplicationSupportPayload } from "@/lib/application-support-intake";
import type { ApplicationPlanCatalogRow } from "@/lib/applications-plans";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

type StudentEmbed =
  | {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      grade: string | null;
      schools:
        | {
            id: string;
            name: string;
            code: string;
            city: string | null;
            country_code: string | null;
          }
        | {
            id: string;
            name: string;
            code: string;
            city: string | null;
            country_code: string | null;
          }[]
        | null;
    }
  | {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      grade: string | null;
      schools:
        | {
            id: string;
            name: string;
            code: string;
            city: string | null;
            country_code: string | null;
          }
        | {
            id: string;
            name: string;
            code: string;
            city: string | null;
            country_code: string | null;
          }[]
        | null;
    }[]
  | null;

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function personName(first: string | null | undefined, last: string | null | undefined): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(" ").trim() || "—";
}

export type AdvisorSessionDetailStudent = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  grade: string | null;
};

export type AdvisorSessionDetailSchool = {
  name: string;
  code: string;
  city: string | null;
  countryLabel: string;
};

export type AdvisorSessionEditableApplicationPayload = {
  id: number;
  initialPayload: ApplicationSupportPayload;
};

export type AdvisorSessionDetailPayload = {
  id: number;
  status: string;
  bookedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  currentStage: string;
  destinationLabel: string;
  specificUni: string | null;
  helpWith: string | null;
  studentName: string;
  studentEmail: string | null;
  studentPhone: string | null;
  student: AdvisorSessionDetailStudent;
  school: AdvisorSessionDetailSchool | null;
  editableApplication: AdvisorSessionEditableApplicationPayload | null;
  applicationPlans: ApplicationPlanCatalogRow[];
};

function mapStudent(embed: StudentEmbed): AdvisorSessionDetailStudent | null {
  const profile = firstEmbed(embed);
  if (!profile) return null;

  return {
    id: profile.id,
    fullName: personName(profile.first_name, profile.last_name),
    email: profile.email?.trim() || "—",
    phone: profile.phone?.trim() || null,
    grade: profile.grade?.trim() || null,
  };
}

function mapSchool(embed: StudentEmbed): AdvisorSessionDetailSchool | null {
  const profile = firstEmbed(embed);
  if (!profile) return null;

  const school = firstEmbed(profile.schools);
  if (!school) return null;

  return {
    name: school.name?.trim() || "—",
    code: school.code?.trim() || "—",
    city: school.city?.trim() || null,
    countryLabel: school.country_code
      ? (getCountryNameByAlpha2(school.country_code) ?? school.country_code)
      : "—",
  };
}

export async function fetchAdvisorSessionDetail(
  sessionIdRaw: string,
): Promise<AdvisorSessionDetailPayload | null> {
  const sessionId = Number.parseInt(sessionIdRaw.trim(), 10);
  if (!Number.isFinite(sessionId) || sessionId < 1) return null;

  const supabase = await createSupabaseServerClient();
  const advisorId = await resolveCurrentAdvisorId(supabase);
  if (!advisorId) return null;

  const secret = await createSupabaseSecretClient();
  const { data, error } = await secret
    .from("advisor_sessions")
    .select(
      `
      id,
      student_id,
      status,
      booked_at,
      created_at,
      updated_at,
      current_stage,
      destination_country_code,
      specific_uni,
      help_with,
      student_name,
      student_email,
      student_phone,
      student_profiles (
        id,
        first_name,
        last_name,
        email,
        phone,
        grade,
        schools (
          id,
          name,
          code,
          city,
          country_code
        )
      )
    `,
    )
    .eq("id", sessionId)
    .eq("advisor_id", advisorId)
    .maybeSingle();

  if (error || !data) {
    console.error("[fetchAdvisorSessionDetail]", error);
    return null;
  }

  const student = mapStudent(data.student_profiles as StudentEmbed);
  if (!student) return null;

  const destinationCode = data.destination_country_code?.trim() || "";

  const [editableApplication, applicationPlans] = await Promise.all([
    fetchAdvisorSessionEditableApplication(secret, {
      studentId: data.student_id,
      advisorId,
    }),
    fetchActiveApplicationPlans(secret),
  ]);

  return {
    id: data.id,
    status: data.status?.trim() || "pending",
    bookedAt: data.booked_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    currentStage: data.current_stage?.trim() || "—",
    destinationLabel: destinationCode
      ? (getCountryNameByAlpha2(destinationCode) ?? destinationCode)
      : "—",
    specificUni: data.specific_uni?.trim() || null,
    helpWith: data.help_with?.trim() || null,
    studentName: data.student_name?.trim() || student.fullName,
    studentEmail: data.student_email?.trim() || student.email,
    studentPhone: data.student_phone?.trim() || student.phone,
    student,
    school: mapSchool(data.student_profiles as StudentEmbed),
    editableApplication,
    applicationPlans,
  };
}
