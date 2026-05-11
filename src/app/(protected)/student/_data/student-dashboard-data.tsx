import type { ReactNode } from "react";

export type SidebarNavItem =
  | { type: "divider" }
  | {
      type: "link";
      id: string;
      label: string;
      href: string;
    };

export const sidebarNavItems: SidebarNavItem[] = [
  {
    type: "link",
    id: "dashboard",
    label: "Dashboard",
    href: "/student",
  },
  {
    type: "link",
    id: "my-applications",
    label: "My applications",
    href: "/student/my-applications",
  },
  {
    type: "link",
    id: "personality-check",
    label: "Personality Check",
    href: "#",
  },
  {
    type: "link",
    id: "program-discovery",
    label: "Program Discovery",
    href: "#",
  },
  {
    type: "link",
    id: "university-search",
    label: "University Search",
    href: "/student/universities",
  },
  {
    type: "link",
    id: "scholarships",
    label: "Scholarships",
    href: "/student/scholarships",
  },
  {
    type: "link",
    id: "advisor-sessions",
    label: "1-1 Advisors",
    href: "/student/advisor-sessions",
  },
  {
    type: "link",
    id: "ambassadors",
    label: "Ambassadors",
    href: "/student/ambassadors",
  },
  {
    type: "link",
    id: "application-support",
    label: "Application Support",
    href: "/student/application-support",
  },
  {
    type: "link",
    id: "post-admission-support",
    label: "Post Admission Support",
    href: "#",
  },
  {
    type: "link",
    id: "webinars",
    label: "Webinars",
    href: "#",
  },
  { type: "divider" },
  {
    type: "link",
    id: "account-settings",
    label: "Account Settings",
    href: "/student/settings",
  },
];

export const activityConfig = [
  { key: "universities_viewed" as const, label: "Universities Viewed" },
  { key: "universities_saved" as const, label: "Universities Saved" },
  { key: "scholarships_saved" as const, label: "Scholarships Saved" },
  { key: "essays_reviewed" as const, label: "Essays Reviewed" },
  { key: "advisor_sessions_booked" as const, label: "Advisor Sessions Booked" },
  {
    key: "ambassador_sessions_booked" as const,
    label: "Ambassador Sessions Booked",
  },
  { key: "total_logins" as const, label: "Total Logins" },
  { key: "ai_matches_generated" as const, label: "AI Matches Generated" },
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

export type QuickAction = {
  name: string;
  desc: string;
  href: string;
  iconWrap: string;
  iconStroke: string;
  icon: ReactNode;
};

export const quickActions: QuickAction[] = [
  {
    name: "Personality Check",
    desc: "Understand your profile and how you learn best",
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
    name: "Program Discovery",
    desc: "Search and filter wide range of programs",
    href: "#",
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
    name: "Discover Universities",
    desc: "Search and filter 500+ universities",
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
    name: "Scholarships",
    desc: "Discover funding opportunities",
    href: "/student/scholarships",
    iconWrap: "bg-[#FEF9C3]",
    iconStroke: "#854D0E",
    icon: (
      <path d="M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z" />
    ),
  },
  {
    name: "1-1 Advisors",
    desc: "Book 1:1 guidance with an expert",
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
    name: "Ambassadors",
    desc: "Talk to students who've been there",
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
    name: "Application Support",
    desc: "We handle your full application",
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
    name: "Post Admission Support",
    desc: "Visa, housing, and arrival guidance after you get in",
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

export const newsItems = [
  {
    tag: "visa" as const,
    text: "Canada updates student visa rules for 2026 intake",
    date: "Mar 29, 2026",
  },
  {
    tag: "deadline" as const,
    text: "Top UK universities increasing entry requirements",
    date: "Mar 28, 2026",
  },
  {
    tag: "update" as const,
    text: "UAE MOHESR adds 15 new approved universities",
    date: "Mar 27, 2026",
  },
  {
    tag: "deadline" as const,
    text: "Chevening scholarship closing in 6 weeks",
    date: "Mar 26, 2026",
  },
];
