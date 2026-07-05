import { ADMIN_SESSION_STATUS_LABEL } from "@/app/(protected)/admin/sessions/_lib/session-status-labels";
import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import {
  hydrateApplicationsPlansEmbeds,
} from "@/lib/applications-plans";
import { isMeetingOverdue } from "@/lib/meeting-overdue";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

export type AdvisorSessionsAndCallsRowKind = "application_lead" | "advisor_session";

export type AdvisorSessionsAndCallsRow = {
  kind: AdvisorSessionsAndCallsRowKind;
  id: string;
  studentName: string;
  studentEmail: string;
  schoolName: string;
  meetingAt: string;
  isOverdue: boolean;
  statusLabel: string;
  subtitle: string;
};

export type AdvisorSessionsAndCallsTypeFilter =
  | "all"
  | "application_lead"
  | "advisor_session";

export type AdvisorSessionsAndCallsPanelProps = {
  rows: AdvisorSessionsAndCallsRow[];
  totalRows: number;
  page: number;
  limit: number;
  search: string;
  type: AdvisorSessionsAndCallsTypeFilter;
  typeCounts: Record<AdvisorSessionsAndCallsTypeFilter, number>;
};

type LeadRowRaw = {
  id: number;
  plan_id: number;
  student_name: string | null;
  student_email: string | null;
  school_name: string | null;
  scheduled_at: string;
  applications_plans:
    | { name: string }
    | { name: string }[]
    | null;
  schools: { name: string } | { name: string }[] | null;
  student_profiles:
    | { first_name: string; last_name: string; email?: string | null }
    | { first_name: string; last_name: string; email?: string | null }[]
    | null;
};

type SessionRowRaw = {
  id: number;
  status: string | null;
  booked_at: string;
  destination_country_code: string | null;
  help_with: string | null;
  student_name: string | null;
  student_email: string | null;
  student_profiles:
    | {
        first_name: string;
        last_name: string;
        email: string;
        schools: { name: string } | { name: string }[] | null;
      }
    | {
        first_name: string;
        last_name: string;
        email: string;
        schools: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

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

function paginationRange(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const from = (safePage - 1) * safeLimit;
  return { from, to: from + safeLimit - 1 };
}

function sortRows(rows: AdvisorSessionsAndCallsRow[]): AdvisorSessionsAndCallsRow[] {
  return [...rows].sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) {
      return a.isOverdue ? -1 : 1;
    }
    return new Date(a.meetingAt).getTime() - new Date(b.meetingAt).getTime();
  });
}

function matchesSearch(
  row: { studentName: string; studentEmail: string },
  search: string,
): boolean {
  if (!search) return true;
  const needle = search.toLowerCase();
  return (
    row.studentName.toLowerCase().includes(needle) ||
    row.studentEmail.toLowerCase().includes(needle)
  );
}

function mapLeadRow(row: LeadRowRaw): AdvisorSessionsAndCallsRow {
  const profile = firstEmbed(row.student_profiles);
  const profileName = profile
    ? personName(profile.first_name, profile.last_name)
    : "";
  const studentName = profileName || row.student_name?.trim() || "Student";
  const studentEmail =
    profile?.email?.trim() || row.student_email?.trim() || "—";
  const school = firstEmbed(row.schools);
  const schoolName = school?.name?.trim() || row.school_name?.trim() || "—";
  const plan = firstEmbed(row.applications_plans);
  const meetingAt = row.scheduled_at;

  return {
    kind: "application_lead",
    id: String(row.id),
    studentName,
    studentEmail,
    schoolName,
    meetingAt,
    isOverdue: isMeetingOverdue(meetingAt),
    statusLabel: "Lead",
    subtitle: plan?.name?.trim() || "Application support",
  };
}

function mapSessionRow(row: SessionRowRaw): AdvisorSessionsAndCallsRow {
  const studentEmbed = firstEmbed(row.student_profiles);
  const profileName = studentEmbed
    ? personName(studentEmbed.first_name, studentEmbed.last_name)
    : "";
  const studentName = row.student_name?.trim() || profileName || "Student";
  const studentEmail =
    row.student_email?.trim() || studentEmbed?.email?.trim() || "—";
  const school = studentEmbed ? firstEmbed(studentEmbed.schools) : null;
  const schoolName = school?.name?.trim() || "—";
  const destinationCode = row.destination_country_code?.trim() || "";
  const destinationLabel = destinationCode
    ? (getCountryNameByAlpha2(destinationCode) ?? destinationCode)
    : "—";
  const status = row.status?.trim() || "pending";
  const meetingAt = row.booked_at;
  const helpWith = row.help_with?.trim();

  return {
    kind: "advisor_session",
    id: String(row.id),
    studentName,
    studentEmail,
    schoolName,
    meetingAt,
    isOverdue: isMeetingOverdue(meetingAt),
    statusLabel: ADMIN_SESSION_STATUS_LABEL[status] ?? status,
    subtitle: helpWith ? `${destinationLabel} · ${helpWith}` : destinationLabel,
  };
}

