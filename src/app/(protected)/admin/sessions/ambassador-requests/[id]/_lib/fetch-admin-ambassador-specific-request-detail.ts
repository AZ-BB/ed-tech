import { getCountryNameByAlpha2 } from "@/lib/countries";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type SchoolEmbed =
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

type StudentEmbed =
  | {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      grade: string | null;
      schools: SchoolEmbed;
    }
  | {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      grade: string | null;
      schools: SchoolEmbed;
    }[]
  | null;

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function personName(first: string | null | undefined, last: string | null | undefined): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(" ").trim() || "—";
}

export type AdminAmbassadorSpecificRequestDetail = {
  id: number;
  status: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  targetUniversity: string;
  preferredMajor: string | null;
  additionalNotes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminAmbassadorSpecificRequestDetailStudent = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  grade: string | null;
  href: string;
};

export type AdminAmbassadorSpecificRequestDetailSchool = {
  id: string;
  name: string;
  code: string;
  city: string | null;
  countryLabel: string;
  href: string;
};

export type AdminAmbassadorSpecificRequestDetailPayload = {
  request: AdminAmbassadorSpecificRequestDetail;
  student: AdminAmbassadorSpecificRequestDetailStudent | null;
  school: AdminAmbassadorSpecificRequestDetailSchool | null;
};

function mapStudent(embed: StudentEmbed): AdminAmbassadorSpecificRequestDetailStudent | null {
  const profile = firstEmbed(embed);
  if (!profile) return null;

  return {
    id: profile.id,
    fullName: personName(profile.first_name, profile.last_name),
    email: profile.email?.trim() || "—",
    phone: profile.phone?.trim() || null,
    grade: profile.grade?.trim() || null,
    href: `/admin/users/students/${profile.id}`,
  };
}

function mapSchool(embed: StudentEmbed): AdminAmbassadorSpecificRequestDetailSchool | null {
  const profile = firstEmbed(embed);
  if (!profile) return null;

  const school = firstEmbed(profile.schools);
  if (!school) return null;

  return {
    id: school.id,
    name: school.name?.trim() || "—",
    code: school.code?.trim() || "—",
    city: school.city?.trim() || null,
    countryLabel: school.country_code
      ? (getCountryNameByAlpha2(school.country_code) ?? school.country_code)
      : "—",
    href: `/admin/schools/${school.id}`,
  };
}

export async function fetchAdminAmbassadorSpecificRequestDetail(
  id: number,
): Promise<AdminAmbassadorSpecificRequestDetailPayload | null> {
  const supabase = await createSupabaseSecretClient();

  const { data, error } = await supabase
    .from("ambassador_specific_requests")
    .select(
      `
      id,
      status,
      student_name,
      student_email,
      student_phone,
      target_university,
      preferred_major,
      additional_notes,
      created_at,
      updated_at,
      student_profiles (
        id,
        first_name,
        last_name,
        email,
        phone,
        grade,
        schools ( id, name, code, city, country_code )
      )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[fetchAdminAmbassadorSpecificRequestDetail]", error);
    return null;
  }

  if (!data) return null;

  const row = data as {
    id: number;
    status: string;
    student_name: string;
    student_email: string;
    student_phone: string;
    target_university: string;
    preferred_major: string | null;
    additional_notes: string | null;
    created_at: string | null;
    updated_at: string | null;
    student_profiles: StudentEmbed;
  };

  return {
    request: {
      id: row.id,
      status: row.status?.trim() || "pending",
      studentName: row.student_name?.trim() || "—",
      studentEmail: row.student_email?.trim() || "—",
      studentPhone: row.student_phone?.trim() || "—",
      targetUniversity: row.target_university?.trim() || "—",
      preferredMajor: row.preferred_major?.trim() || null,
      additionalNotes: row.additional_notes?.trim() || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    student: mapStudent(row.student_profiles),
    school: mapSchool(row.student_profiles),
  };
}
