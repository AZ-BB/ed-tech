import { getCountryNameByAlpha2 } from "@/lib/countries";
import type { DocRow } from "@/lib/ensure-student-application-documents";
import type { ApplicationUniversityTargetRow } from "@/lib/application-university-target-mapper";
import type { ApplicationCallRow } from "@/lib/fetch-application-calls";
import type { ApplicationInternalNoteRow } from "@/lib/application-internal-notes";
import {
  buildApplicationPackageView,
  parseApplicationPackageData,
  resolveApplicationUniversitiesTotal,
  type ApplicationPackageView,
} from "@/lib/application-package-data";
import type { ApplicationTaskRow } from "@/lib/fetch-application-tasks";
import type {
  ApplicationPaymentPayout,
  ApplicationPayoutSummary,
} from "@/lib/advisor-payouts/types";
import { resolvePaymentDisplayStatus } from "@/lib/payment-request-utils";

export type { ApplicationPaymentPayout };

export type ApplicationPaymentRow = {
  id: number;
  amount: number;
  status: string;
  dueDate: string | null;
  createdAt: string | null;
  requestedAt: string | null;
  paidAt: string | null;
  payout: ApplicationPaymentPayout | null;
};

export type ApplicationDetailPayload = {
  application: {
    id: number;
    status: string;
    createdAt: string | null;
    updatedAt: string | null;
    submittedAt: string | null;
    assignedAt: string | null;
    scheduledAt: string | null;
    inProgressAt: string | null;
    blockedAt: string | null;
    curriculum: string | null;
    expectedGraduationYear: number | null;
    finalGrade: string;
    gpa: number | null;
    sat: number | null;
    act: number | null;
    ielts: number | null;
    toefl: number | null;
    intendedFields: string;
    openToRelatedFields: boolean;
    preferredUniOrCountries: string;
    extracurricularActivities: string;
    awards: string | null;
    additionalNotes: string | null;
    preferencesUniversitiesNotes: string | null;
    universities: string[];
    studentName: string;
    studentEmail: string;
    studentPhone: string;
    schoolNameOnApplication: string | null;
  };
  plan: {
    name: string;
    description: string | null;
    price: number;
    universitiesCount: number;
    defaultUniversitiesCount: number;
  } | null;
  advisor: {
    id: string;
    name: string;
    email: string;
  } | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string | null;
    grade: string | null;
    nationalityCountryCode: string | null;
    nationalityLabel: string;
    status: string | null;
    isActive: boolean;
    totalLogins: number | null;
    flagged: boolean;
    flaggedBy: string | null;
    href: string | null;
  };
  school: {
    id: string;
    name: string;
    code: string;
    city: string | null;
    countryLabel: string;
    contactEmail: string | null;
    href: string | null;
  } | null;
  studentDocuments: DocRow[];
  universityTargets: ApplicationUniversityTargetRow[];
  payments: ApplicationPaymentRow[];
  internalNotes: ApplicationInternalNoteRow[];
  calls: ApplicationCallRow[];
  tasks: ApplicationTaskRow[];
  packageView: ApplicationPackageView;
  payoutSummary: ApplicationPayoutSummary | null;
};

export const APPLICATION_DETAIL_SELECT = `
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
  assigned_to,
  submitted_at,
  assigned_at,
  scheduled_at,
  in_progress_at,
  blocked_at,
  created_at,
  updated_at,
  package_data,
  plan_id,
  applications_plans!applications_plan_id_fkey ( name, description, price, universities_count ),
  advisors:assigned_to ( id, first_name, last_name, email, phone ),
  schools (
    id,
    name,
    code,
    city,
    country_code,
    contact_email
  ),
  student_profiles (
    id,
    first_name,
    last_name,
    email,
    phone,
    grade,
    nationality_country_code,
    status,
    is_active,
    total_logins,
    flagged,
    flagged_by
  )
`;

type PreferencesUniversities = unknown;