export function parseAdvisorSessionsAndCallsSearch(
  raw: string | string[] | undefined,
): string {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  return value?.trim() ?? "";
}

export function parseAdvisorSessionsAndCallsType(
  raw: string | string[] | undefined,
): AdvisorSessionsAndCallsTypeFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (value === "application_lead" || value === "advisor_session") {
    return value;
  }
  return "all";
}

async function fetchLeadRows(
  advisorId: string,
  search: string,
): Promise<AdvisorSessionsAndCallsRow[]> {
  const secret = await createSupabaseSecretClient();

  let query = secret
    .from("applications")
    .select(
      `
      id,
      plan_id,
      student_name,
      student_email,
      school_name,
      scheduled_at,
      applications_plans!applications_plan_id_fkey ( name ),
      schools ( name ),
      student_profiles ( first_name, last_name, email )
    `,
    )
    .eq("assigned_to", advisorId)
    .eq("status", "lead")
    .not("scheduled_at", "is", null)
    .order("scheduled_at", { ascending: true });

  if (search) {
    const e = escapeIlike(search);
    query = query.or(`student_name.ilike.%${e}%,student_email.ilike.%${e}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchAdvisorSessionsAndCalls] leads", error);
    return [];
  }

  const hydratedRows = await hydrateApplicationsPlansEmbeds(
    secret,
    (data ?? []) as unknown as LeadRowRaw[],
  );

  return hydratedRows.map(mapLeadRow);
}

async function fetchSessionRows(
  advisorId: string,
  search: string,
): Promise<AdvisorSessionsAndCallsRow[]> {
  const secret = await createSupabaseSecretClient();

  let query = secret
    .from("advisor_sessions")
    .select(
      `
      id,
      status,
      booked_at,
      destination_country_code,
      help_with,
      student_name,
      student_email,
      student_profiles (
        first_name,
        last_name,
        email,
        schools ( name )
      )
    `,
    )
    .eq("advisor_id", advisorId)
    .not("booked_at", "is", null)
    .not("status", "in", '("completed","cancelled")')
    .order("booked_at", { ascending: true });

  if (search) {
    const e = escapeIlike(search);
    query = query.or(`student_name.ilike.%${e}%,student_email.ilike.%${e}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchAdvisorSessionsAndCalls] sessions", error);
    return [];
  }

  return (data ?? []).map((row) => mapSessionRow(row as SessionRowRaw));
}

export async function fetchAdvisorSessionsAndCallsPanel(options: {
  page: number;
  limit: number;
  search: string;
  type: AdvisorSessionsAndCallsTypeFilter;
}): Promise<AdvisorSessionsAndCallsPanelProps | null> {
  const supabase = await createSupabaseServerClient();
  const advisorId = await resolveCurrentAdvisorId(supabase);
  if (!advisorId) return null;

  const [leadRows, sessionRows] = await Promise.all([
    fetchLeadRows(advisorId, options.search),
    fetchSessionRows(advisorId, options.search),
  ]);

  const merged = sortRows([...leadRows, ...sessionRows]);
  const searchFiltered = options.search
    ? merged.filter((row) => matchesSearch(row, options.search))
    : merged;

  const typeCounts: Record<AdvisorSessionsAndCallsTypeFilter, number> = {
    all: searchFiltered.length,
    application_lead: searchFiltered.filter((row) => row.kind === "application_lead")
      .length,
    advisor_session: searchFiltered.filter((row) => row.kind === "advisor_session")
      .length,
  };

  const filtered =
    options.type === "all"
      ? searchFiltered
      : searchFiltered.filter((row) => row.kind === options.type);

  const totalRows = filtered.length;
  const { from, to } = paginationRange(options.page, options.limit);
  const rows = filtered.slice(from, to + 1);

  return {
    rows,
    totalRows,
    page: options.page,
    limit: options.limit,
    search: options.search,
    type: options.type,
    typeCounts,
  };
}
