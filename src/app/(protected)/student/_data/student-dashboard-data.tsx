import type { ReactNode } from "react";

export type SidebarNavItem =
  | { type: "divider" }
  | {
      type: "link";
      id: string;
      label: string;
      href: string;
      iconPaths: string[];
    };

export const sidebarNavItems: SidebarNavItem[] = [
  {
    type: "link",
    id: "dashboard",
    label: "Dashboard",
    href: "/student",
    iconPaths: [
      "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
      "M9 22V12h6v10",
    ],
  },
  {
    type: "link",
    id: "my-applications",
    label: "My Applications",
    href: "/student/my-applications",
    iconPaths: [
      "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z",
      "M14 2v6h6",
    ],
  },
  {
    type: "link",
    id: "university-search",
    label: "University Search",
    href: "/student/universities",
    iconPaths: ["M2 7l10-5 10 5-10 5z", "M2 17l10 5 10-5", "M2 12l10 5 10-5"],
  },
  {
    type: "link",
    id: "scholarship-search",
    label: "Scholarship Search",
    href: "/student/scholarships",
    iconPaths: [
      "M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z",
    ],
  },
  {
    type: "link",
    id: "ai-matching",
    label: "AI University Matching",
    href: "/student/ai-matching",
    iconPaths: [
      "M12 2l1 3.5L16.5 4l-1.5 3 3.5 1-3.5 1.5L16.5 13l-3.5-1.5L12 15l-1-3.5L7.5 13l1.5-3.5L5.5 8l3.5-1L7.5 4l3.5 1.5z",
      "M19 9l.5 1.5L21 11l-1.5.5L19 13l-.5-1.5L17 11l1.5-.5z",
      "M5 18l.5 1.5L7 20l-1.5.5L5 22l-.5-1.5L3 20l1.5-.5z",
    ],
  },
  {
    type: "link",
    id: "advisor-sessions",
    label: "1:1 Advisor Sessions",
    href: "/student/advisor-sessions",
    iconPaths: [
      "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2",
      "M12 7a4 4 0 100-8 4 4 0 000 8",
    ],
  },
  {
    type: "link",
    id: "ambassadors",
    label: "University Ambassadors",
    href: "/student/ambassadors",
    iconPaths: [
      "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2",
      "M9 7a4 4 0 100-8 4 4 0 000 8",
      "M22 21v-2a4 4 0 00-3-3.87",
      "M16 3.13a4 4 0 010 7.75",
    ],
  },
  {
    type: "link",
    id: "essay-review",
    label: "Essay Review",
    href: "/student/essay-review",
    iconPaths: [
      "M12 20h9",
      "M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z",
    ],
  },
  {
    type: "link",
    id: "application-support",
    label: "Application Support",
    href: "/student/application-support",
    iconPaths: ["M22 2L11 13", "M22 2l-7 20-4-9-9-4 20-7z"],
  },
  { type: "divider" },
  {
    type: "link",
    id: "account-settings",
    label: "Account Settings",
    href: "#",
    iconPaths: [
      "M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z",
      "M12 15a3 3 0 100-6 3 3 0 000 6",
    ],
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
    name: "Discover universities",
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
    name: "AI matching",
    desc: "Find universities that fit your profile",
    href: "/student/ai-matching",
    iconWrap: "bg-[#E6F1FB]",
    iconStroke: "#185FA5",
    icon: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
        <path d="M8 11h6M11 8v6" />
      </>
    ),
  },
  {
    name: "Essay review",
    desc: "Get AI-powered feedback on your essay",
    href: "/student/essay-review",
    iconWrap: "bg-[#EEEDFE]",
    iconStroke: "#534AB7",
    icon: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </>
    ),
  },
  {
    name: "Advisor sessions",
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
    name: "Application support",
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
    name: "Exam Prep",
    desc: "Prepare for IELTS, SAT, and more",
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
