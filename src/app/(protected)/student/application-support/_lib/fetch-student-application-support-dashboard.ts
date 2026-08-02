import "server-only";

import {
  ACTIVE_APPLICATION_STATUSES,
} from "@/lib/application-support-intake";
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
} from "./student-application-support-dashboard-types";
import { fetchStudentApplicationSupportAdvisor } from "./fetch-student-application-support-advisor";

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
  scheduled_at,
  assigned_to,
  package_data,
  updated_at,
  payments ( amount, status )
`;

type PaymentEmbed = {
  amount: number;
  status: string | null;
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
  scheduled_at: string | null;
  assigned_to: string | null;
  package_data: unknown;
  updated_at: string | null;
  payments: PaymentEmbed | PaymentEmbed[] | null;
};


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

function sumPaidPayments(
  embed: PaymentEmbed | PaymentEmbed[] | null | undefined,
): number {
  if (!embed) return 0;
  const payments = Array.isArray(embed) ? embed : [embed];
  return payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amount, 0);
}

export async function fetchLatestStudentApplication(
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
    console.error("[fetchLatestStudentApplication]", error);
    return null;
  }

  return (data as ApplicationRowRaw | null) ?? null;
}

/** @deprecated Use fetchLatestStudentApplication */
export async function fetchLatestActiveStudentApplication(
  secret: SecretClient,
  studentId: string,
): Promise<ApplicationRowRaw | null> {
  const row = await fetchLatestStudentApplication(secret, studentId);
  if (!row) return null;
  const status = row.status?.trim() || "lead";
  if (
    !(ACTIVE_APPLICATION_STATUSES as readonly string[]).includes(status)
  ) {
    return null;
  }
  return row;
}

export async function fetchStudentApplicationSupportDashboard(
  secret: SecretClient,
  studentId: string,
): Promise<StudentApplicationSupportDashboardPayload | null> {
  const row = await fetchLatestStudentApplication(secret, studentId);
  if (!row || row.status?.trim() !== "active_package") return null;

  const packageData = parseApplicationPackageData(row.package_data);
  const universitiesTotal = resolveApplicationUniversitiesTotal(packageData, 0);
  const totalPaidAed = sumPaidPayments(row.payments);

  const [universityTargets, tasks, documents, advisor] = await Promise.all([
    fetchApplicationUniversityTargets(secret, row.id),
    fetchApplicationTasks(secret, row.id),
    ensureStudentApplicationDocuments(secret, studentId),
    fetchStudentApplicationSupportAdvisor(secret, row.assigned_to),
  ]);

  return {
    studentId,
    application: mapIntake(row),
    totalPaidAed,
    universitiesTotal,
    universityTargets,
    documents,
    tasks,
    advisor,
  };
}
