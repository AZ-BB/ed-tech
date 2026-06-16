export const APPLICATION_TASK_PRIORITIES = ["low", "medium", "high"] as const;

export type ApplicationTaskPriority = (typeof APPLICATION_TASK_PRIORITIES)[number];

export const APPLICATION_TASK_PRIORITY_LABEL: Record<ApplicationTaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function isApplicationTaskPriority(value: string): value is ApplicationTaskPriority {
  return (APPLICATION_TASK_PRIORITIES as readonly string[]).includes(value);
}

export function applicationTaskPriorityPillClass(priority: ApplicationTaskPriority): string {
  switch (priority) {
    case "high":
      return "bg-[rgba(231,76,60,0.12)] text-[#8c2d22]";
    case "medium":
      return "bg-[rgba(212,162,42,0.14)] text-[#7a5d10]";
    case "low":
    default:
      return "bg-[#ECEAE5] text-[var(--text-mid)]";
  }
}

export function applicationTaskPriorityDotClass(priority: ApplicationTaskPriority): string {
  switch (priority) {
    case "high":
      return "bg-[var(--red)]";
    case "medium":
      return "bg-[#D4A22A]";
    case "low":
    default:
      return "bg-[#a0a0a0]";
  }
}

function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatRelativeTaskDue(
  dueDate: string | null,
  completed: boolean,
): string | null {
  if (completed || !dueDate) return null;

  const due = dueDate.slice(0, 10);
  const today = new Date();
  const todayYmd = ymdLocal(today);
  const todayMs = new Date(`${todayYmd}T12:00:00`).getTime();
  const dueMs = new Date(`${due}T12:00:00`).getTime();
  const diffDays = Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return days === 1 ? "1 day overdue" : `${days} days overdue`;
  }
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `Due in ${diffDays} days`;
}

export function formatTaskPriorityMeta(priority: ApplicationTaskPriority): string {
  return `${APPLICATION_TASK_PRIORITY_LABEL[priority]} priority`;
}

export function formatApplicationTaskMeta(
  dueDate: string | null,
  priority: ApplicationTaskPriority,
  completed: boolean,
): string {
  const parts: string[] = [];
  const dueLabel = formatRelativeTaskDue(dueDate, completed);
  if (dueLabel) parts.push(dueLabel);
  if (!completed) parts.push(formatTaskPriorityMeta(priority));
  return parts.join(" · ");
}

export function isApplicationTaskOverdue(
  dueDate: string | null,
  completed: boolean,
): boolean {
  if (completed || !dueDate) return false;
  const today = ymdLocal(new Date());
  return dueDate.slice(0, 10) < today;
}
