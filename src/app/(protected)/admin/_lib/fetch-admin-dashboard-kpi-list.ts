import { format } from "date-fns";

import { ADMIN_APPLICATION_STATUS_LABEL } from "../applications/_lib/application-status-labels";
import type { AdminDashboardKpiKey } from "./fetch-admin-dashboard";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { ADMIN_SESSION_STATUS_LABEL } from "../sessions/_lib/session-status-labels";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminDashboardKpiListItem = {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

export type AdminDashboardKpiListResult = {
  rows: AdminDashboardKpiListItem[];
  totalRows: number;
};

const ACTIVE_APPLICATION_STATUSES = [
  "new",
  "scheduled",
  "in_progress",
  "blocked",
] as const;

function paginationRange(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 50);
  const from = (safePage - 1) * safeLimit;
  return { from, to: from + safeLimit - 1 };
}

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function personName(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  const name = [first?.trim(), last?.trim()].filter(Boolean).join(" ").trim();
  return name || "—";
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function sessionStatusLabel(status: string | null | undefined): string {
  const key = status?.trim() ?? "";
  return ADMIN_SESSION_STATUS_LABEL[key] ?? (key || "—");
}

async function fetchStudentsKpiList(
  page: number,
  limit: number,
): Promise<AdminDashboardKpiListResult> {
  const supabase = await createSupabaseSecretClient();
  const { from, to } = paginationRange(page, limit);

  const { data, count, error } = await supabase
    .from("student_profiles")
    .select("id, first_name, last_name, email, schools(name)", { count: "exact" })
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("[fetchAdminDashboardKpiList] students", error);
    return { rows: [], totalRows: 0 };
  }

  const rows: AdminDashboardKpiListItem[] = (data ?? []).map((row) => {
    const school = firstEmbed(row.schools);
    const title = personName(row.first_name, row.last_name);
    const email = row.email?.trim();
    const schoolName = school?.name?.trim();
    const subtitle = [email, schoolName].filter(Boolean).join(" · ") || null;

    return {
      id: row.id,
      title,
      subtitle,
      href: `/admin/users/students/${row.id}`,
    };
  });

  return { rows, totalRows: count ?? 0 };
}

async function fetchSchoolsKpiList(
  page: number,
  limit: number,
): Promise<AdminDashboardKpiListResult> {
  const supabase = await createSupabaseSecretClient();
  const { from, to } = paginationRange(page, limit);

  const { data, count, error } = await supabase
    .from("schools")
    .select("id, name, code, city, country_code", { count: "exact" })
    .eq("is_active", true)
    .order("name", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("[fetchAdminDashboardKpiList] schools", error);
    return { rows: [], totalRows: 0 };
  }

  const rows: AdminDashboardKpiListItem[] = (data ?? []).map((row) => {
    const country = getCountryNameByAlpha2(row.country_code);
    const location = [row.city?.trim(), country].filter(Boolean).join(", ");
    const subtitle = [row.code?.trim(), location].filter(Boolean).join(" · ") || null;

    return {
      id: row.id,
      title: row.name?.trim() || "—",
      subtitle,
      href: `/admin/schools/${row.id}`,
    };
  });

  return { rows, totalRows: count ?? 0 };
}