type ApplicationRowRaw = {
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
  assigned_to: string | null;
  submitted_at: string | null;
  assigned_at: string | null;
  scheduled_at: string | null;
  in_progress_at: string | null;
  blocked_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  package_data: unknown;
  plan_id: number;
  applications_plans:
    | { name: string; description: string | null; price: number; universities_count: number }
    | { name: string; description: string | null; price: number; universities_count: number }[]
    | null;
  advisors:
    | { id: string; first_name: string; last_name: string; email: string | null; phone: string | null }
    | { id: string; first_name: string; last_name: string; email: string | null; phone: string | null }[]
    | null;
  schools:
    | {
        id: string;
        name: string;
        code: string;
        city: string | null;
        country_code: string | null;
        contact_email: string | null;
      }
    | {
        id: string;
        name: string;
        code: string;
        city: string | null;
        country_code: string | null;
        contact_email: string | null;
      }[]
    | null;
  student_profiles:
    | {
        id: string;
        first_name: string;
        last_name: string;
        email: string | null;
        phone: string | null;
        grade: string | null;
        nationality_country_code: string | null;
        status: string | null;
        is_active: boolean | null;
        total_logins: number | null;
        flagged: boolean | null;
        flagged_by: string | null;
      }
    | {
        id: string;
        first_name: string;
        last_name: string;
        email: string | null;
        phone: string | null;
        grade: string | null;
        nationality_country_code: string | null;
        status: string | null;
        is_active: boolean | null;
        total_logins: number | null;
        flagged: boolean | null;
        flagged_by: string | null;
      }[]
    | null;
};

type PaymentRowRaw = {
  id: number;
  amount: number;
  status: string | null;
  due_date: string | null;
  created_at: string | null;
  payment_request_sent_at: string | null;
  paid_at: string | null;
  updated_at: string | null;
};

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function personName(first: string | null | undefined, last: string | null | undefined): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(" ").trim();
}

