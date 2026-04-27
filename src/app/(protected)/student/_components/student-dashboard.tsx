"use client";

import Link from "next/link";
import { useState } from "react";
import {
  activityConfig,
  activityFeed,
  announcements,
  deadlines,
  initialTasks,
  insights,
  newsItems,
  quickActions,
  savedAdvisors,
  savedAmbassadors,
  savedScholarships,
  savedTabLabels,
  savedUniversities,
  userActivity,
} from "../_data/student-dashboard-data";

const annDotClass = {
  new: "bg-[#52B788]",
  info: "bg-[#378ADD]",
  warn: "bg-[#E65100]",
} as const;

const dlDateClass = {
  urgent: "bg-[#FCEBEB] text-[#C0392B]",
  soon: "bg-[#FFF3E0] text-[#E65100]",
  ok: "bg-[var(--green-bg)] text-[var(--green)]",
} as const;

const newsTagClass = {
  visa: "bg-[#E6F1FB] text-[#185FA5]",
  deadline: "bg-[#FFF3E0] text-[#E65100]",
  update: "bg-[var(--green-bg)] text-[var(--green)]",
} as const;

const savedByTab = [
  savedUniversities,
  savedScholarships,
  savedAdvisors,
  savedAmbassadors,
];

export function StudentDashboard() {
  const [savedTab, setSavedTab] = useState(0);
  const [tasks, setTasks] = useState(initialTasks);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  };

  return (
    <div className="text-[var(--text)]">
      <div className="mb-5 grid gap-3.5 max-[800px]:grid-cols-1 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="mb-3.5">
            <h1 className="font-[family-name:var(--font-dm-serif)] text-2xl text-[var(--text)]">
              Welcome back, Noura
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
                    To unlock full value, explore all features: AI Matching,
                    Essay Review, Advisor Sessions, Ambassadors, Scholarships,
                    and Application Support.
                  </span>
                </span>
              </div>
              <p className="text-xs text-[var(--text-light)]">
                You&apos;ve explored 4 of 8 platform features
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded bg-[var(--border-light)]">
                <div
                  className="h-full rounded bg-[var(--green)] transition-[width] duration-500"
                  style={{ width: "50%" }}
                />
              </div>
            </div>
            <div className="min-w-[50px] text-right text-xl font-bold text-[var(--green)]">
              50%
            </div>
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
            {announcements.map((a) => (
              <div
                key={`${a.text}-${a.date}`}
                className="flex items-start gap-2.5 rounded-lg bg-[var(--sand)] px-2.5 py-2 text-xs leading-snug text-[var(--text-mid)]"
              >
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${annDotClass[a.dot]}`}
                />
                <div>
                  {a.text}
                  <div className="mt-0.5 text-[10px] text-[var(--text-hint)]">
                    {a.date}
                  </div>
                </div>
              </div>
            ))}
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
              onClick={(e) => e.preventDefault()}
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

      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-hint)]">
        Your activity
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 min-[801px]:grid-cols-4">
        {activityConfig.map((m) => (
          <div
            key={m.key}
            className="rounded-xl border border-[var(--border-light)] bg-white px-4 py-4 text-center"
          >
            <div className="font-[family-name:var(--font-dm-serif)] text-2xl font-bold text-[var(--green)]">
              {userActivity[m.key] ?? 0}
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-[var(--text-light)]">
              {m.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5 rounded-2xl border border-[var(--border-light)] bg-white px-[22px] py-5 max-[800px]:px-5">
        <div className="mb-3.5 flex items-center gap-2 text-sm font-semibold [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0 [&>svg]:opacity-40">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden
          >
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
          </svg>
          Your saved items
        </div>
        <div className="mb-3.5 flex gap-0 border-b border-[var(--border-light)]">
          {savedTabLabels.map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => setSavedTab(idx)}
              className={`cursor-pointer border-b-2 px-[18px] py-2.5 text-xs font-medium transition-colors ${
                savedTab === idx
                  ? "border-[var(--green)] font-semibold text-[var(--green-dark)]"
                  : "border-transparent text-[var(--text-light)] hover:text-[var(--text-mid)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-[var(--border)]">
          {savedByTab[savedTab]?.map((item) => (
            <div
              key={`${item.name}-${item.sub}`}
              className="min-w-[200px] max-w-[200px] shrink-0 cursor-pointer rounded-xl border border-[var(--border-light)] bg-[var(--sand)] p-3.5 transition-colors hover:border-[var(--border)] hover:bg-white"
            >
              <div className="mb-1.5 text-sm">{item.flag}</div>
              <div className="truncate text-[13px] font-semibold">{item.name}</div>
              <div className="text-[11px] text-[var(--text-light)]">{item.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-5 grid gap-3.5 max-[800px]:grid-cols-1 md:grid-cols-2">
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
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Suggested for you
          </div>
          <div className="flex flex-col gap-2">
            {insights.map((ins) => (
              <div
                key={ins.cta}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#d5e8db] bg-[var(--green-pale)] p-3 transition-colors hover:bg-[var(--green-bg)]"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#d5e8db] bg-white">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2D6A4F"
                    strokeWidth="2"
                    aria-hidden
                  >
                    {ins.icon}
                  </svg>
                </div>
                <div>
                  <div className="text-[12.5px] leading-relaxed text-[var(--text-mid)]">
                    {ins.text}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-[var(--green)]">
                    {ins.cta}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
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
                <path d="M12 6v6l4 2" />
              </svg>
              Upcoming deadlines
            </div>
            <div className="flex flex-col gap-1.5">
              {deadlines.map((d) => (
                <div
                  key={`${d.name}-${d.date}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--border-light)] bg-[var(--sand)] px-3 py-2.5"
                >
                  <div className="flex items-center gap-2.5 text-xs font-medium">
                    <span className="text-sm">{d.flag}</span>
                    {d.name}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${dlDateClass[d.urgency]}`}
                  >
                    {d.date}
                  </span>
                </div>
              ))}
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
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
              Tasks
            </div>
            <div className="flex flex-col gap-1.5">
              {tasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTask(t.id)}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-[var(--border-light)] bg-[var(--sand)] px-3 py-2.5 text-left transition-colors hover:bg-white"
                >
                  <span
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors ${
                      t.done
                        ? "border-[var(--green)] bg-[var(--green)]"
                        : "border-[var(--border)]"
                    }`}
                  >
                    {t.done ? (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3"
                        aria-hidden
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : null}
                  </span>
                  <span
                    className={`text-xs text-[var(--text-mid)] ${
                      t.done
                        ? "text-[var(--text-hint)] line-through"
                        : ""
                    }`}
                  >
                    {t.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative mb-5 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#40916C] px-9 py-8 text-white after:pointer-events-none after:absolute after:-right-[60px] after:-top-[60px] after:h-[200px] after:w-[200px] after:rounded-full after:bg-white/[0.04] max-[800px]:px-8">
        <h2 className="relative z-[1] font-[family-name:var(--font-dm-serif)] text-[22px]">
          Let us handle your applications
        </h2>
        <p className="relative z-[1] mt-2 max-w-[480px] text-[13px] leading-relaxed text-white/70">
          Apply to multiple universities with full expert support — document
          checks, deadline management, personal statement refinement, and
          direct access to application specialists.
        </p>
        <button
          type="button"
          className="relative z-[1] mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full border-0 bg-white px-7 py-3 text-[13px] font-semibold text-[var(--green-dark)] transition-all hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
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
        </button>
      </div>

      <div className="mb-5 grid gap-3.5 max-[800px]:grid-cols-1 md:grid-cols-2">
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
          <div className="flex flex-col gap-2">
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
          <div className="flex flex-col">
            {activityFeed.map((a) => (
              <div
                key={`${a.label}-${a.time}`}
                className="flex items-center gap-3 border-b border-[var(--border-light)] py-2.5 text-xs text-[var(--text-mid)] last:border-b-0"
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${a.iconWrap}`}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={a.iconStroke}
                    strokeWidth="2"
                    aria-hidden
                  >
                    {a.icon}
                  </svg>
                </div>
                {a.label}
                <span className="ml-auto shrink-0 whitespace-nowrap text-[10px] text-[var(--text-hint)]">
                  {a.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
