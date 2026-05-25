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

export type StudentDetailUrlTab =
  | "snapshot"
  | "tasks"
  | "history"
  | "activity_logs";

export function parseStudentDetailInitialTab(
  tabParam: string,
): StudentDetailUrlTab {
  if (tabParam === "tasks") return "tasks";
  if (tabParam === "history") return "history";
  if (tabParam === "activity_logs") return "activity_logs";
  return "snapshot";
}

export const STUDENT_DETAIL_URL_TABS: readonly StudentDetailUrlTab[] = [
  "tasks",
  "history",
  "activity_logs",
] as const;
