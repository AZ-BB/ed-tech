import "server-only";

import { ACTIVE_APPLICATION_STATUSES } from "@/lib/application-support-intake";
import {
  parseApplicationPackageData,
  resolveApplicationUniversitiesTotal,
} from "@/lib/application-package-data";
import { ensureStudentApplicationDocuments } from "@/lib/ensure-student-application-documents";
import { fetchApplicationTasks } from "@/lib/fetch-application-tasks";
import { fetchApplicationUniversityTargets } from "@/lib/fetch-application-university-targets";
import type { createSupabaseSecretClient } from "@/utils/supabase-server";

import type {
  StudentApplicationSupportDashboardPayload,
  StudentApplicationSupportIntake,
  StudentApplicationSupportPlan,
} from "./student-application-support-dashboard-types";

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

const STUDENT_APPLICATION_SELECT = `
  id,
  student_id,
  student_name,
  student_email,
  student_phone,
  school_name,
  curriculum,
  expected_graduation_year,
  preferences_universities,
  preferences_universities_notes,
  final_grade,
  gpa,
  sat,
  act,
  ielts,
  toefl,
  inteended_fields,
  open_to_realted_fields,
  preferred_uni_or_countries,
  extracurricular_activities,
  awards,
  additional_notes,
  status,
  package_data,
  plan_id,
  updated_at,
  applications_plans!applications_plan_id_fkey (
    name,
    description,
    price,
    universities_count
  )
`;

type PlanEmbed = {
  name: string;
  description: string | null;
  price: number;
  universities_count: number;
};

type ApplicationRowRaw = {
  id: number;
  student_id: string;
  student_name: string | null;
  student_email: string | null;
  student_phone: string | null;
  school_name: string | null;
  curriculum: string | null;
  expected_graduation_year: number | null;
  preferences_universities: unknown;
  preferences_universities_notes: string | null;
  final_grade: string;
  gpa: number | null;
  sat: number | null;
  act: number | null;
  ielts: number | null;
  toefl: number | null;
  inteended_fields: string;
  open_to_realted_fields: boolean;
  preferred_uni_or_countries: string;
  extracurricular_activities: string;
  awards: string | null;
  additional_notes: string | null;
  status: string | null;
  package_data: unknown;
  plan_id: number;
  updated_at: string | null;
  applications_plans: PlanEmbed | PlanEmbed[] | null;
};

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function parseUniversities(json: unknown): string[] {
  if (!json || !Array.isArray(json)) return [];
  return json
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function mapIntake(row: ApplicationRowRaw): StudentApplicationSupportIntake {
  return {
    id: row.id,
    status: row.status?.trim() || "lead",
    studentName: row.student_name?.trim() || "—",
    studentEmail: row.student_email?.trim() || "—",
    studentPhone: row.student_phone?.trim() || "—",
    schoolName: row.school_name?.trim() || null,
    curriculum: row.curriculum,
    expectedGraduationYear: row.expected_graduation_year,
    finalGrade: row.final_grade?.trim() || "—",
    gpa: row.gpa,
    sat: row.sat,
    act: row.act,
    ielts: row.ielts,
    toefl: row.toefl,
    intendedFields: row.inteended_fields?.trim() || "—",
    openToRelatedFields: row.open_to_realted_fields,
    preferredUniOrCountries: row.preferred_uni_or_countries?.trim() || "—",
    extracurricularActivities: row.extracurricular_activities?.trim() || "—",
    awards: row.awards?.trim() || null,
    additionalNotes: row.additional_notes?.trim() || null,
    preferencesUniversitiesNotes: row.preferences_universities_notes?.trim() || null,
    universities: parseUniversities(row.preferences_universities),
  };
}

function mapPlan(row: ApplicationRowRaw): StudentApplicationSupportPlan | null {
  const plan = firstEmbed(row.applications_plans);
  if (!plan) return null;
  return {
    name: plan.name,
    description: plan.description,
    price: plan.price,
    universitiesCount: plan.universities_count,
  };
}

export async function fetchLatestActiveStudentApplication(
  secret: SecretClient,
  studentId: string,
): Promise<ApplicationRowRaw | null> {
  const { data, error } = await secret
    .from("applications")
    .select(STUDENT_APPLICATION_SELECT)
    .eq("student_id", studentId)
    .in("status", [...ACTIVE_APPLICATION_STATUSES])
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[fetchLatestActiveStudentApplication]", error);
    return null;
  }

  return (data as ApplicationRowRaw | null) ?? null;
}

export async function fetchStudentApplicationSupportDashboard(
  secret: SecretClient,
  studentId: string,
): Promise<StudentApplicationSupportDashboardPayload | null> {
  const row = await fetchLatestActiveStudentApplication(secret, studentId);
  if (!row) return null;

  const packageData = parseApplicationPackageData(row.package_data);
  const plan = mapPlan(row);
  const universitiesTotal = resolveApplicationUniversitiesTotal(
    packageData,
    plan?.universitiesCount ?? 0,
  );

  const [universityTargets, tasks, documents] = await Promise.all([
    fetchApplicationUniversityTargets(secret, row.id),
    fetchApplicationTasks(secret, row.id),
    ensureStudentApplicationDocuments(secret, studentId),
  ]);

  return {
    studentId,
    application: mapIntake(row),
    plan,
    universitiesTotal,
    universityTargets,
    documents,
    tasks,
  };
}
