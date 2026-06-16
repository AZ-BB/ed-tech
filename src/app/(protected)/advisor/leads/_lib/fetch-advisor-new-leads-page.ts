import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import {
  ADMIN_APPLICATION_STATUS_LABEL,
  type ApplicationStatus,
} from "@/app/(protected)/admin/applications/_lib/application-status-labels";
import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const NON_ACTIVE_APPLICATION_STATUSES: ApplicationStatus[] = [
  "new",
  "scheduled",
  "blocked",
];

type LeadRowRaw = {
  id: number;
  student_name: string | null;
  student_email: string | null;
  school_name: string | null;
  status: string | null;
  assigned_at: string | null;
  created_at: string | null;
  applications_plans:
    | { name: string; universities_count: number }
    | { name: string; universities_count: number }[]
    | null;
  schools: { name: string } | { name: string }[] | null;
  student_profiles:
    | { first_name: string; last_name: string; email?: string | null }
    | { first_name: string; last_name: string; email?: string | null }[]
    | null;
};

export type AdvisorNewLeadRow = {
  id: number;
  studentName: string;
  studentInitials: string;
  studentEmail: string;
  schoolName: string;
  packageLabel: string;
  status: string;
  statusLabel: string;
  assignedAt: string | null;
  createdAt: string;
};

export type AdvisorNewLeadsPanelProps = {
  rows: AdvisorNewLeadRow[];
  totalRows: number;
  page: number;
  limit: number;
  search: string;
};

function paginationRange(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
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
  return [first?.trim(), last?.trim()].filter(Boolean).join(" ").trim();
}

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  const pair = `${a}${b}`.toUpperCase();
  return pair || "?";
}

function mapNewLeadRow(row: LeadRowRaw): AdvisorNewLeadRow {
  const profile = firstEmbed(row.student_profiles);
  const profileName = profile ? personName(profile.first_name, profile.last_name) : "";
  const studentName =
    profileName || row.student_name?.trim() || "Student";
  const studentEmail =
    profile?.email?.trim() || row.student_email?.trim() || "—";

  const school = firstEmbed(row.schools);
  const schoolName = school?.name?.trim() || row.school_name?.trim() || "—";

  const plan = firstEmbed(row.applications_plans);
  let packageLabel = "—";
  if (plan) {
    const count = plan.universities_count;
    if (Number.isFinite(count) && count > 0) {
      packageLabel = `${count} ${count === 1 ? "university" : "universities"}`;
    } else {
      packageLabel = plan.name?.trim() || "—";
    }
  }

  const status = row.status?.trim() || "new";
  const statusLabel =
    ADMIN_APPLICATION_STATUS_LABEL[status as ApplicationStatus] ?? status;

  return {
    id: row.id,
    studentName,
    studentInitials: studentInitials(studentName),
    studentEmail,
    schoolName,
    packageLabel,
    status,
    statusLabel,
    assignedAt: row.assigned_at,
    createdAt: row.created_at ?? new Date(0).toISOString(),
  };
}

export function parseAdvisorNewLeadsSearch(
  raw: string | string[] | undefined,
): string {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  return value?.trim() ?? "";
}

async function fetchPaidApplicationIds(
  client: DbClient,
  applicationIds: number[],
): Promise<number[]> {
  if (applicationIds.length === 0) return [];

  const { data, error } = await client
    .from("payments")
    .select("application_id")
    .eq("status", "paid")
    .in("application_id", applicationIds);

  if (error) {
    console.error("[fetchPaidApplicationIds]", error);
    return [];
  }

  return [...new Set((data ?? []).map((row) => row.application_id))];
}

async function fetchAdvisorNewLeadsPage(
  advisorId: string,
  options: { page: number; limit: number; search: string; client: DbClient },
): Promise<{ rows: AdvisorNewLeadRow[]; totalRows: number }> {
  const { page, limit, search, client } = options;
  const { from, to } = paginationRange(page, limit);

  const { data: assignedApps, error: assignedErr } = await client
    .from("applications")
    .select("id")
    .eq("assigned_to", advisorId);

  if (assignedErr) {
    console.error("[fetchAdvisorNewLeadsPage] assigned", assignedErr);
    return { rows: [], totalRows: 0 };
  }

  const assignedIds = (assignedApps ?? []).map((row) => row.id);
  if (assignedIds.length === 0) {
    return { rows: [], totalRows: 0 };
  }

  const paidApplicationIds = await fetchPaidApplicationIds(client, assignedIds);

  let query = client
    .from("applications")
    .select(
      `
      id,
      student_name,
      student_email,
      school_name,
      status,
      assigned_at,
      created_at,
      applications_plans ( name, universities_count ),
      schools ( name ),
      student_profiles ( first_name, last_name, email )
    `,
      { count: "exact" },
    )
    .eq("assigned_to", advisorId)
    .in("status", NON_ACTIVE_APPLICATION_STATUSES)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (paidApplicationIds.length > 0) {
    query = query.not("id", "in", `(${paidApplicationIds.join(",")})`);
  }

  if (search) {
    const e = escapeIlike(search);
    query = query.or(`student_name.ilike.%${e}%,student_email.ilike.%${e}%`);
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("[fetchAdvisorNewLeadsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const rows = ((data ?? []) as unknown as LeadRowRaw[]).map(mapNewLeadRow);

  return { rows, totalRows: count ?? 0 };
}

export async function fetchAdvisorNewLeadsPanel(options: {
  page: number;
  limit: number;
  search: string;
}): Promise<AdvisorNewLeadsPanelProps | null> {
  const supabase = await createSupabaseServerClient();
  const advisorId = await resolveCurrentAdvisorId(supabase);
  if (!advisorId) return null;

  const pageResult = await fetchAdvisorNewLeadsPage(advisorId, {
    ...options,
    client: supabase,
  });

  return {
    ...pageResult,
    page: options.page,
    limit: options.limit,
    search: options.search,
  };
}
