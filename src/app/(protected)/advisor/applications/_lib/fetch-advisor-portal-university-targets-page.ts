import type { ApplicationUniversityTargetRow } from "@/lib/application-university-target-mapper";
import {
  mapApplicationUniversityTargetRow,
  type UniversityTargetRaw,
} from "@/lib/application-university-target-mapper";
import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import { UNIVERSITY_TARGETS_SELECT } from "@/lib/fetch-application-university-targets";
import { createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type ApplicationEmbed = {
  id: number;
  student_name: string | null;
  student_email: string | null;
  status: string | null;
  student_profiles:
    | ({ first_name: string; last_name: string; email?: string | null })
    | ({ first_name: string; last_name: string; email?: string | null })[]
    | null;
};

type TargetRowRaw = UniversityTargetRaw & {
  applications: ApplicationEmbed | ApplicationEmbed[];
};

export type AdvisorPortalUniversityTargetRow = ApplicationUniversityTargetRow & {
  studentName: string;
  studentEmail: string;
  applicationStatus: string;
};

export type AdvisorPortalUniversityTargetsPanelProps = {
  rows: AdvisorPortalUniversityTargetRow[];
  totalRows: number;
  page: number;
  limit: number;
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

function mapTargetRow(raw: TargetRowRaw): AdvisorPortalUniversityTargetRow {
  const target = mapApplicationUniversityTargetRow(raw);
  const application = firstEmbed(raw.applications);
  const profile = application ? firstEmbed(application.student_profiles) : null;
  const profileName = profile ? personName(profile.first_name, profile.last_name) : "";
  const studentName =
    profileName || application?.student_name?.trim() || "Student";
  const studentEmail =
    profile?.email?.trim() || application?.student_email?.trim() || "—";

  return {
    ...target,
    studentName,
    studentEmail,
    applicationStatus: application?.status?.trim() || "new",
  };
}

async function fetchAdvisorUniversityTargetsPage(
  advisorId: string,
  options: { page: number; limit: number; client: DbClient },
): Promise<{ rows: AdvisorPortalUniversityTargetRow[]; totalRows: number }> {
  const { page, limit, client } = options;
  const { from, to } = paginationRange(page, limit);

  const { data, count, error } = await client
    .from("application_university_targets")
    .select(
      `
      ${UNIVERSITY_TARGETS_SELECT},
      applications!inner (
        id,
        student_name,
        student_email,
        status,
        assigned_to,
        student_profiles ( first_name, last_name, email )
      )
    `,
      { count: "exact" },
    )
    .eq("applications.assigned_to", advisorId)
    .order("created_at", { ascending: false })
    .order("sort_order", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("[fetchAdvisorUniversityTargetsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const rows = (data ?? []).map((row) => mapTargetRow(row as TargetRowRaw));
  return { rows, totalRows: count ?? 0 };
}

export async function fetchAdvisorPortalUniversityTargetsPanel(options: {
  page: number;
  limit: number;
}): Promise<AdvisorPortalUniversityTargetsPanelProps | null> {
  const supabase = await createSupabaseServerClient();
  const advisorId = await resolveCurrentAdvisorId(supabase);
  if (!advisorId) return null;

  const pageResult = await fetchAdvisorUniversityTargetsPage(advisorId, {
    ...options,
    client: supabase,
  });

  return {
    ...pageResult,
    page: options.page,
    limit: options.limit,
  };
}
