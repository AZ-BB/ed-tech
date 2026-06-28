import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  ADVISOR_APPLICATION_ACTIVITY_LOG_CREATED_BY_TYPE,
  type ApplicationActivityLogAudience,
} from "@/lib/application-activity-log";
import {
  formatActivityLogMessageForAdmin,
  type StudentActivityLogItem,
} from "@/lib/student-activity-logs";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient =
  | Awaited<ReturnType<typeof createSupabaseSecretClient>>
  | Awaited<ReturnType<typeof createSupabaseServerClient>>;

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

export async function fetchApplicationActivityLogsPage(
  applicationId: number,
  options: {
    page: number;
    limit: number;
    client?: DbClient;
    audience?: ApplicationActivityLogAudience;
  },
): Promise<{ rows: StudentActivityLogItem[]; totalRows: number }> {
  const client = options.client ?? (await createSupabaseSecretClient());
  const { page, limit, audience = "admin" } = options;
  const { from, to } = paginationRange(page, limit);
  const entityId = String(applicationId);

  let query = client
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
    .eq("entitiy_type", APPLICATION_ACTIVITY_ENTITY_TYPE)
    .eq("entity_id", entityId);

  if (audience === "advisor") {
    query = query
      .eq("created_by_type", ADVISOR_APPLICATION_ACTIVITY_LOG_CREATED_BY_TYPE)
      .is("admin_id", null);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[fetchApplicationActivityLogsPage]", error);
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

export async function fetchApplicationActivityLogsPanel(
  applicationId: number,
  options: {
    page: number;
    limit: number;
    client?: DbClient;
    audience?: ApplicationActivityLogAudience;
  },
) {
  const result = await fetchApplicationActivityLogsPage(applicationId, options);
  return {
    ...result,
    page: options.page,
    limit: options.limit,
  };
}
