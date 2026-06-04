import {
  formatActivityLogMessageForAdmin,
  type StudentActivityLogItem,
} from "@/lib/student-activity-logs";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

function personNameFromEmbed(
  embed:
    | { first_name: string; last_name: string }
    | { first_name: string; last_name: string }[]
    | null
    | undefined,
): string | null {
  const person = Array.isArray(embed) ? embed[0] : embed;
  if (!person) return null;
  const name = [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
  return name || null;
}

function paginationRange(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const from = (safePage - 1) * safeLimit;
  return { from, to: from + safeLimit - 1 };
}

function resolveActorName(
  createdByType: StudentActivityLogItem["createdByType"],
  adminName: string | null,
  schoolAdminName: string | null,
  studentName: string | null,
): string | null {
  switch (createdByType) {
    case "admin":
      return adminName;
    case "school_admin":
      return schoolAdminName;
    case "student":
      return studentName;
  }
}

async function fetchSchoolMemberIds(schoolId: string, client: DbClient) {
  const [{ data: students }, { data: teachers }] = await Promise.all([
    client.from("student_profiles").select("id").eq("school_id", schoolId),
    client.from("school_admin_profiles").select("id").eq("school_id", schoolId),
  ]);

  return {
    studentIds: (students ?? []).map((row) => row.id),
    teacherIds: (teachers ?? []).map((row) => row.id),
  };
}

function buildOrFilter(studentIds: string[], teacherIds: string[]): string | null {
  const parts: string[] = [];
  if (studentIds.length > 0) {
    parts.push(`student_id.in.(${studentIds.join(",")})`);
  }
  if (teacherIds.length > 0) {
    parts.push(`school_admin_id.in.(${teacherIds.join(",")})`);
  }
  if (parts.length === 0) return null;
  return parts.join(",");
}

export async function fetchSchoolActivityLogsPage(
  schoolId: string,
  options: { page: number; limit: number; client: DbClient },
): Promise<{ rows: StudentActivityLogItem[]; totalRows: number }> {
  const { page, limit, client } = options;
  const { studentIds, teacherIds } = await fetchSchoolMemberIds(schoolId, client);
  const orFilter = buildOrFilter(studentIds, teacherIds);

  if (!orFilter) {
    return { rows: [], totalRows: 0 };
  }

  const { from, to } = paginationRange(page, limit);

  const { data, count, error } = await client
    .from("acitivity_logs")
    .select(
      `
      id,
      action,
      message,
      entitiy_type,
      entity_id,
      created_by_type,
      created_at,
      admins:admin_id ( first_name, last_name ),
      school_admin_profiles:school_admin_id ( first_name, last_name ),
      student_profiles:student_id ( first_name, last_name )
    `,
      { count: "exact" },
    )
    .or(orFilter)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[fetchSchoolActivityLogsPage] acitivity_logs", error);
    return { rows: [], totalRows: 0 };
  }

  const rows: StudentActivityLogItem[] = (data ?? []).map((row) => {
    const createdByType = row.created_by_type as StudentActivityLogItem["createdByType"];
    const actorName = resolveActorName(
      createdByType,
      personNameFromEmbed(row.admins),
      personNameFromEmbed(row.school_admin_profiles),
      personNameFromEmbed(row.student_profiles),
    );

    const rawMessage = row.message?.trim() || "—";

    return {
      id: row.id,
      action: row.action,
      message: formatActivityLogMessageForAdmin(rawMessage, actorName, createdByType),
      entityType: row.entitiy_type?.trim() || "—",
      entityId: row.entity_id?.trim() || "—",
      createdByType,
      createdAt: row.created_at ?? new Date(0).toISOString(),
      actorName,
    };
  });

  return { rows, totalRows: count ?? 0 };
}

export async function fetchSchoolActivityLogsPanel(
  schoolId: string,
  options: { page: number; limit: number; client: DbClient },
) {
  const result = await fetchSchoolActivityLogsPage(schoolId, options);
  return {
    ...result,
    page: options.page,
    limit: options.limit,
  };
}
