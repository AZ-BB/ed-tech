import { formatDistanceToNow } from "date-fns";

import {
  getStudentApplicationProfileCompletion,
  studentApplicationProfileRowToCompletionInput,
} from "@/lib/student-application-profile-completion";
import { createSupabaseServerClient } from "@/utils/supabase-server";

export type SchoolStudentTableRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  grade: string | null;
  destinationsSummary: string;
  programsSummary: string;
  profilePercent: number;
  unisCount: number;
  lastActiveIso: string | null;
  lastActiveLabel: string;
  counselorLabel: string;
};

export type SchoolStudentsPageFilters = {
  q: string;
  grade: string;
  destination: string;
  page: number;
  limit: number;
};

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function rollupShortlist(
  rows: {
    student_id: string;
    country: string | null;
    major_program: string | null;
    sort_order: number;
  }[],
) {
  const unisCountByStudent = new Map<string, number>();
  for (const r of rows) {
    unisCountByStudent.set(
      r.student_id,
      (unisCountByStudent.get(r.student_id) ?? 0) + 1,
    );
  }

  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);

  type Acc = {
    countries: string[];
    countrySeen: Set<string>;
    programs: string[];
  };
  const map = new Map<string, Acc>();

  for (const r of sorted) {
    let acc = map.get(r.student_id);
    if (!acc) {
      acc = { countries: [], countrySeen: new Set(), programs: [] };
      map.set(r.student_id, acc);
    }
    const c = r.country?.trim();
    if (c && acc.countries.length < 3) {
      const key = c.toLowerCase();
      if (!acc.countrySeen.has(key)) {
        acc.countrySeen.add(key);
        acc.countries.push(c);
      }
    }
    const p = r.major_program?.trim();
    if (p && acc.programs.length < 3) acc.programs.push(p);
  }

  const summaries = new Map<
    string,
    { destinationsSummary: string; programsSummary: string; unisCount: number }
  >();
  for (const [sid, acc] of map) {
    summaries.set(sid, {
      destinationsSummary: acc.countries.length
        ? acc.countries.join(", ")
        : "—",
      programsSummary: acc.programs.length ? acc.programs.join(", ") : "—",
      unisCount: unisCountByStudent.get(sid) ?? 0,
    });
  }
  return summaries;
}

function maxActivityByStudent(
  rows: { student_id: string | null; created_at: string | null }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of rows) {
    const sid = r.student_id;
    const t = r.created_at;
    if (!sid || !t) continue;
    const prev = map.get(sid);
    if (!prev || t > prev) map.set(sid, t);
  }
  return map;
}

