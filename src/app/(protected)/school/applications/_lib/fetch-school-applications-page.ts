import type { Database } from "@/database.types";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import { schoolApplicationFilterToDbStatus } from "./application-support-status-labels";

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export type SchoolApplicationTableRow = {
  rowKey: string;
  applicationId: number;
  studentId: string;
  firstName: string;
  lastName: string;
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
  /** Kept for URL compatibility; not applied (no per-university deadlines on this flow). */
  deadline: string;
  /** Filter key (`considering`, …) or legacy DB enum; see `schoolApplicationFilterToDbStatus`. */
  status: string;
  /** Match against `preferred_uni_or_countries` (substring, case-insensitive) */
  country: string;
  page: number;
  limit: number;
};

type PreferencesUniversities = unknown;

function parsePreferencesUniversities(json: PreferencesUniversities): string[] {
  if (!json || !Array.isArray(json)) return [];
  return json
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

type AppRowRaw = {
  id: number;
  student_id: string;
  student_name: string | null;
  student_email: string | null;
  preferences_universities: PreferencesUniversities;
  preferred_uni_or_countries: string;
  inteended_fields: string;
  status: string | null;
  submitted_at: string | null;
  student_profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

function splitStudentName(full: string | null | undefined): {
  first: string;
  last: string;
} {
  const t = full?.trim() ?? "";
  if (!t) return { first: "", last: "" };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { first: parts[0] ?? "", last: "" };
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

function buildRowsFromApplications(
  apps: AppRowRaw[],
): SchoolApplicationTableRow[] {
  const out: SchoolApplicationTableRow[] = [];
  for (const r of apps) {
    const sp = r.student_profiles;
    const fromProfileFirst = sp?.first_name?.trim() ?? "";
    const fromProfileLast = sp?.last_name?.trim() ?? "";
    const fromProfileEmail = sp?.email?.trim() ?? "";
    const split = splitStudentName(r.student_name);
    const firstName = fromProfileFirst || split.first;
    const lastName = fromProfileLast || split.last;
    const email = fromProfileEmail || r.student_email?.trim() || "";

    const unis = parsePreferencesUniversities(r.preferences_universities);
    const uniList = unis.length > 0 ? unis : ["—"];
    const status = r.status?.trim() || "new";
    const country =
      r.preferred_uni_or_countries?.trim() &&
      r.preferred_uni_or_countries.trim() !== "—"
        ? r.preferred_uni_or_countries.trim()
        : null;
    const program = r.inteended_fields?.trim() || null;

    for (let i = 0; i < uniList.length; i++) {
      const universityName = uniList[i] ?? "—";
      out.push({
        rowKey: `${r.id}-${i}`,
        applicationId: r.id,
        studentId: r.student_id,
        firstName,
        lastName,
        email,
        universityName,
        country,
        program,
        submittedAt: r.submitted_at,
        status,
        decision: null,
      });
    }
  }
  return out;
}

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

  const qTrim = filters.q.trim().toLowerCase();
  const status = schoolApplicationFilterToDbStatus(filters.status);
  const countryTrim = filters.country.trim();

  let q = supabase
    .from("applications")
    .select(
      `
      id,
      student_id,
      student_name,
      student_email,
      preferences_universities,
      preferred_uni_or_countries,
      inteended_fields,
      status,
      submitted_at,
      student_profiles (
        first_name,
        last_name,
        email
      )
    `,
    )
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (status) {
    q = q.eq(
      "status",
      status as Database["public"]["Enums"]["application_status"],
    );
  }

  if (countryTrim) {
    const e = escapeIlike(countryTrim);
    q = q.ilike("preferred_uni_or_countries", `%${e}%`);
  }

  const { data, error } = await q;

  if (error) {
    console.error("[fetchSchoolApplicationsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const apps = (data ?? []) as unknown as AppRowRaw[];
  let rows = buildRowsFromApplications(apps);

  if (qTrim) {
    rows = rows.filter((r) => {
      const hay = [
        r.firstName,
        r.lastName,
        r.email,
        r.universityName,
        r.country,
        r.program,
        String(r.applicationId),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(qTrim);
    });
  }

  const totalRows = rows.length;
  const pageRows = rows.slice(offset, offset + limit);

  return { rows: pageRows, totalRows };
}
