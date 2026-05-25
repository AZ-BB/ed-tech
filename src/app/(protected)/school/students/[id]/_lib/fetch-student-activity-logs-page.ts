import type { StudentActivityLogItem } from "@/lib/student-activity-logs";
import { createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function personNameFromEmbed(
  embed:
    | { first_name: string; last_name: string }
    | { first_name: string; last_name: string }[]
    | null
    | undefined,
): string | null {
  const person = Array.isArray(embed) ? embed[0] : embed;
  if (!person) return null;
  const name = [person.first_name, person.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
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

export async function fetchStudentActivityLogsPage(
  studentId: string,
  options: { page: number; limit: number; client: DbClient },
): Promise<{ rows: StudentActivityLogItem[]; totalRows: number }> {
  const { page, limit, client } = options;
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
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[fetchStudentActivityLogsPage] acitivity_logs", error);
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

    return {
      id: row.id,
      action: row.action,
      message: row.message?.trim() || "—",
      entityType: row.entitiy_type?.trim() || "—",
      entityId: row.entity_id?.trim() || "—",
      createdByType,
      createdAt: row.created_at ?? new Date(0).toISOString(),
      actorName,
    };
  });

  return { rows, totalRows: count ?? 0 };
}

export async function fetchStudentActivityLogsPanel(
  studentId: string,
  options: { page: number; limit: number; client: DbClient },
) {
  const result = await fetchStudentActivityLogsPage(studentId, options);
  return {
    ...result,
    page: options.page,
    limit: options.limit,
  };
}

export async function fetchTeacherActivityLogsPage(
  teacherId: string,
  options: { page: number; limit: number; client: DbClient },
): Promise<{ rows: StudentActivityLogItem[]; totalRows: number }> {
  const { page, limit, client } = options;
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
    .eq("school_admin_id", teacherId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[fetchTeacherActivityLogsPage] acitivity_logs", error);
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

    return {
      id: row.id,
      action: row.action,
      message: row.message?.trim() || "—",
      entityType: row.entitiy_type?.trim() || "—",
      entityId: row.entity_id?.trim() || "—",
      createdByType,
      createdAt: row.created_at ?? new Date(0).toISOString(),
      actorName,
    };
  });

  return { rows, totalRows: count ?? 0 };
}

export async function fetchTeacherActivityLogsPanel(
  teacherId: string,
  options: { page: number; limit: number; client: DbClient },
) {
  const result = await fetchTeacherActivityLogsPage(teacherId, options);
  return {
    ...result,
    page: options.page,
    limit: options.limit,
  };
}

export async function fetchAdminActivityLogsPage(
  adminId: string,
  options: { page: number; limit: number; client: DbClient },
): Promise<{ rows: StudentActivityLogItem[]; totalRows: number }> {
  const { page, limit, client } = options;
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
    .eq("admin_id", adminId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[fetchAdminActivityLogsPage] acitivity_logs", error);
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

    return {
      id: row.id,
      action: row.action,
      message: row.message?.trim() || "—",
      entityType: row.entitiy_type?.trim() || "—",
      entityId: row.entity_id?.trim() || "—",
      createdByType,
      createdAt: row.created_at ?? new Date(0).toISOString(),
      actorName,
    };
  });

  return { rows, totalRows: count ?? 0 };
}

export async function fetchAdminActivityLogsPanel(
  adminId: string,
  options: { page: number; limit: number; client: DbClient },
) {
  const result = await fetchAdminActivityLogsPage(adminId, options);
  return {
    ...result,
    page: options.page,
    limit: options.limit,
  };
}
