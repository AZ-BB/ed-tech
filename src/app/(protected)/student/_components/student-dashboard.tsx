"use client";

import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  newsItems,
  quickActions,
  type DashboardActivityLogItem,
  type DashboardAnnouncementItem,
  type DashboardTaskItem,
} from "../_data/student-dashboard-data";
import { StudentDashboardActivityStats } from "./student-dashboard-activity-stats";
import { StudentDashboardCollections } from "./student-dashboard-collections";

function formatDashboardTimestamp(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatDistanceToNow(d, { addSuffix: true });
}

/** Student dashboard only: maps stored log copy to second-person. Does not change DB values. */
function formatActivityLogMessageForStudent(message: string): string {
  let s = message.trimStart();
  if (s.startsWith("Student ")) {
    s = `You ${s.slice("Student ".length)}`;
  }
  return s.replace(/\btheir\b/g, "your");
}

const announcementDotClass =
  "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#378ADD]";

const SCROLL_THIN =
  "overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-[var(--border)]";

const NEWS_LIST_CLASS = `max-h-[240px] ${SCROLL_THIN}`;
const TASKS_LIST_CLASS = `max-h-[260px] ${SCROLL_THIN}`;
const ACTIVITY_LIST_CLASS = `max-h-[190px] ${SCROLL_THIN}`;

function activityLogAccent(entityType: string): {
  iconWrap: string;
  iconStroke: string;
} {
  switch (entityType) {
    case "university":
      return { iconWrap: "bg-[var(--green-bg)]", iconStroke: "#2D6A4F" };
    case "scholarship":
      return { iconWrap: "bg-[#FEF9C3]", iconStroke: "#854D0E" };
    case "advisor_sessions":
      return { iconWrap: "bg-[#FAEEDA]", iconStroke: "#854F0B" };
    case "ambassador_sessions":
      return { iconWrap: "bg-[#CCFBF1]", iconStroke: "#0F766E" };
    case "ambassador":
      return { iconWrap: "bg-[#DBEAFE]", iconStroke: "#1D4ED8" };
    case "essay_review":
      return { iconWrap: "bg-[#EEEDFE]", iconStroke: "#534AB7" };
    case "ai_university_matching":
      return { iconWrap: "bg-[#E0F2FE]", iconStroke: "#0369A1" };
    default:
      return { iconWrap: "bg-[var(--sand)]", iconStroke: "#7a7a7a" };
  }
}

const newsTagClass = {
  visa: "bg-[#E6F1FB] text-[#185FA5]",
  deadline: "bg-[#FFF3E0] text-[#E65100]",
  update: "bg-[var(--green-bg)] text-[var(--green)]",
} as const;

type StudentDashboardProps = {
  welcomeFirstName: string;
  platformCompleted: number;
  platformTotal: number;
  platformPercent: number;
  totalLogins: number;
  announcementItems: DashboardAnnouncementItem[];
  activityLogItems: DashboardActivityLogItem[];
  dashboardTasks: DashboardTaskItem[];
};

