import { getCountryNameByAlpha2 } from "@/lib/countries";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { AdminSessionKind } from "../_data/sessions-tabs-data";

type PersonEmbed =
  | {
      id: string;
      first_name: string;
      last_name: string;
      email?: string;
      title?: string | null;
      phone?: string | null;
      university_name?: string | null;
      major?: string | null;
    }
  | {
      id: string;
      first_name: string;
      last_name: string;
      email?: string;
      title?: string | null;
      phone?: string | null;
      university_name?: string | null;
      major?: string | null;
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

export type AdminSessionDetailProvider = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  title: string | null;
  subtitle: string | null;
  href: string;
};

export type AdminSessionDetailStudent = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  grade: string | null;
  href: string;
};

export type AdminSessionDetailSchool = {
  id: string;
  name: string;
  code: string;
  city: string | null;
  countryLabel: string;
  href: string;
};

export type AdminSessionAdvisorDetail = {
  kind: "advisor";
  id: number;
  status: string;
  bookedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  currentStage: string;
  destinationCountryCode: string;
  destinationLabel: string;
  specificUni: string | null;
  helpWith: string | null;
  studentName: string;
  studentEmail: string | null;
  studentPhone: string | null;
};

export type AdminSessionAmbassadorDetail = {
  kind: "ambassador";
  id: number;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  prefTime1: string;
  prefTime2: string | null;
  prefTime3: string | null;
  discussionTopics: string | null;
  studentName: string;
  studentEmail: string | null;
  studentPhone: string | null;
};

export type AdminSessionDetailPayload = {
  session: AdminSessionAdvisorDetail | AdminSessionAmbassadorDetail;
  provider: AdminSessionDetailProvider;
  student: AdminSessionDetailStudent;
  school: AdminSessionDetailSchool | null;
};

function mapProvider(
  kind: AdminSessionKind,
  embed: PersonEmbed,
): AdminSessionDetailProvider | null {
  const person = firstEmbed(embed);
  if (!person) return null;

  const fullName = personName(person.first_name, person.last_name);
  const segment = kind === "advisor" ? "advisors" : "ambassadors";

  return {
    id: person.id,
    fullName,
    email: person.email?.trim() || "—",
    phone: person.phone?.trim() || null,
    title: person.title?.trim() || null,
    subtitle:
      kind === "ambassador"
        ? [person.university_name, person.major].filter(Boolean).join(" · ") || null
        : null,
    href: `/admin/users/${segment}/${person.id}`,
  };
}

function mapStudent(embed: StudentEmbed): AdminSessionDetailStudent | null {
  const profile = firstEmbed(embed);
  if (!profile) return null;

  const fullName = personName(profile.first_name, profile.last_name);

  return {
    id: profile.id,
    fullName,
    email: profile.email?.trim() || "—",
    phone: profile.phone?.trim() || null,
    grade: profile.grade?.trim() || null,
    href: `/admin/users/students/${profile.id}`,
  };
}

function mapSchool(embed: StudentEmbed): AdminSessionDetailSchool | null {
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

export async function fetchAdminSessionDetail(
  kind: AdminSessionKind,
  id: number,
): Promise<AdminSessionDetailPayload | null> {
  const supabase = await createSupabaseSecretClient();

  if (kind === "advisor") {
    const { data, error } = await supabase
      .from("advisor_sessions")
      .select(
        `
        id,
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
        advisors:advisor_id (
          id,
          first_name,
          last_name,
          email,
          title,
          phone
        ),
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
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      console.error("[fetchAdminSessionDetail] advisor", error);
      return null;
    }

    const provider = mapProvider("advisor", data.advisors as PersonEmbed);
    const student = mapStudent(data.student_profiles as StudentEmbed);
    if (!provider || !student) return null;

    const destinationCode = data.destination_country_code?.trim() || "";

    return {
      session: {
        kind: "advisor",
        id: data.id,
        status: data.status?.trim() || "pending",
        bookedAt: data.booked_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        currentStage: data.current_stage?.trim() || "—",
        destinationCountryCode: destinationCode,
        destinationLabel: destinationCode
          ? (getCountryNameByAlpha2(destinationCode) ?? destinationCode)
          : "—",
        specificUni: data.specific_uni?.trim() || null,
        helpWith: data.help_with?.trim() || null,
        studentName: data.student_name?.trim() || student.fullName,
        studentEmail: data.student_email?.trim() || student.email,
        studentPhone: data.student_phone?.trim() || student.phone,
      },
      provider,
      student,
      school: mapSchool(data.student_profiles as StudentEmbed),
    };
  }

  const { data, error } = await supabase
    .from("ambassador_session_requests")
    .select(
      `
      id,
      status,
      created_at,
      updated_at,
      pref_time_1,
      pref_time_2,
      pref_time_3,
      discussion_topics,
      student_name,
      student_email,
      student_phone,
      ambassadors:ambassador_id (
        id,
        first_name,
        last_name,
        email,
        university_name,
        major
      ),
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
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    console.error("[fetchAdminSessionDetail] ambassador", error);
    return null;
  }

  const provider = mapProvider("ambassador", data.ambassadors as PersonEmbed);
  const student = mapStudent(data.student_profiles as StudentEmbed);
  if (!provider || !student) return null;

  return {
    session: {
      kind: "ambassador",
      id: data.id,
      status: data.status?.trim() || "pending",
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      prefTime1: data.pref_time_1,
      prefTime2: data.pref_time_2,
      prefTime3: data.pref_time_3,
      discussionTopics: data.discussion_topics?.trim() || null,
      studentName: data.student_name?.trim() || student.fullName,
      studentEmail: data.student_email?.trim() || student.email,
      studentPhone: data.student_phone?.trim() || student.phone,
    },
    provider,
    student,
    school: mapSchool(data.student_profiles as StudentEmbed),
  };
}
