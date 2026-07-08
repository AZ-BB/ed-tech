import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { AdminInternshipSupportRequestsPageFilters } from "./parse-admin-internship-support-requests-search-params";

export type AdminInternshipSupportRequestTableRow = {
  id: string;
  studentId: string | null;
  fullName: string;
  email: string;
  schoolName: string;
  grade: string;
  preferredLocation: string;
  preferredFormat: string;
  interests: string[];
  payPreference: string;
  message: string | null;
  createdAt: string | null;
};

type SupportRequestQueryRow = {
  id: string;
  student_id: string | null;
  full_name: string;
  email: string;
  school_name: string;
  grade: string;
  preferred_location: string;
  preferred_format: string;
  interests: string[] | null;
  pay_preference: string;
  message: string | null;
  created_at: string | null;
};

export async function fetchAdminInternshipSupportRequestsPage(
  filters: AdminInternshipSupportRequestsPageFilters,
): Promise<{ rows: AdminInternshipSupportRequestTableRow[]; totalRows: number }> {
  const supabase = await createSupabaseSecretClient();
  const { q, page, limit } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("internship_support_requests")
    .select(
      "id, student_id, full_name, email, school_name, grade, preferred_location, preferred_format, interests, pay_preference, message, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  const trimmedQ = q.trim();
  if (trimmedQ) {
    const e = escapeIlike(trimmedQ);
    query = query.or(
      `full_name.ilike.%${e}%,email.ilike.%${e}%,school_name.ilike.%${e}%,preferred_location.ilike.%${e}%,message.ilike.%${e}%`,
    );
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("[fetchAdminInternshipSupportRequestsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const rows: AdminInternshipSupportRequestTableRow[] = (
    (data ?? []) as SupportRequestQueryRow[]
  ).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    fullName: row.full_name?.trim() ?? "",
    email: row.email?.trim() ?? "",
    schoolName: row.school_name?.trim() ?? "",
    grade: row.grade?.trim() ?? "",
    preferredLocation: row.preferred_location?.trim() ?? "",
    preferredFormat: row.preferred_format?.trim() ?? "",
    interests: Array.isArray(row.interests)
      ? row.interests.map((x) => x.trim()).filter(Boolean)
      : [],
    payPreference: row.pay_preference?.trim() ?? "",
    message: row.message?.trim() || null,
    createdAt: row.created_at ?? null,
  }));

  return { rows, totalRows: count ?? 0 };
}
