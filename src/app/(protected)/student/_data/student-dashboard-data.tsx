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
    id: "university-search",
    label: "University Search",
    href: "/student/universities",
    iconPaths: [
      "M2 7l10-5 10 5-10 5z",
      "M2 17l10 5 10-5",
      "M2 12l10 5 10-5",
    ],
  },
  {
    type: "link",
    id: "scholarship-search",
    label: "Scholarship Search",
    href: "/student/scholarships",
    iconPaths: ["M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z"],
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
    label: "1-1 Advisor Session",
    href: "#",
    iconPaths: [
      "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2",
      "M12 7a4 4 0 100-8 4 4 0 000 8",
    ],
  },
  {
    type: "link",
    id: "ambassadors",
    label: "University Ambassadors",
    href: "#",
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
    href: "#",
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

export const userActivity = {
  universities_viewed: 12,
  universities_saved: 5,
  scholarships_saved: 3,
  essays_reviewed: 2,
  advisor_sessions_booked: 1,
  ambassador_sessions_booked: 0,
  total_logins: 7,
  ai_matches_generated: 4,
} as const;

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

export const announcements = [
  {
    dot: "new" as const,
    text: "UK deadlines updated for 2026 intake",
    date: "2 hours ago",
  },
  {
    dot: "info" as const,
    text: "3 new scholarships added this week",
    date: "Yesterday",
  },
  {
    dot: "warn" as const,
    text: "Your school uploaded new guidance materials",
    date: "Mar 28",
  },
  {
    dot: "new" as const,
    text: "New ambassador from NYU Abu Dhabi available",
    date: "Mar 27",
  },
];

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
    href: "#",
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
    href: "#",
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
    href: "#",
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
    href: "#",
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

export const savedUniversities = [
  { flag: "🇬🇧", name: "University of Manchester", sub: "Business — Manchester, UK" },
  { flag: "🇨🇦", name: "University of Toronto", sub: "Rotman Commerce — Toronto" },
  { flag: "🇬🇧", name: "King's College London", sub: "Law — London, UK" },
  { flag: "🇦🇪", name: "NYU Abu Dhabi", sub: "Economics — Abu Dhabi" },
  { flag: "🇨🇦", name: "UBC Sauder", sub: "Business — Vancouver" },
];

export const savedScholarships = [
  { flag: "🇦🇪", name: "UAE MOHESR Scholarship", sub: "Full ride — Government" },
  { flag: "🇨🇦", name: "UofT Pearson Scholarship", sub: "Full ride — University" },
  { flag: "🇬🇧", name: "Chevening Scholarship", sub: "Full ride — UK Government" },
];

export const savedAdvisors = [
  { flag: "👤", name: "Sarah Al-Khatib", sub: "UK & Canada — 8+ years" },
];

export const savedAmbassadors = [
  { flag: "🇬🇧", name: "Noura A. — Manchester", sub: "Business — Class of 2024" },
  { flag: "🇨🇦", name: "Khalid R. — UBC", sub: "Computer Science — Current" },
];

export const savedTabLabels = [
  "Universities",
  "Scholarships",
  "Advisors",
  "Ambassadors",
] as const;

export const insights: { text: ReactNode; cta: string; icon: ReactNode }[] = [
  {
    text: (
      <>
        You&apos;ve saved mostly UK universities — explore{" "}
        <strong>Canada options</strong> to broaden your choices
      </>
    ),
    cta: "Explore Canadian universities →",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
      </>
    ),
  },
  {
    text: (
      <>
        You haven&apos;t reviewed your personal statement yet —{" "}
        <strong>start your essay review</strong>
      </>
    ),
    cta: "Review my essay →",
    icon: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </>
    ),
  },
  {
    text: (
      <>
        You may qualify for <strong>3 scholarships</strong> based on your
        profile — check eligibility
      </>
    ),
    cta: "View scholarships →",
    icon: (
      <path d="M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z" />
    ),
  },
];

export const deadlines = [
  { flag: "🇬🇧", name: "UCL — Business", urgency: "urgent" as const, date: "Jan 15" },
  { flag: "🇨🇦", name: "University of Toronto", urgency: "soon" as const, date: "Feb 1" },
  { flag: "🇬🇧", name: "Manchester — UCAS", urgency: "ok" as const, date: "Jun 30" },
];

export const initialTasks = [
  { id: "t1", text: "Complete your profile", done: true },
  { id: "t2", text: "Upload transcript", done: false },
  { id: "t3", text: "Finalize personal statement", done: false },
  { id: "t4", text: "Shortlist 5 universities", done: false },
];

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

export type ActivityItem = {
  label: string;
  time: string;
  iconWrap: string;
  iconStroke: string;
  icon: ReactNode;
};

export const activityFeed: ActivityItem[] = [
  {
    label: "Viewed University of Toronto",
    time: "2h ago",
    iconWrap: "bg-[var(--green-bg)]",
    iconStroke: "#2D6A4F",
    icon: (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
  {
    label: "Saved Chevening Scholarship",
    time: "Yesterday",
    iconWrap: "bg-[#FAEEDA]",
    iconStroke: "#854F0B",
    icon: (
      <path d="M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z" />
    ),
  },
  {
    label: "Booked session with Sarah Al-Khatib",
    time: "Mar 28",
    iconWrap: "bg-[#E6F1FB]",
    iconStroke: "#185FA5",
    icon: (
      <>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
  },
  {
    label: "Completed essay review",
    time: "Mar 27",
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
    label: "Saved King's College London",
    time: "Mar 26",
    iconWrap: "bg-[var(--green-bg)]",
    iconStroke: "#2D6A4F",
    icon: (
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
    ),
  },
  {
    label: "Connected with ambassador Khalid R.",
    time: "Mar 25",
    iconWrap: "bg-[#FAEEDA]",
    iconStroke: "#854F0B",
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
      </>
    ),
  },
];