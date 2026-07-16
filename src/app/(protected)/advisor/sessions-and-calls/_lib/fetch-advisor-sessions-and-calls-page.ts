import { ADMIN_SESSION_STATUS_LABEL } from "@/app/(protected)/admin/sessions/_lib/session-status-labels";
import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import {
  hydrateApplicationsPlansEmbeds,
} from "@/lib/applications-plans";
import { isMeetingOverdue } from "@/lib/meeting-overdue";
import {
  POST_ADMISSION_STATUS_LABEL,
  type PostAdmissionStatus,
} from "@/lib/post-admission-status-labels";
import { formatPostAdmissionServiceLabel } from "@/lib/post-admission-services";
import {
  parseLeadQualification,
  SESSION_CALL_APPLICATION_STATUSES,
  SESSION_CALL_POST_ADMISSION_STATUSES,
} from "@/lib/session-lead-qualification";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

import type {
  AdvisorSessionsAndCallsPanelProps,
  AdvisorSessionsAndCallsRow,
  AdvisorSessionsAndCallsTypeFilter,
} from "./advisor-sessions-and-calls-shared";

export type {
  AdvisorSessionsAndCallsPanelProps,
  AdvisorSessionsAndCallsRow,
  AdvisorSessionsAndCallsRowKind,
  AdvisorSessionsAndCallsTypeFilter,
} from "./advisor-sessions-and-calls-shared";

