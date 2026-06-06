import { getCountryNameByAlpha2 } from "@/lib/countries";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { ADMIN_APPLICATION_STATUS_LABEL } from "./application-status-labels";

const EXPORT_BATCH = 500;

export type AdminApplicationExportRow = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string;
  assignedAt: string;
  inProgressAt: string;
  blockedAt: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentGrade: string;
  schoolId: string;
  schoolName: string;
  schoolCode: string;
  schoolCountry: string;
  handlerName: string;
  handlerEmail: string;
  planName: string;
  planPrice: string;
  planUniversitiesCount: string;
  preferredUniversities: string;
  preferredUniOrCountries: string;
  intendedFields: string;
  openToRelatedFields: string;
  curriculum: string;
  finalGrade: string;
  expectedGraduationYear: string;
  gpa: string;
  sat: string;
  act: string;
  ielts: string;
  toefl: string;
  extracurricularActivities: string;
  awards: string;
};

type PreferencesUniversities = unknown;

type PersonEmbed =
  | { first_name: string; last_name: string; email?: string | null }
  | { first_name: string; last_name: string; email?: string | null }[]
  | null;

type PlanEmbed =
  | { name: string; price: number; universities_count: number }
  | { name: string; price: number; universities_count: number }[]
  | null;

type SchoolEmbed =
  | { id: string; name: string; code: string; country_code: string | null }
  | { id: string; name: string; code: string; country_code: string | null }[]
  | null;

type StudentEmbed =
  | {
      first_name: string;
      last_name: string;
      email?: string | null;
      phone?: string | null;
      grade?: string | null;
    }
  | {
      first_name: string;
      last_name: string;
      email?: string | null;
      phone?: string | null;
      grade?: string | null;
    }[]
  | null;

type AppExportRaw = {
  id: number;
  student_id: string;
  school_id: string | null;
  student_name: string | null;
  student_email: string | null;
  student_phone: string | null;
  school_name: string | null;
  curriculum: string | null;
  expected_graduation_year: number | null;
  preferences_universities: PreferencesUniversities;
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
  status: string | null;
  submitted_at: string | null;
  assigned_at: string | null;
  in_progress_at: string | null;
  blocked_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  applications_plans: PlanEmbed;
  handlers: PersonEmbed;
  schools: SchoolEmbed;
  student_profiles: StudentEmbed;
};

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function personName(first: string | null | undefined, last: string | null | undefined): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(" ").trim();
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value);
}

function parsePreferencesUniversities(json: PreferencesUniversities): string {
  if (!json || !Array.isArray(json)) return "";
  return json
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("; ");
}

function statusLabel(status: string | null | undefined): string {
  const key = status?.trim() ?? "";
  if (!key) return "";
  return (
    ADMIN_APPLICATION_STATUS_LABEL[
      key as keyof typeof ADMIN_APPLICATION_STATUS_LABEL
    ] ?? key
  );
}

function mapApplicationExportRow(row: AppExportRaw): AdminApplicationExportRow {
  const profile = firstEmbed(row.student_profiles);
  const handler = firstEmbed(row.handlers);
  const school = firstEmbed(row.schools);
  const plan = firstEmbed(row.applications_plans);

  const profileName = personName(profile?.first_name, profile?.last_name);
  const studentName = profileName || row.student_name?.trim() || "";
  const studentEmail =
    profile?.email?.trim() || row.student_email?.trim() || "";
  const studentPhone =
    profile?.phone?.trim() || row.student_phone?.trim() || "";

  const schoolName = school?.name?.trim() || row.school_name?.trim() || "";
  const schoolCountry = school?.country_code
    ? getCountryNameByAlpha2(school.country_code) ?? school.country_code
    : "";

  const handlerName = personName(handler?.first_name, handler?.last_name);

  return {
    id: String(row.id),
    status: statusLabel(row.status),
    createdAt: formatDateTime(row.created_at),
    updatedAt: formatDateTime(row.updated_at),
    submittedAt: formatDateTime(row.submitted_at),
    assignedAt: formatDateTime(row.assigned_at),
    inProgressAt: formatDateTime(row.in_progress_at),
    blockedAt: formatDateTime(row.blocked_at),
    studentId: row.student_id,
    studentName,
    studentEmail,
    studentPhone,
    studentGrade: profile?.grade?.trim() ?? "",
    schoolId: row.school_id?.trim() ?? school?.id ?? "",
    schoolName,
    schoolCode: school?.code?.trim() ?? "",
    schoolCountry,
    handlerName,
    handlerEmail: handler?.email?.trim() ?? "",
    planName: plan?.name?.trim() ?? "",
    planPrice: plan != null ? formatNumber(plan.price) : "",
    planUniversitiesCount:
      plan != null ? formatNumber(plan.universities_count) : "",
    preferredUniversities: parsePreferencesUniversities(
      row.preferences_universities,
    ),
    preferredUniOrCountries: row.preferred_uni_or_countries?.trim() ?? "",
    intendedFields: row.inteended_fields?.trim() ?? "",
    openToRelatedFields: row.open_to_realted_fields ? "Yes" : "No",
    curriculum: row.curriculum?.trim() ?? "",
    finalGrade: row.final_grade?.trim() ?? "",
    expectedGraduationYear: formatNumber(row.expected_graduation_year),
    gpa: formatNumber(row.gpa),
    sat: formatNumber(row.sat),
    act: formatNumber(row.act),
    ielts: formatNumber(row.ielts),
    toefl: formatNumber(row.toefl),
    extracurricularActivities: row.extracurricular_activities?.trim() ?? "",
    awards: row.awards?.trim() ?? "",
  };
}

const APPLICATION_EXPORT_SELECT = `
  id,
  student_id,
  school_id,
  student_name,
  student_email,
  student_phone,
  school_name,
  curriculum,
  expected_graduation_year,
  preferences_universities,
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
  status,
  submitted_at,
  assigned_at,
  in_progress_at,
  blocked_at,
  created_at,
  updated_at,
  applications_plans ( name, price, universities_count ),
  handlers:assigned_to ( first_name, last_name, email ),
  schools ( id, name, code, country_code ),
  student_profiles ( first_name, last_name, email, phone, grade )
`;

/** Fetches every application in the system (no pagination, no list filters). */
export async function fetchAdminApplicationsExportRows(): Promise<
  AdminApplicationExportRow[]
> {
  const supabase = await createSupabaseSecretClient();
  const allRaw: AppExportRaw[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("applications")
      .select(APPLICATION_EXPORT_SELECT)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + EXPORT_BATCH - 1);

    if (error) {
      console.error("[fetchAdminApplicationsExportRows]", error);
      break;
    }

    const batch = (data ?? []) as unknown as AppExportRaw[];
    allRaw.push(...batch);

    if (batch.length < EXPORT_BATCH) break;
    offset += EXPORT_BATCH;
  }

  return allRaw.map(mapApplicationExportRow);
}