async function fetchAmbassadorSessionsKpiList(
  page: number,
  limit: number,
): Promise<AdminDashboardKpiListResult> {
  const supabase = await createSupabaseSecretClient();
  const { from, to } = paginationRange(page, limit);

  const { data, count, error } = await supabase
    .from("ambassador_session_requests")
    .select(
      `
      id,
      status,
      created_at,
      student_name,
      student_profiles ( first_name, last_name ),
      ambassadors:ambassador_id ( first_name, last_name )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[fetchAdminDashboardKpiList] ambassador sessions", error);
    return { rows: [], totalRows: 0 };
  }

  const rows: AdminDashboardKpiListItem[] = (data ?? []).map((row) => {
    const student = firstEmbed(row.student_profiles);
    const ambassador = firstEmbed(row.ambassadors);
    const studentName =
      row.student_name?.trim() || personName(student?.first_name, student?.last_name);
    const ambassadorName = personName(ambassador?.first_name, ambassador?.last_name);

    return {
      id: String(row.id),
      title: studentName,
      subtitle: `${ambassadorName} · ${sessionStatusLabel(row.status)} · ${formatWhen(row.created_at)}`,
      href: `/admin/sessions/view/ambassador/${row.id}`,
    };
  });

  return { rows, totalRows: count ?? 0 };
}

async function fetchAdvisorSessionsKpiList(
  page: number,
  limit: number,
): Promise<AdminDashboardKpiListResult> {
  const supabase = await createSupabaseSecretClient();
  const { from, to } = paginationRange(page, limit);

  const { data, count, error } = await supabase
    .from("advisor_sessions")
    .select(
      `
      id,
      status,
      booked_at,
      created_at,
      student_name,
      student_profiles ( first_name, last_name ),
      advisors:advisor_id ( first_name, last_name )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[fetchAdminDashboardKpiList] advisor sessions", error);
    return { rows: [], totalRows: 0 };
  }

  const rows: AdminDashboardKpiListItem[] = (data ?? []).map((row) => {
    const student = firstEmbed(row.student_profiles);
    const advisor = firstEmbed(row.advisors);
    const studentName =
      row.student_name?.trim() || personName(student?.first_name, student?.last_name);
    const advisorName = personName(advisor?.first_name, advisor?.last_name);
    const when = formatWhen(row.booked_at ?? row.created_at);

    return {
      id: String(row.id),
      title: studentName,
      subtitle: `${advisorName} · ${sessionStatusLabel(row.status)} · ${when}`,
      href: `/admin/sessions/view/advisor/${row.id}`,
    };
  });

  return { rows, totalRows: count ?? 0 };
}

async function fetchApplicationsKpiList(
  page: number,
  limit: number,
): Promise<AdminDashboardKpiListResult> {
  const supabase = await createSupabaseSecretClient();
  const { from, to } = paginationRange(page, limit);

  const { data, count, error } = await supabase
    .from("applications")
    .select(
      `
      id,
      status,
      student_name,
      updated_at,
      student_profiles ( first_name, last_name, schools ( name ) )
    `,
      { count: "exact" },
    )
    .in("status", [...ACTIVE_APPLICATION_STATUSES])
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[fetchAdminDashboardKpiList] applications", error);
    return { rows: [], totalRows: 0 };
  }

  const rows: AdminDashboardKpiListItem[] = (data ?? []).map((row) => {
    const student = firstEmbed(row.student_profiles);
    const school = student ? firstEmbed(student.schools) : null;
    const studentName =
      row.student_name?.trim() || personName(student?.first_name, student?.last_name);
    const statusKey = (row.status?.trim() ?? "new") as keyof typeof ADMIN_APPLICATION_STATUS_LABEL;
    const statusLabel = ADMIN_APPLICATION_STATUS_LABEL[statusKey] ?? row.status ?? "—";
    const schoolName = school?.name?.trim();

    return {
      id: String(row.id),
      title: `Application #${row.id}`,
      subtitle: [studentName, schoolName, statusLabel].filter(Boolean).join(" · "),
      href: `/admin/applications/${row.id}`,
    };
  });

  return { rows, totalRows: count ?? 0 };
}

export async function fetchAdminDashboardKpiList(
  kpiKey: AdminDashboardKpiKey,
  page: number,
  limit: number,
): Promise<AdminDashboardKpiListResult> {
  switch (kpiKey) {
    case "students":
      return fetchStudentsKpiList(page, limit);
    case "schools":
      return fetchSchoolsKpiList(page, limit);
    case "ambassador_sessions":
      return fetchAmbassadorSessionsKpiList(page, limit);
    case "sessions":
      return fetchAdvisorSessionsKpiList(page, limit);
    case "applications":
      return fetchApplicationsKpiList(page, limit);
  }
}