export {
  advisorSessionsAndCallsKindLabel,
  advisorSessionsAndCallsRowHref,
  parseAdvisorSessionsAndCallsSearch,
  parseAdvisorSessionsAndCallsType,
} from "./advisor-sessions-and-calls-shared";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type LeadRowRaw = {
  id: number;
  plan_id: number;
  status: string | null;
  lead_qualification: string | null;
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

type PostAdmissionLeadRowRaw = {
  id: number;
  student_name: string | null;
  student_email: string | null;
  school_name: string | null;
  selected_service: string | null;
  service_other_detail: string | null;
  status: string | null;
  lead_qualification: string | null;
  scheduled_at: string | null;
  schools: { name: string } | { name: string }[] | null;
  student_profiles:
    | { first_name: string; last_name: string; email?: string | null }
    | { first_name: string; last_name: string; email?: string | null }[]
    | null;
};

type PostAdmissionScheduledCallRowRaw = {
  id: string;
  call_date: string;
  post_admission_cases:
    | PostAdmissionLeadRowRaw
    | PostAdmissionLeadRowRaw[]
    | null;
};

type SessionRowRaw = {
  id: number;
  status: string | null;
  lead_qualification: string | null;
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

function isMeetingScheduledToday(meetingAt: string): boolean {
  const meeting = new Date(meetingAt);
  if (Number.isNaN(meeting.getTime())) return false;
  const now = new Date();
  return (
    meeting.getFullYear() === now.getFullYear() &&
    meeting.getMonth() === now.getMonth() &&
    meeting.getDate() === now.getDate()
  );
}

function isMeetingInRange(
  meetingAt: string,
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  const meeting = new Date(meetingAt);
  if (Number.isNaN(meeting.getTime())) return false;
  return meeting >= rangeStart && meeting < rangeEnd;
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

function resolveLeadQualification(
  stored: string | null | undefined,
  status: string | null | undefined,
): ReturnType<typeof parseLeadQualification> {
  const parsed = parseLeadQualification(stored);
  if (parsed !== "none") return parsed;
  if (status === "lead" && !stored) return "good_lead";
  if (status === "not_suitable" && !stored) return "not_suitable";
  return "none";
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
  const status = row.status?.trim() || "intake_draft";

  return {
    kind: "application_lead",
    id: String(row.id),
    studentName,
    studentEmail,
    schoolName,
    meetingAt,
    isOverdue: isMeetingOverdue(meetingAt),
    statusLabel: status === "intake_draft" ? "Awaiting qualification" : "Lead",
    subtitle: plan?.name?.trim() || "Application support",
    leadQualification: resolveLeadQualification(row.lead_qualification, status),
  };
}

function postAdmissionStatusLabel(status: string | null | undefined): string {
  const normalized = (status?.trim() || "intake_draft") as PostAdmissionStatus;
  if (normalized === "intake_draft") return "Awaiting qualification";
  return POST_ADMISSION_STATUS_LABEL[normalized] ?? normalized;
}

function callDateToMeetingAt(callDate: string): string {
  const trimmed = callDate.trim();
  if (!trimmed) return new Date().toISOString();
  return `${trimmed}T12:00:00.000Z`;
}

function mapPostAdmissionLeadRow(
  row: PostAdmissionLeadRowRaw,
  meetingAt: string,
): AdvisorSessionsAndCallsRow {
  const profile = firstEmbed(row.student_profiles);
  const profileName = profile
    ? personName(profile.first_name, profile.last_name)
    : "";
  const studentName = profileName || row.student_name?.trim() || "Student";
  const studentEmail =
    profile?.email?.trim() || row.student_email?.trim() || "—";
  const school = firstEmbed(row.schools);
  const schoolName = school?.name?.trim() || row.school_name?.trim() || "—";
  const serviceLabel = formatPostAdmissionServiceLabel(
    row.selected_service,
    row.service_other_detail,
  );
  const status = row.status?.trim() || "intake_draft";

  return {
    kind: "post_admission_lead",
    id: String(row.id),
    studentName,
    studentEmail,
    schoolName,
    meetingAt,
    isOverdue: isMeetingOverdue(meetingAt),
    statusLabel: postAdmissionStatusLabel(status),
    subtitle: serviceLabel === "—" ? "Post-admission support" : serviceLabel,
    leadQualification: resolveLeadQualification(row.lead_qualification, status),
  };
}

function mergePostAdmissionSessionRows(
  caseRows: AdvisorSessionsAndCallsRow[],
  callRows: AdvisorSessionsAndCallsRow[],
): AdvisorSessionsAndCallsRow[] {
  const caseIdsWithScheduledAt = new Set(caseRows.map((row) => row.id));
  const supplementalCallRows = callRows.filter(
    (row) => !caseIdsWithScheduledAt.has(row.id),
  );
  return [...caseRows, ...supplementalCallRows];
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
    leadQualification: parseLeadQualification(row.lead_qualification),
  };
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
      status,
      lead_qualification,
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
    .in("status", [...SESSION_CALL_APPLICATION_STATUSES])
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

async function fetchPostAdmissionLeadRows(
  supabase: SupabaseServerClient,
  advisorId: string,
  search: string,
): Promise<AdvisorSessionsAndCallsRow[]> {
  let query = supabase
    .from("post_admission_cases")
    .select(
      `
      id,
      student_name,
      student_email,
      school_name,
      selected_service,
      service_other_detail,
      status,
      lead_qualification,
      scheduled_at,
      schools ( name ),
      student_profiles ( first_name, last_name, email )
    `,
    )
    .eq("assigned_to", advisorId)
    .in("status", [...SESSION_CALL_POST_ADMISSION_STATUSES])
    .not("scheduled_at", "is", null)
    .order("scheduled_at", { ascending: true });

  if (search) {
    const e = escapeIlike(search);
    query = query.or(`student_name.ilike.%${e}%,student_email.ilike.%${e}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchAdvisorSessionsAndCalls] post-admission leads", error);
    return [];
  }

  return (data ?? [])
    .map((row) => row as PostAdmissionLeadRowRaw)
    .filter((row) => row.scheduled_at)
    .map((row) => mapPostAdmissionLeadRow(row, row.scheduled_at!));
}

async function fetchPostAdmissionScheduledCallRows(
  supabase: SupabaseServerClient,
  advisorId: string,
  search: string,
): Promise<AdvisorSessionsAndCallsRow[]> {
  const { data, error } = await supabase
    .from("post_admission_calls")
    .select(
      `
      id,
      call_date,
      post_admission_cases!inner (
        id,
        student_name,
        student_email,
        school_name,
        selected_service,
        service_other_detail,
        status,
        lead_qualification,
        scheduled_at,
        assigned_to,
        schools ( name ),
        student_profiles ( first_name, last_name, email )
      )
    `,
    )
    .in("status", ["scheduled", "rescheduled"])
    .eq("post_admission_cases.assigned_to", advisorId)
    .in("post_admission_cases.status", [...SESSION_CALL_POST_ADMISSION_STATUSES])
    .order("call_date", { ascending: true });

  if (error) {
    console.error("[fetchAdvisorSessionsAndCalls] post-admission calls", error);
    return [];
  }

  const rows: AdvisorSessionsAndCallsRow[] = [];

  for (const raw of data ?? []) {
    const callRow = raw as PostAdmissionScheduledCallRowRaw;
    const caseRow = firstEmbed(callRow.post_admission_cases);
    if (!caseRow?.id || !callRow.call_date?.trim()) continue;

    const mapped = mapPostAdmissionLeadRow(
      caseRow,
      callDateToMeetingAt(callRow.call_date),
    );
    if (search && !matchesSearch(mapped, search)) continue;
    rows.push(mapped);
  }

  return rows;
}

async function fetchPostAdmissionSessionRows(
  supabase: SupabaseServerClient,
  advisorId: string,
  search: string,
): Promise<AdvisorSessionsAndCallsRow[]> {
  const [caseRows, callRows] = await Promise.all([
    fetchPostAdmissionLeadRows(supabase, advisorId, search),
    fetchPostAdmissionScheduledCallRows(supabase, advisorId, search),
  ]);

  return mergePostAdmissionSessionRows(caseRows, callRows);
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
      lead_qualification,
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

async function fetchAllBookedSessionsAndCalls(): Promise<
  AdvisorSessionsAndCallsRow[]
> {
  const supabase = await createSupabaseServerClient();
  const advisorId = await resolveCurrentAdvisorId(supabase);
  if (!advisorId) return [];

  const [leadRows, postAdmissionRows, sessionRows] = await Promise.all([
    fetchLeadRows(advisorId, ""),
    fetchPostAdmissionSessionRows(supabase, advisorId, ""),
    fetchSessionRows(advisorId, ""),
  ]);

  return sortRows([...leadRows, ...postAdmissionRows, ...sessionRows]);
}

export async function fetchAdvisorTodaysSessionsAndCalls(): Promise<
  AdvisorSessionsAndCallsRow[]
> {
  const rows = await fetchAllBookedSessionsAndCalls();
  return rows.filter((row) => isMeetingScheduledToday(row.meetingAt));
}

/** Inclusive start / exclusive end (UTC-safe local Date bounds). */
export async function fetchAdvisorSessionsAndCallsInRange(
  rangeStart: Date,
  rangeEnd: Date,
): Promise<AdvisorSessionsAndCallsRow[]> {
  if (
    Number.isNaN(rangeStart.getTime()) ||
    Number.isNaN(rangeEnd.getTime()) ||
    rangeStart >= rangeEnd
  ) {
    return [];
  }

  const rows = await fetchAllBookedSessionsAndCalls();
  return rows.filter((row) =>
    isMeetingInRange(row.meetingAt, rangeStart, rangeEnd),
  );
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

  const [leadRows, postAdmissionRows, sessionRows] = await Promise.all([
    fetchLeadRows(advisorId, options.search),
    fetchPostAdmissionSessionRows(supabase, advisorId, options.search),
    fetchSessionRows(advisorId, options.search),
  ]);

  const merged = sortRows([...leadRows, ...postAdmissionRows, ...sessionRows]);
  const searchFiltered = options.search
    ? merged.filter((row) => matchesSearch(row, options.search))
    : merged;

  const typeCounts: Record<AdvisorSessionsAndCallsTypeFilter, number> = {
    all: searchFiltered.length,
    application_lead: searchFiltered.filter((row) => row.kind === "application_lead")
      .length,
    post_admission_lead: searchFiltered.filter(
      (row) => row.kind === "post_admission_lead",
    ).length,
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
