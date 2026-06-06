import {
  buildOrWithStudentIds,
  fetchSchoolStudentIdsByQuery,
  orIlikeClause,
} from "@/app/(protected)/school/_lib/student-search";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import { schoolApplicationFilterToShortlistStatus } from "./application-support-status-labels";

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export type SchoolApplicationTableRow = {
  rowKey: string;
  shortlistId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  email: string;
  universityName: string;
  country: string | null;
  program: string | null;
  /** ISO date when the application was marked submitted, if any */
  submittedAt: string | null;
  status: string;
  decision: string | null;
};

export type SchoolApplicationsPageFilters = {
  q: string;
  /** Navbar student name/email filter */
  studentQ: string;
  /** Kept for URL compatibility; not applied (no per-university deadlines on this flow). */
  deadline: string;
  /** Filter key (`considering`, …) or legacy DB enum; see `schoolApplicationFilterToShortlistStatus`. */
  status: string;
  /** Match against shortlist `country` (substring, case-insensitive) */
  country: string;
  page: number;
  limit: number;
};

type ShortlistQueryRow = {
  id: string;
  student_id: string;
  university_name: string;
  country: string | null;
  major_program: string | null;
  status: string;
  decision: string | null;
  updated_at: string;
  student_profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
    school_id: string;
  };
};

export async function fetchSchoolApplicationsPage(
  filters: SchoolApplicationsPageFilters,
): Promise<{
  rows: SchoolApplicationTableRow[];
  totalRows: number;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { rows: [], totalRows: 0 };
  }

  const { data: sap } = await supabase
    .from("school_admin_profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  const schoolId = sap?.school_id;
  if (!schoolId) {
    return { rows: [], totalRows: 0 };
  }

  const page = Math.max(1, filters.page);
  const limit = Math.min(50, Math.max(5, filters.limit));
  const offset = (page - 1) * limit;

  const qTrim = filters.q.trim();
  const studentQTrim = filters.studentQ.trim();
  const statusFilter = schoolApplicationFilterToShortlistStatus(filters.status);
  const countryTrim = filters.country.trim();

  let q = supabase
    .from("student_shortlist_universities")
    .select(
      `
      id,
      student_id,
      university_name,
      country,
      major_program,
      status,
      decision,
      updated_at,
      student_profiles!inner (
        first_name,
        last_name,
        email,
        avatar_url,
        school_id
      )
    `,
      { count: "exact" },
    )
    .eq("student_profiles.school_id", schoolId);

  if (studentQTrim) {
    const navbarStudentIds = await fetchSchoolStudentIdsByQuery(
      supabase,
      schoolId,
      studentQTrim,
    );
    if (navbarStudentIds.length === 0) {
      return { rows: [], totalRows: 0 };
    }
    q = q.in("student_id", navbarStudentIds);
  }

  if (qTrim) {
    const studentIds = await fetchSchoolStudentIdsByQuery(
      supabase,
      schoolId,
      qTrim,
    );
    const shortlistFieldPatterns = orIlikeClause(
      ["university_name", "country", "major_program"],
      qTrim,
    ).split(",");
    q = q.or(buildOrWithStudentIds(shortlistFieldPatterns, studentIds));
  }

  if (statusFilter === "rejected") {
    q = q.or("status.eq.withdrawn,decision.eq.rejected");
  } else if (statusFilter) {
    q = q.eq("status", statusFilter);
  }

  if (countryTrim) {
    const e = escapeIlike(countryTrim);
    q = q.ilike("country", `%${e}%`);
  }

  q = q
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await q;

  if (error) {
    console.error("[fetchSchoolApplicationsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const rows: SchoolApplicationTableRow[] = (data ?? []).map((raw) => {
    const r = raw as unknown as ShortlistQueryRow;
    const sp = r.student_profiles;
    const status = r.status?.trim() || "considering";
    return {
      rowKey: r.id,
      shortlistId: r.id,
      studentId: r.student_id,
      firstName: sp?.first_name?.trim() ?? "",
      lastName: sp?.last_name?.trim() ?? "",
      avatarUrl: sp?.avatar_url?.trim() || null,
      email: sp?.email?.trim() ?? "",
      universityName: r.university_name?.trim() || "—",
      country: r.country?.trim() || null,
      program: r.major_program?.trim() || null,
      submittedAt: status === "submitted" ? r.updated_at : null,
      status,
      decision: r.decision?.trim() || null,
    };
  });

  return {
    rows,
    totalRows: count ?? 0,
  };
}
