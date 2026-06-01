import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { resolveActivityLogActorUserId } from "@/lib/activity-log-user-links";
import type { StudentActivityLogItem } from "@/lib/student-activity-logs";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { AdminActivityLogPageFilters } from "./parse-admin-activity-log-search-params";

export type AdminActivityLogTableRow = StudentActivityLogItem & {
  actorUserId: string | null;
};

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

function mapActivityLogRows(
  data: Array<{
    id: number;
    action: string;
    message: string;
    entitiy_type: string;
    entity_id: string;
    created_by_type: string;
    created_at: string | null;
    admin_id: string | null;
    school_admin_id: string | null;
    student_id: string | null;
    admins:
      | { first_name: string; last_name: string }
      | { first_name: string; last_name: string }[]
      | null;
    school_admin_profiles:
      | { first_name: string; last_name: string }
      | { first_name: string; last_name: string }[]
      | null;
    student_profiles:
      | { first_name: string; last_name: string }
      | { first_name: string; last_name: string }[]
      | null;
  }>,
): AdminActivityLogTableRow[] {
  return data.map((row) => {
    const createdByType = row.created_by_type as StudentActivityLogItem["createdByType"];
    const actorName = resolveActorName(
      createdByType,
      personNameFromEmbed(row.admins),
      personNameFromEmbed(row.school_admin_profiles),
      personNameFromEmbed(row.student_profiles),
    );
    const actorUserId = resolveActivityLogActorUserId(
      createdByType,
      row.admin_id,
      row.school_admin_id,
      row.student_id,
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
      actorUserId,
    };
  });
}

async function fetchDistinctActions(client: DbClient): Promise<string[]> {
  const { data, error } = await client
    .from("acitivity_logs")
    .select("action")
    .order("action", { ascending: true });

  if (error) {
    console.error("[fetchAdminActivityLogPage] distinct action", error);
    return [];
  }

  const values = new Set<string>();
  for (const row of data ?? []) {
    const value = row.action?.trim();
    if (value) values.add(value);
  }

  return [...values].sort((a, b) => a.localeCompare(b));
}

async function fetchDistinctEntityTypes(client: DbClient): Promise<string[]> {
  const { data, error } = await client
    .from("acitivity_logs")
    .select("entitiy_type")
    .order("entitiy_type", { ascending: true });

  if (error) {
    console.error("[fetchAdminActivityLogPage] distinct entitiy_type", error);
    return [];
  }

  const values = new Set<string>();
  for (const row of data ?? []) {
    const value = row.entitiy_type?.trim();
    if (value) values.add(value);
  }

  return [...values].sort((a, b) => a.localeCompare(b));
}

export async function fetchAdminActivityLogPage(filters: AdminActivityLogPageFilters): Promise<{
  rows: AdminActivityLogTableRow[];
  totalRows: number;
  actionOptions: string[];
  entityTypeOptions: string[];
}> {
  const { q, action, entityType, actorType, page, limit } = filters;
  const client = await createSupabaseSecretClient();
  const offset = (Math.max(1, page) - 1) * limit;

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
      admin_id,
      school_admin_id,
      student_id,
      admins:admin_id ( first_name, last_name ),
      school_admin_profiles:school_admin_id ( first_name, last_name ),
      student_profiles:student_id ( first_name, last_name )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  const trimmed = q.trim();
  if (trimmed) {
    const e = escapeIlike(trimmed);
    query = query.or(`message.ilike.%${e}%,action.ilike.%${e}%,entity_id.ilike.%${e}%`);
  }

  if (action) {
    query = query.eq("action", action);
  }

  if (entityType) {
    query = query.eq("entitiy_type", entityType);
  }

  if (actorType) {
    query = query.eq("created_by_type", actorType);
  }

  const [{ data, count, error }, actionOptions, entityTypeOptions] = await Promise.all([
    query.range(offset, offset + limit - 1),
    fetchDistinctActions(client),
    fetchDistinctEntityTypes(client),
  ]);

  if (error) {
    console.error("[fetchAdminActivityLogPage] acitivity_logs", error);
    return { rows: [], totalRows: 0, actionOptions, entityTypeOptions };
  }

  return {
    rows: mapActivityLogRows(data ?? []),
    totalRows: count ?? 0,
    actionOptions,
    entityTypeOptions,
  };
}
