import type { ReactNode } from "react";

export type SidebarNavItem =
  | { type: "divider" }
  | {
      type: "link";
      id: string;
      href: string;
    };

export const sidebarNavItems: SidebarNavItem[] = [
  {
    type: "link",
    id: "dashboard",
    href: "/student",
  },
  {
    type: "link",
    id: "my-applications",
    href: "/student/my-applications",
  },
  {
    type: "link",
    id: "personality-check",
    href: "#",
  },
  {
    type: "link",
    id: "program-discovery",
    href: "/student/ai-matching",
  },
  {
    type: "link",
    id: "university-search",
    href: "/student/universities",
  },
  {
    type: "link",
    id: "scholarships",
    href: "/student/scholarships",
  },
  {
    type: "link",
    id: "advisor-sessions",
    href: "/student/advisor-sessions",
  },
  {
    type: "link",
    id: "ambassadors",
    href: "/student/ambassadors",
  },
  {
    type: "link",
    id: "application-support",
    href: "/student/application-support",
  },
  {
    type: "link",
    id: "post-admission-support",
    href: "#",
  },
  {
    type: "link",
    id: "webinars",
    href: "/student/webinars",
  },
  { type: "divider" },
  {
    type: "link",
    id: "account-settings",
    href: "/student/settings",
  },
];

export const activityConfig = [
  { key: "universities_viewed" as const },
  { key: "universities_saved" as const },
  { key: "scholarships_saved" as const },
  { key: "essays_reviewed" as const },
  { key: "advisor_sessions_booked" as const },
  { key: "ambassador_sessions_booked" as const },
  { key: "total_logins" as const },
  { key: "ai_matches_generated" as const },
];

export type StudentDashboardActivityKey =
  (typeof activityConfig)[number]["key"];

export type StudentDashboardActivityCounts = Record<
  StudentDashboardActivityKey,
  number
>;

export type DashboardAnnouncementItem = {
  id: number;
  title: string;
  createdAt: string | null;
};

export type DashboardNewsItem = {
  id: number;
  tag: "visa" | "deadline" | "update";
  text: string;
  createdAt: string | null;
};

export type DashboardActivityLogItem = {
  id: number;
  message: string;
  entityType: string;
  createdAt: string | null;
};

export type DashboardTaskItem = {
  id: string;
  title: string;
  notes: string | null;
  dueDate: string | null;
  priority: string;
  completed: boolean;
  assignedByName: string | null;
  createdAt: string;
};

export type QuickActionDictKey =
  | "personalityOverview"
  | "programDiscovery"
  | "discoverUniversities"
  | "scholarships"
  | "advisorSessions"
  | "ambassadors"
  | "applicationSupport"
  | "postAdmission";

export type QuickAction = {
  dictKey: QuickActionDictKey;
  href: string;
  iconWrap: string;
  iconStroke: string;
  icon: ReactNode;
};

export const quickActions: QuickAction[] = [
  {
    dictKey: "personalityOverview",
    href: "#",
    iconWrap: "bg-[#F3E8FF]",
    iconStroke: "#6B21A8",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <path d="M9 9h.01" />
        <path d="M15 9h.01" />
      </>
    ),
  },
  {
    dictKey: "programDiscovery",
    href: "/student/ai-matching",
    iconWrap: "bg-[#E0F2FE]",
    iconStroke: "#0369A1",
    icon: (
      <>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </>
    ),
  },
  {
    dictKey: "discoverUniversities",
    href: "/student/universities",
    iconWrap: "bg-[var(--green-bg)]",
    iconStroke: "#2D6A4F",
    icon: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </>
    ),
  },
  {
    dictKey: "scholarships",
    href: "/student/scholarships",
    iconWrap: "bg-[#FEF9C3]",
    iconStroke: "#854D0E",
    icon: (
      <path d="M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z" />
    ),
  },
  {
    dictKey: "advisorSessions",
    href: "/student/advisor-sessions",
    iconWrap: "bg-[#FAEEDA]",
    iconStroke: "#854F0B",
    icon: (
      <>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
  },
  {
    dictKey: "ambassadors",
    href: "/student/ambassadors",
    iconWrap: "bg-[var(--green-bg)]",
    iconStroke: "#2D6A4F",
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </>
    ),
  },
  {
    dictKey: "applicationSupport",
    href: "/student/application-support",
    iconWrap: "bg-[#FCEBEB]",
    iconStroke: "#A32D2D",
    icon: (
      <>
        <path d="M22 2L11 13" />
        <path d="M22 2l-7 20-4-9-9-4 20-7z" />
      </>
    ),
  },
  {
    dictKey: "postAdmission",
    href: "#",
    iconWrap: "bg-[#DCFCE7]",
    iconStroke: "#166534",
    icon: (
      <>
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <path d="M3.27 6.96L12 12.01l8.73-5.05" />
        <path d="M12 22.08V12" />
      </>
    ),
  },
];

export const savedTabLabels = [
  "Universities",
  "Scholarships",
  "Advisors",
  "Ambassadors",
] as const;

export const shortlistTabLabels = ["Universities", "Scholarships"] as const;
