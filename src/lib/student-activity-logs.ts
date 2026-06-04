export type StudentActivityLogItem = {
  id: number;
  action: string;
  message: string;
  entityType: string;
  entityId: string;
  createdByType: "student" | "school_admin" | "admin";
  createdAt: string;
  actorName: string | null;
};

export type StudentActivityLogsPanelProps = {
  rows: StudentActivityLogItem[];
  totalRows: number;
  page: number;
  limit: number;
};

export function formatActivityLogAction(action: string): string {
  const trimmed = action.trim();
  if (!trimmed) return "—";
  return trimmed
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatActivityLogEntityType(entityType: string): string {
  const trimmed = entityType.trim();
  if (!trimmed) return "—";
  return trimmed
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatActivityLogActorType(
  createdByType: StudentActivityLogItem["createdByType"],
): string {
  switch (createdByType) {
    case "admin":
      return "Platform admin";
    case "school_admin":
      return "School admin";
    case "student":
      return "Student";
  }
}

const ACTIVITY_LOG_ROLE_PREFIXES: Record<
  StudentActivityLogItem["createdByType"],
  readonly string[]
> = {
  student: ["Student "],
  school_admin: ["School admin ", "Teacher "],
  admin: ["Platform admin ", "Admin "],
};

/** Admin views: replace generic role labels at the start of stored log copy with the actor's full name. */
export function formatActivityLogMessageForAdmin(
  message: string,
  actorName: string | null,
  createdByType: StudentActivityLogItem["createdByType"],
): string {
  const trimmed = message.trim();
  if (!trimmed) return "—";

  const name = actorName?.trim();
  if (!name) return trimmed;

  for (const prefix of ACTIVITY_LOG_ROLE_PREFIXES[createdByType]) {
    if (!trimmed.startsWith(prefix)) continue;
    const remainder = trimmed.slice(prefix.length);
    if (remainder.startsWith(name)) return trimmed;
    return `${name} ${remainder}`;
  }

  return trimmed;
}

export type StudentDetailUrlTab =
  | "snapshot"
  | "tasks"
  | "history"
  | "usage"
  | "activity_logs";

export function parseStudentDetailInitialTab(
  tabParam: string,
): StudentDetailUrlTab {
  if (tabParam === "tasks") return "tasks";
  if (tabParam === "history") return "history";
  if (tabParam === "usage") return "usage";
  if (tabParam === "activity_logs") return "activity_logs";
  return "snapshot";
}

export const STUDENT_DETAIL_URL_TABS: readonly StudentDetailUrlTab[] = [
  "tasks",
  "history",
  "usage",
  "activity_logs",
] as const;
