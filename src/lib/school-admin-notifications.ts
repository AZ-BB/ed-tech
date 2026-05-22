export type SchoolNotificationItem = {
  id: string;
  title: string;
  body: string | null;
  linkPath: string | null;
  createdAt: string;
  read: boolean;
  studentName: string;
  eventType: string;
};

export type SchoolNotificationsResponse = {
  unreadCount: number;
  items: SchoolNotificationItem[];
};

export function formatSchoolNotificationTimestamp(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