export function StudentDashboard({
  welcomeFirstName,
  platformCompleted,
  platformTotal,
  platformPercent,
  totalLogins,
  announcementItems,
  activityLogItems,
  dashboardTasks,
}: StudentDashboardProps) {
  return (
    <div className="text-[var(--text)]">
      <div className="mb-5 grid gap-3.5 max-[800px]:grid-cols-1 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="mb-3.5">
            <h1 className="font-[family-name:var(--font-dm-serif)] text-2xl text-[var(--text)]">
              {welcomeFirstName
                ? `Welcome back, ${welcomeFirstName}`
                : "Welcome back"}
            </h1>
            <p className="mt-1 text-[13px] text-[var(--text-light)]">
              Here&apos;s everything you need to continue your university
              journey.
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-[var(--border-light)] bg-white px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold">
                Platform completion
                <span className="group relative inline-flex cursor-pointer">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text-hint)"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <title>Completion info</title>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  <span className="pointer-events-none absolute left-1/2 top-6 z-10 hidden w-[280px] -translate-x-1/2 rounded-[10px] border border-[var(--border-light)] bg-white p-3 text-[11px] leading-snug text-[var(--text-mid)] shadow-[0_4px_16px_rgba(0,0,0,0.1)] group-hover:block">
                    To unlock full value, explore all features: university
                    search (including AI matching), essay feedback (under My
                    applications → Essays), advisor sessions, ambassadors,
                    scholarships, and application support.
                  </span>
                </span>
              </div>
              <p className="text-xs text-[var(--text-light)]">
                You&apos;ve explored {platformCompleted} of {platformTotal}{" "}
                platform features
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded bg-[var(--border-light)]">
                <div
                  className="h-full rounded bg-[var(--green)] transition-[width] duration-500"
                  style={{ width: `${platformPercent}%` }}
                />
              </div>
            </div>
            <div className="min-w-[50px] text-right text-xl font-bold text-[var(--green)]">
              {platformPercent}%
            </div>
          </div>

          <div className="mt-3.5 flex flex-col gap-4 rounded-2xl border border-[var(--border-light)] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8 sm:py-6">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[var(--text)]">
                My Applications
              </h2>
              <p className="mt-1 max-w-xl text-[13px] leading-snug text-[var(--text-light)]">
                Keep your school informed on all your university choices and
                progress.
              </p>
            </div>
            <Link
              href="/student/my-applications"
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-[var(--green)] px-6 py-3 text-[13px] font-semibold text-white no-underline transition-all hover:bg-[var(--green-dark)] hover:-translate-y-px sm:self-center"
            >
              My Applications
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-light)] bg-white px-[22px] py-5 max-[800px]:px-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0 [&>svg]:opacity-40">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden
            >
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            </svg>
            Announcements
          </div>
          <div className="flex max-h-[140px] flex-col gap-2 overflow-y-auto">
            {announcementItems.length === 0 ? (
              <p className="px-0.5 text-xs text-[var(--text-hint)]">
                No announcements yet.
              </p>
            ) : (
              announcementItems.map((a) => {
                const timeLabel = formatDashboardTimestamp(a.createdAt);
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-2.5 rounded-lg bg-[var(--sand)] px-2.5 py-2 text-xs leading-snug text-[var(--text-mid)]"
                  >
                    <span className={announcementDotClass} aria-hidden />
                    <div className="min-w-0">
                      <div className="break-words">{a.title}</div>
                      {timeLabel ? (
                        <div className="mt-0.5 text-[10px] text-[var(--text-hint)]">
                          {timeLabel}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-hint)]">
        Quick actions
      </div>
      <div className="mb-5 w-full min-w-0">
        {/* Column-first 2-row layout (matches original hub); minmax prevents overflow */}
        <div className="grid w-full min-w-0 grid-flow-col grid-rows-2 gap-3 [grid-auto-columns:minmax(0,1fr)] max-[800px]:grid-flow-row max-[800px]:grid-rows-none max-[800px]:grid-cols-1 max-[800px]:auto-cols-auto sm:max-[800px]:grid-cols-2">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              scroll={false}
              className="block min-w-0 text-inherit no-underline"
            >
              <div className="flex min-w-0 cursor-pointer items-start gap-3.5 rounded-2xl border border-[var(--border-light)] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--border)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
                <div
                  className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl ${action.iconWrap}`}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={action.iconStroke}
                    strokeWidth="1.8"
                    aria-hidden
                  >
                    {action.icon}
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="mb-0.5 text-sm font-semibold">
                    {action.name}
                  </div>
                  <div className="text-[11px] leading-snug text-[var(--text-light)]">
                    {action.desc}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <StudentDashboardActivityStats totalLogins={totalLogins} />

      <StudentDashboardCollections />

      <div className="relative mb-5 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#40916C] px-9 py-8 text-white after:pointer-events-none after:absolute after:-right-[60px] after:-top-[60px] after:h-[200px] after:w-[200px] after:rounded-full after:bg-white/[0.04] max-[800px]:px-8">
        <h2 className="relative z-[1] font-[family-name:var(--font-dm-serif)] text-[22px]">
          Let us handle your applications
        </h2>
        <p className="relative z-[1] mt-2 max-w-[480px] text-[13px] leading-relaxed text-white/70">
          Apply to multiple universities with full expert support — document
          checks, deadline management, personal statement refinement, and direct
          access to application specialists.
        </p>
        <Link
          href="/student/application-support"
          className="relative z-[1] mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full border-0 bg-white px-7 py-3 text-[13px] font-semibold text-[#40916C] transition-all hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
        >
          Start application support
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="mb-5 grid gap-3.5 max-[800px]:grid-cols-1 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border-light)] bg-white px-[22px] py-5 max-[800px]:px-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0 [&>svg]:opacity-40">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
            Top news & updates
          </div>
          <div className={`flex flex-col gap-2 ${NEWS_LIST_CLASS}`}>
            {newsItems.map((n) => (
              <div
                key={`${n.text}-${n.date}`}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border-light)] bg-[var(--sand)] p-3 transition-colors hover:border-[var(--border)] hover:bg-white"
              >
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${newsTagClass[n.tag]}`}
                >
                  {n.tag === "visa"
                    ? "Visa"
                    : n.tag === "deadline"
                      ? "Deadline"
                      : "Update"}
                </span>
                <div>
                  <div className="text-[12.5px] leading-snug text-[var(--text-mid)]">
                    {n.text}
                  </div>
                  <div className="mt-0.5 text-[10px] text-[var(--text-hint)]">
                    {n.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[20px] border border-[var(--border-light)] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] max-[800px]:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-light)] bg-[var(--sand)] text-[var(--text)]"
              aria-hidden
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12.5l2.5 2.5L16 9" />
              </svg>
            </span>
            <h2 className="font-[family-name:var(--font-dm-serif)] text-lg font-semibold tracking-tight text-[var(--text)]">
              Tasks
            </h2>
          </div>
          <div className={`flex flex-col gap-3 ${TASKS_LIST_CLASS}`}>
            {dashboardTasks.length === 0 ? (
              <p className="rounded-xl bg-[#f4f4f5] px-5 py-4 text-[13px] text-[var(--text-mid)]">
                No tasks yet. Your counsellor can assign items here.
              </p>
            ) : (
              dashboardTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 rounded-xl bg-[#f4f4f5] px-5 py-4"
                >
                  <span className="shrink-0" aria-hidden>
                    {task.completed ? (
                      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-[#1B4332]">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </span>
                    ) : (
                      <span className="relative flex h-[22px] w-[22px] items-center justify-center rounded-[5px] border-[1.5px] border-[#d4d4d8] bg-white">
                        <svg
                          className="absolute opacity-[0.18]"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[14px] font-medium leading-snug ${
                        task.completed
                          ? "text-[#a1a1aa] line-through decoration-[#a1a1aa]"
                          : "text-[#18181b]"
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.notes?.trim() ? (
                      <p
                        className={`mt-1 line-clamp-2 text-[12px] leading-snug ${
                          task.completed
                            ? "text-[#c4c4c4] line-through"
                            : "text-[var(--text-mid)]"
                        }`}
                      >
                        {task.notes.trim()}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 border-t border-[var(--border-light)] pt-4">
            <Link
              href="/student/my-applications"
              className="text-[12px] font-semibold text-[var(--green)] no-underline hover:text-[var(--green-dark)]"
            >
              Manage in My applications →
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-light)] bg-white px-[22px] py-5 max-[800px]:px-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0 [&>svg]:opacity-40">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden
            >
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            Recent activity
          </div>
          <div className={`flex flex-col ${ACTIVITY_LIST_CLASS}`}>
            {activityLogItems.length === 0 ? (
              <p className="text-xs text-[var(--text-hint)]">
                No recent activity yet.
              </p>
            ) : (
              activityLogItems.map((a) => {
                const timeLabel = formatDashboardTimestamp(a.createdAt);
                const accent = activityLogAccent(a.entityType);
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 border-b border-[var(--border-light)] py-2.5 text-xs text-[var(--text-mid)] last:border-b-0"
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent.iconWrap}`}
                      aria-hidden
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={accent.iconStroke}
                        strokeWidth="2"
                        aria-hidden
                      >
                        <path d="M12 8v4l3 3" />
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    </div>
                    <span className="min-w-0 flex-1 break-words">
                      {formatActivityLogMessageForStudent(a.message)}
                    </span>
                    {timeLabel ? (
                      <span className="ml-auto shrink-0 whitespace-nowrap text-[10px] text-[var(--text-hint)]">
                        {timeLabel}
                      </span>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