function parseUniversities(json: PreferencesUniversities): string[] {
  if (!json || !Array.isArray(json)) return [];
  return json
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatLocation(city: string | null, countryCode: string | null): string {
  const country = countryCode ? getCountryNameByAlpha2(countryCode) : undefined;
  if (city?.trim() && country) return `${city.trim()}, ${country}`;
  if (city?.trim()) return city.trim();
  if (country) return country;
  return "—";
}

export type ApplicationDetailLinkConfig = {
  studentHref: (studentId: string) => string | null;
  schoolHref: (schoolId: string) => string | null;
};

export type ApplicationDetailMapOptions = {
  payoutByPaymentId?: Map<number, ApplicationPaymentPayout>;
  payoutSummary?: ApplicationPayoutSummary | null;
};

export function mapApplicationDetailPayload(
  data: ApplicationRowRaw,
  payments: PaymentRowRaw[],
  links: ApplicationDetailLinkConfig,
  internalNotes: ApplicationInternalNoteRow[] = [],
  studentDocuments: DocRow[] = [],
  calls: ApplicationCallRow[] = [],
  tasks: ApplicationTaskRow[] = [],
  options: ApplicationDetailMapOptions = {},
  universityTargets: ApplicationUniversityTargetRow[] = [],
): ApplicationDetailPayload {
  const plan = firstEmbed(data.applications_plans);
  const advisorEmbed = firstEmbed(data.advisors);
  const schoolEmbed = firstEmbed(data.schools);
  const studentEmbed = firstEmbed(data.student_profiles);

  const profileFirst = studentEmbed?.first_name?.trim() ?? "";
  const profileLast = studentEmbed?.last_name?.trim() ?? "";
  const profileFullName = personName(profileFirst, profileLast);
  const applicationStudentName = data.student_name?.trim() ?? "";
  const studentFullName = profileFullName || applicationStudentName || "Student";
  const studentEmail =
    studentEmbed?.email?.trim() || data.student_email?.trim() || "—";
  const studentPhone =
    studentEmbed?.phone?.trim() || data.student_phone?.trim() || null;
  const nationalityCode = studentEmbed?.nationality_country_code ?? null;

  const packageData = parseApplicationPackageData(data.package_data);
  const planUniversitiesCount = plan?.universities_count ?? 0;
  const effectiveUniversitiesCount = resolveApplicationUniversitiesTotal(
    packageData,
    planUniversitiesCount,
  );
  const totalPaidAed = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const fallbackStartedAt =
    data.in_progress_at ?? data.assigned_at ?? data.created_at ?? null;

  const schoolId = schoolEmbed?.id ?? data.school_id;
  const school =
    schoolEmbed && schoolId
      ? {
          id: schoolId,
          name: schoolEmbed.name?.trim() || data.school_name?.trim() || "—",
          code: schoolEmbed.code?.trim() || "—",
          city: schoolEmbed.city?.trim() || null,
          countryLabel: formatLocation(
            schoolEmbed.city?.trim() || null,
            schoolEmbed.country_code ?? null,
          ),
          contactEmail: schoolEmbed.contact_email?.trim() || null,
          href: links.schoolHref(schoolId),
        }
      : data.school_id
        ? {
            id: data.school_id,
            name: data.school_name?.trim() || "—",
            code: "—",
            city: null,
            countryLabel: "—",
            contactEmail: null,
            href: links.schoolHref(data.school_id),
          }
        : null;

  return {
    application: {
      id: data.id,
      status: data.status?.trim() || "lead",
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      submittedAt: data.submitted_at,
      assignedAt: data.assigned_at,
      scheduledAt: data.scheduled_at,
      inProgressAt: data.in_progress_at,
      blockedAt: data.blocked_at,
      curriculum: data.curriculum,
      expectedGraduationYear: data.expected_graduation_year,
      finalGrade: data.final_grade?.trim() || "—",
      gpa: data.gpa,
      sat: data.sat,
      act: data.act,
      ielts: data.ielts,
      toefl: data.toefl,
      intendedFields: data.inteended_fields?.trim() || "—",
      openToRelatedFields: data.open_to_realted_fields,
      preferredUniOrCountries: data.preferred_uni_or_countries?.trim() || "—",
      extracurricularActivities: data.extracurricular_activities?.trim() || "—",
      awards: data.awards?.trim() || null,
      additionalNotes: data.additional_notes?.trim() || null,
      preferencesUniversitiesNotes: data.preferences_universities_notes?.trim() || null,
      universities: parseUniversities(data.preferences_universities),
      studentName: studentFullName,
      studentEmail,
      studentPhone: studentPhone ?? "—",
      schoolNameOnApplication: data.school_name?.trim() || null,
    },
    plan: plan
      ? {
          name: plan.name?.trim() || "—",
          description: plan.description?.trim() || null,
          price: plan.price,
          universitiesCount: effectiveUniversitiesCount,
          defaultUniversitiesCount: planUniversitiesCount,
        }
      : null,
    advisor: advisorEmbed?.id
      ? {
          id: advisorEmbed.id,
          name:
            personName(advisorEmbed.first_name, advisorEmbed.last_name) ||
            advisorEmbed.email?.trim() ||
            "Advisor",
          email: advisorEmbed.email?.trim() || "—",
        }
      : null,
    student: {
      id: data.student_id,
      firstName: profileFirst || applicationStudentName.split(/\s+/)[0] || "",
      lastName:
        profileLast ||
        applicationStudentName.split(/\s+/).slice(1).join(" ") ||
        "",
      fullName: studentFullName,
      email: studentEmail,
      phone: studentPhone,
      grade: studentEmbed?.grade?.trim() || null,
      nationalityCountryCode: nationalityCode,
      nationalityLabel: nationalityCode
        ? getCountryNameByAlpha2(nationalityCode) ?? nationalityCode
        : "—",
      status: studentEmbed?.status ?? null,
      isActive: studentEmbed?.is_active ?? true,
      totalLogins: studentEmbed?.total_logins ?? null,
      flagged: studentEmbed?.flagged ?? false,
      flaggedBy: studentEmbed?.flagged_by ?? null,
      href: links.studentHref(data.student_id),
    },
    school,
    studentDocuments,
    universityTargets,
    payments: payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      status: resolvePaymentDisplayStatus({
        status: payment.status,
        due_date: payment.due_date,
      }),
      dueDate: payment.due_date,
      createdAt: payment.created_at,
      requestedAt: payment.payment_request_sent_at,
      paidAt:
        payment.status === "paid"
          ? payment.paid_at ?? payment.updated_at
          : payment.paid_at,
      payout: options.payoutByPaymentId?.get(payment.id) ?? null,
    })),
    internalNotes,
    calls,
    tasks,
    packageView: buildApplicationPackageView({
      packageData,
      planName: plan?.name ?? null,
      universitiesTotal: effectiveUniversitiesCount,
      totalPaidAed,
      fallbackStartedAt,
    }),
    payoutSummary: options.payoutSummary ?? null,
  };
}