export async function fetchSchoolStudentsPage(
  filters: SchoolStudentsPageFilters,
): Promise<{
  rows: SchoolStudentTableRow[];
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

  /** Students with ≥1 shortlisted row matching destination label (ILIKE, literal). */
  let destStudentIds: string[] | null = null;
  if (filters.destination.trim()) {
    const dest = filters.destination.trim();
    const { data: slMatch } = await supabase
      .from("student_shortlist_universities")
      .select("student_id")
      .ilike("country", dest);

    destStudentIds = [...new Set((slMatch ?? []).map((r) => r.student_id))];

    const { data: spSameSchool } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("school_id", schoolId);

    const allowed = new Set((spSameSchool ?? []).map((r) => r.id));
    destStudentIds = destStudentIds.filter((id) => allowed.has(id));

    if (destStudentIds.length === 0) {
      return { rows: [], totalRows: 0 };
    }
  }

  const offset = (page - 1) * limit;
  let listQuery = supabase
    .from("student_profiles")
    .select(
      "id, first_name, last_name, email, grade, updated_at, counselor_school_admin_id",
      {
        count: "exact",
      },
    )
    .eq("school_id", schoolId);

  const qTrim = filters.q.trim();
  if (qTrim) {
    const e = escapeIlike(qTrim);
    listQuery = listQuery.or(
      `first_name.ilike.%${e}%,last_name.ilike.%${e}%,email.ilike.%${e}%`,
    );
  }

  if (filters.grade.trim()) {
    listQuery = listQuery.eq("grade", filters.grade.trim());
  }

  if (destStudentIds) {
    listQuery = listQuery.in("id", destStudentIds);
  }

  listQuery = listQuery
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })
    .range(offset, offset + limit - 1);

  const { data: profiles, error: listErr, count } = await listQuery;

  if (listErr || !profiles) {
    console.error(listErr);
    return { rows: [], totalRows: 0 };
  }

  const totalRows = count ?? 0;

  const ids = profiles.map((p) => p.id);
  if (ids.length === 0) {
    return { rows: [], totalRows };
  }

  const counselorIds = [
    ...new Set(
      profiles.map((p) => p.counselor_school_admin_id).filter(Boolean),
    ),
  ] as string[];

  const counselorNames = new Map<string, string>();
  if (counselorIds.length > 0) {
    const { data: counselors } = await supabase
      .from("school_admin_profiles")
      .select("id, first_name, last_name")
      .in("id", counselorIds);

    for (const c of counselors ?? []) {
      counselorNames.set(
        c.id,
        `${c.first_name?.trim() ?? ""} ${c.last_name?.trim() ?? ""}`.trim(),
      );
    }
  }

  const [slRes, actRes, appProfRes] = await Promise.all([
    supabase
      .from("student_shortlist_universities")
      .select("student_id, country, major_program, sort_order")
      .in("student_id", ids),
    supabase
      .from("student_activities")
      .select("student_id, created_at")
      .in("student_id", ids),
    supabase
      .from("student_application_profile")
      .select(
        "student_id, grade, curriculum, preferred_destinations, interested_programs, english_test_scores, sat_act_scores",
      )
      .in("student_id", ids),
  ]);

  const slRoll = rollupShortlist(slRes.data ?? []);

  /** Last interaction time per student (any activity row). */
  const lastActive = maxActivityByStudent(actRes.data ?? []);

  const appProfByStudent = new Map<
    string,
    NonNullable<typeof appProfRes.data>[number]
  >();
  if (appProfRes.error) {
    console.error(
      "[fetchSchoolStudentsPage] student_application_profile:",
      appProfRes.error.message,
    );
  } else {
    for (const row of appProfRes.data ?? []) {
      appProfByStudent.set(row.student_id, row);
    }
  }

  const rows: SchoolStudentTableRow[] = profiles.map((p) => {
    const slMeta = slRoll.get(p.id);
    const appRow = appProfByStudent.get(p.id);
    const pct = getStudentApplicationProfileCompletion(
      studentApplicationProfileRowToCompletionInput(appRow),
    ).pct;

    const activityIso = lastActive.get(p.id) ?? p.updated_at ?? null;
    let lastActiveLabel = "—";
    if (activityIso) {
      try {
        lastActiveLabel = formatDistanceToNow(new Date(activityIso), {
          addSuffix: true,
        });
      } catch {
        lastActiveLabel = "—";
      }
    }

    const cid = p.counselor_school_admin_id;
    const counselorLabel =
      cid && counselorNames.get(cid)
        ? (counselorNames.get(cid) as string)
        : "—";

    return {
      id: p.id,
      firstName: p.first_name?.trim() ?? "",
      lastName: p.last_name?.trim() ?? "",
      email: p.email?.trim() ?? "",
      grade: p.grade?.trim() ?? null,
      destinationsSummary: slMeta?.destinationsSummary ?? "—",
      programsSummary: slMeta?.programsSummary ?? "—",
      profilePercent: pct,
      unisCount: slMeta?.unisCount ?? 0,
      lastActiveIso: activityIso,
      lastActiveLabel,
      counselorLabel,
    };
  });

  return { rows, totalRows };
}
