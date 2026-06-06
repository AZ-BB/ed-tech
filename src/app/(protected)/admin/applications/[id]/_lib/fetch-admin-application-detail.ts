import { getCountryNameByAlpha2 } from "@/lib/countries";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminApplicationDocumentRow = {
  id: number;
  type: string;
  typeLabel: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string | null;
};

export type AdminApplicationPaymentRow = {
  id: number;
  amount: number;
  status: string;
  createdAt: string | null;
};

export type AdminApplicationDetailPayload = {
  application: {
    id: number;
    status: string;
    internalNotes: string;
    createdAt: string | null;
    updatedAt: string | null;
    submittedAt: string | null;
    assignedAt: string | null;
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
  } | null;
  handler: {
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
    href: string;
  };
  school: {
    id: string;
    name: string;
    code: string;
    city: string | null;
    countryLabel: string;
    contactEmail: string | null;
    href: string;
  } | null;
  documents: AdminApplicationDocumentRow[];
  payments: AdminApplicationPaymentRow[];
};

type PreferencesUniversities = unknown;

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

const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  passport: "Passport",
  transcript: "Transcript",
  english_test_result: "English test result",
  personal_statement: "Personal statement",
  recommendation_letter: "Recommendation letter",
  cv: "CV",
  certificate: "Certificate",
  award: "Award",
  portfolio: "Portfolio",
};

function formatLocation(city: string | null, countryCode: string | null): string {
  const country = countryCode ? getCountryNameByAlpha2(countryCode) : undefined;
  if (city?.trim() && country) return `${city.trim()}, ${country}`;
  if (city?.trim()) return city.trim();
  if (country) return country;
  return "—";
}

export async function fetchAdminApplicationDetail(
  applicationIdRaw: string,
): Promise<AdminApplicationDetailPayload | null> {
  const applicationId = Number.parseInt(applicationIdRaw.trim(), 10);
  if (!Number.isFinite(applicationId) || applicationId < 1) return null;

  const supabase = await createSupabaseSecretClient();

  const { data, error } = await supabase
    .from("applications")
    .select(
      `
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
      internal_notes,
      status,
      assigned_to,
      submitted_at,
      assigned_at,
      in_progress_at,
      blocked_at,
      created_at,
      updated_at,
      applications_plans ( name, description, price, universities_count ),
      handlers:assigned_to ( id, first_name, last_name, email, phone ),
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
        total_logins
      )
    `,
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (error) {
    console.error("[fetchAdminApplicationDetail]", error);
    return null;
  }

  if (!data) return null;

  const [{ data: documents }, { data: payments }] = await Promise.all([
    supabase
      .from("application_documents")
      .select("id, type, file_name, file_size, file_type, created_at")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id, amount, status, created_at")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false }),
  ]);

  const plan = firstEmbed(data.applications_plans);
  const handlerEmbed = firstEmbed(data.handlers);
  const schoolEmbed = firstEmbed(data.schools);
  const studentEmbed = firstEmbed(data.student_profiles);

  const profileFirst = studentEmbed?.first_name?.trim() ?? "";
  const profileLast = studentEmbed?.last_name?.trim() ?? "";
  const profileFullName = personName(profileFirst, profileLast);
  const applicationStudentName = data.student_name?.trim() ?? "";

  const studentFullName =
    profileFullName || applicationStudentName || "Student";

  const studentEmail =
    studentEmbed?.email?.trim() || data.student_email?.trim() || "—";

  const studentPhone =
    studentEmbed?.phone?.trim() || data.student_phone?.trim() || null;

  const nationalityCode = studentEmbed?.nationality_country_code ?? null;

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
          href: `/admin/schools/${schoolId}`,
        }
      : data.school_id
        ? {
            id: data.school_id,
            name: data.school_name?.trim() || "—",
            code: "—",
            city: null,
            countryLabel: "—",
            contactEmail: null,
            href: `/admin/schools/${data.school_id}`,
          }
        : null;

  return {
    application: {
      id: data.id,
      status: data.status?.trim() || "new",
      internalNotes: data.internal_notes?.trim() ?? "",
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      submittedAt: data.submitted_at,
      assignedAt: data.assigned_at,
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
          universitiesCount: plan.universities_count,
        }
      : null,
    handler: handlerEmbed?.id
      ? {
          id: handlerEmbed.id,
          name:
            personName(handlerEmbed.first_name, handlerEmbed.last_name) ||
            handlerEmbed.email?.trim() ||
            "Handler",
          email: handlerEmbed.email?.trim() || "—",
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
      href: `/admin/users/students/${data.student_id}`,
    },
    school,
    documents: (documents ?? []).map((doc) => ({
      id: doc.id,
      type: doc.type,
      typeLabel: DOCUMENT_TYPE_LABEL[doc.type] ?? doc.type,
      fileName: doc.file_name?.trim() || "—",
      fileSize: doc.file_size,
      fileType: doc.file_type?.trim() || "—",
      uploadedAt: doc.created_at,
    })),
    payments: (payments ?? []).map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      status: payment.status?.trim() || "pending",
      createdAt: payment.created_at,
    })),
  };
}
