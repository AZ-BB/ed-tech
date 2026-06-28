export type AdvisorNotificationItem = {
  id: string;
  title: string;
  body: string | null;
  linkPath: string | null;
  createdAt: string;
  read: boolean;
  studentName: string;
  eventType: string;
};

export type AdvisorNotificationsResponse = {
  unreadCount: number;
  items: AdvisorNotificationItem[];
};

export { formatSchoolNotificationTimestamp as formatAdvisorNotificationTimestamp } from "@/lib/school-admin-notifications";
