import { hydrateApplicationsPlansEmbeds } from "@/lib/applications-plans";
import { createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type AdvisorStudentApplicationOption = {
  applicationId: number;
  label: string;
};

export type AdvisorStudentApplicationGroup = {
  studentId: string;
  studentName: string;
  applications: AdvisorStudentApplicationOption[];
};

type ApplicationRowRaw = {
  id: number;
  plan_id: number;
  student_id: string;
  student_name: string | null;
  status: string | null;
  updated_at: string | null;
  student_profiles:
    | { first_name: string; last_name: string }
    | { first_name: string; last_name: string }[]
    | null;
  applications_plans:
    | { name: string }
    | { name: string }[]
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

export function applicationOptionLabel(
  applicationId: number,
  planName: string | null | undefined,
): string {
  const base = `Application #${applicationId}`;
  const plan = planName?.trim();
  return plan ? `${base} — ${plan}` : base;
}

export async function fetchAdvisorStudentApplicationGroups(
  client: DbClient,
  advisorId: string,
  options?: { status?: string | readonly string[] },
): Promise<AdvisorStudentApplicationGroup[]> {
  let query = client
    .from("applications")
    .select(
      `
      id,
      plan_id,
      student_id,
      student_name,
      status,
      updated_at,
      student_profiles ( first_name, last_name ),
      applications_plans!applications_plan_id_fkey ( name )
    `,
    )
    .eq("assigned_to", advisorId)
    .order("updated_at", { ascending: false });

  if (options?.status != null) {
    const statuses = Array.isArray(options.status)
      ? [...options.status]
      : [options.status];
    if (statuses.length === 1) {
      query = query.eq("status", statuses[0]!);
    } else if (statuses.length > 1) {
      query = query.in("status", statuses);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchAdvisorStudentApplicationGroups]", error);
    return [];
  }

  const rows = await hydrateApplicationsPlansEmbeds(
    client,
    (data ?? []) as unknown as ApplicationRowRaw[],
  );

  const byStudent = new Map<string, AdvisorStudentApplicationGroup>();

  for (const row of rows) {
    const profile = firstEmbed(row.student_profiles);
    const profileName = profile
      ? personName(profile.first_name, profile.last_name)
      : "";
    const studentName = profileName || row.student_name?.trim() || "Student";
    const plan = firstEmbed(row.applications_plans);
    const applicationOption: AdvisorStudentApplicationOption = {
      applicationId: row.id,
      label: applicationOptionLabel(row.id, plan?.name),
    };

    const existing = byStudent.get(row.student_id);
    if (existing) {
      existing.applications.push(applicationOption);
    } else {
      byStudent.set(row.student_id, {
        studentId: row.student_id,
        studentName,
        applications: [applicationOption],
      });
    }
  }

  return [...byStudent.values()].sort((a, b) =>
    a.studentName.localeCompare(b.studentName),
  );
}

export function studentApplicationOptionsByStudentId(
  groups: AdvisorStudentApplicationGroup[],
): Record<string, AdvisorStudentApplicationOption[]> {
  const map: Record<string, AdvisorStudentApplicationOption[]> = {};
  for (const group of groups) {
    map[group.studentId] = group.applications;
  }
  return map;
}
