"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";

import { fetchAdvisorDashboardMonthSessionsAndCalls } from "@/actions/advisor-dashboard-calendar";
import {
  getMeetingTiming,
  meetingTimingClass,
  meetingTimingLabel,
} from "@/lib/meeting-overdue";
import type { AdvisorSessionsAndCallsRow } from "../sessions-and-calls/_lib/advisor-sessions-and-calls-shared";
import {
  advisorSessionsAndCallsKindLabel,
  advisorSessionsAndCallsRowHref,
} from "../sessions-and-calls/_lib/advisor-sessions-and-calls-shared";

const fontSans =
  '"DM Sans", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"' as const;

const btnGhostClassName =
  "inline-flex cursor-pointer items-center gap-[5px] rounded-[8px] border-0 bg-transparent px-[10px] py-[6px] text-[12px] font-semibold leading-none text-[#6a6a6a] transition-all duration-150 hover:bg-[#f0f7f2] hover:text-[#1B4332]";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseYmd(ymd: string): Date {
  const [y, m, day] = ymd.split("-").map(Number);
  return new Date(y, m - 1, day, 12, 0, 0, 0);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function meetingYmd(meetingAt: string): string | null {
  const d = new Date(meetingAt);
  if (Number.isNaN(d.getTime())) return null;
  return toYmd(d);
}

function formatMeetingTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "All day";
    return format(d, "h:mm a");
  } catch {
    return "All day";
  }
}

function buildSessionMeta(row: AdvisorSessionsAndCallsRow): string {
  const parts = [advisorSessionsAndCallsKindLabel(row.kind)];
  if (row.schoolName && row.schoolName !== "—") parts.push(row.schoolName);
  if (row.subtitle) parts.push(row.subtitle);
  return parts.join(" · ");
}

function buildMonthCells(year: number, monthIndex: number): (Date | null)[] {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startPad = first.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, monthIndex, day, 12, 0, 0, 0));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

type Props = {
  initialMonthRows: AdvisorSessionsAndCallsRow[];
  initialYear: number;
  initialMonthIndex: number;
};

export function AdvisorDashboardCallsCalendar({
  initialMonthRows,
  initialYear,
  initialMonthIndex,
}: Props) {
  const today = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 12, 0, 0, 0);
  }, []);

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonthIndex);
  const [selectedYmd, setSelectedYmd] = useState(toYmd(today));
  const [monthRows, setMonthRows] = useState(initialMonthRows);
  const [isPending, startTransition] = useTransition();

  const yearOptions = useMemo(() => {
    const base = today.getFullYear();
    const years: number[] = [];
    for (let y = base - 2; y <= base + 2; y++) years.push(y);
    if (!years.includes(viewYear)) years.push(viewYear);
    return years.sort((a, b) => a - b);
  }, [today, viewYear]);

  useEffect(() => {
    if (viewYear === initialYear && viewMonth === initialMonthIndex) {
      setMonthRows(initialMonthRows);
      return;
    }

    let cancelled = false;
    startTransition(() => {
      void fetchAdvisorDashboardMonthSessionsAndCalls(viewYear, viewMonth).then(
        (rows) => {
          if (!cancelled) setMonthRows(rows);
        },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [viewYear, viewMonth, initialYear, initialMonthIndex, initialMonthRows]);

  const daysWithMeetings = useMemo(() => {
    const set = new Set<string>();
    for (const row of monthRows) {
      const ymd = meetingYmd(row.meetingAt);
      if (ymd) set.add(ymd);
    }
    return set;
  }, [monthRows]);

  const selectedRows = useMemo(() => {
    return monthRows.filter((row) => meetingYmd(row.meetingAt) === selectedYmd);
  }, [monthRows, selectedYmd]);

  const selectedDate = parseYmd(selectedYmd);
  const isSelectedToday = isSameDay(selectedDate, today);
  const cells = buildMonthCells(viewYear, viewMonth);

  const headingDate = selectedDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  function changeMonth(nextYear: number, nextMonth: number) {
    setViewYear(nextYear);
    setViewMonth(nextMonth);
    const selected = parseYmd(selectedYmd);
    if (selected.getFullYear() !== nextYear || selected.getMonth() !== nextMonth) {
      if (today.getFullYear() === nextYear && today.getMonth() === nextMonth) {
        setSelectedYmd(toYmd(today));
      } else {
        setSelectedYmd(toYmd(new Date(nextYear, nextMonth, 1, 12, 0, 0, 0)));
      }
    }
  }

  function selectDay(d: Date) {
    setSelectedYmd(toYmd(d));
  }

  return (
    <div
      className="mb-[18px] grid grid-cols-1 gap-[18px] min-[900px]:grid-cols-[minmax(280px,340px)_1fr]"
      style={{ fontFamily: fontSans }}
    >
      <div className="rounded-[14px] border border-[#ece9e4] bg-white p-[18px_20px]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              if (viewMonth === 0) changeMonth(viewYear - 1, 11);
              else changeMonth(viewYear, viewMonth - 1);
            }}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] border border-[#ece9e4] bg-white text-[#1B4332] transition-colors hover:bg-[#f0f7f2]"
            aria-label="Previous month"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <select
              value={viewMonth}
              onChange={(e) => changeMonth(viewYear, Number(e.target.value))}
              className="max-w-[55%] cursor-pointer rounded-[8px] border border-[#ece9e4] bg-[#faf9f4] px-2 py-1.5 text-[13px] font-semibold text-[#1a1a1a] outline-none focus:border-[#52B788]"
              aria-label="Select month"
            >
              {MONTH_OPTIONS.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={viewYear}
              onChange={(e) => changeMonth(Number(e.target.value), viewMonth)}
              className="cursor-pointer rounded-[8px] border border-[#ece9e4] bg-[#faf9f4] px-2 py-1.5 text-[13px] font-semibold text-[#1a1a1a] outline-none focus:border-[#52B788]"
              aria-label="Select year"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              if (viewMonth === 11) changeMonth(viewYear + 1, 0);
              else changeMonth(viewYear, viewMonth + 1);
            }}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] border border-[#ece9e4] bg-white text-[#1B4332] transition-colors hover:bg-[#f0f7f2]"
            aria-label="Next month"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-0.5">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="py-1.5 text-center text-[10.5px] font-semibold uppercase tracking-wide text-[#a0a0a0]"
            >
              {d}
            </div>
          ))}
        </div>

        <div
          className={`grid grid-cols-7 gap-0.5 ${isPending ? "opacity-60" : ""}`}
        >
          {cells.map((cell, i) => {
            if (!cell) {
              return <div key={`empty-${i}`} className="aspect-square" />;
            }
            const ymd = toYmd(cell);
            const isSelected = ymd === selectedYmd;
            const isToday = isSameDay(cell, today);
            const hasMeetings = daysWithMeetings.has(ymd);

            return (
              <button
                key={ymd}
                type="button"
                onClick={() => selectDay(cell)}
                className={[
                  "relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[10px] text-[13px] font-semibold transition-colors",
                  isSelected
                    ? "bg-[#1B4332] text-white"
                    : isToday
                      ? "bg-[#E8F5EE] text-[#1B4332] hover:bg-[#d8efe3]"
                      : "text-[#1a1a1a] hover:bg-[#f0f7f2]",
                ].join(" ")}
                aria-label={cell.toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                aria-pressed={isSelected}
              >
                {cell.getDate()}
                {hasMeetings ? (
                  <span
                    className={[
                      "absolute bottom-1 h-1 w-1 rounded-full",
                      isSelected ? "bg-white" : "bg-[#52B788]",
                    ].join(" ")}
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[14px] border border-[#ece9e4] bg-white p-[20px_22px]">
        <div className="mb-[14px] flex items-center justify-between">
          <div>
            <div className="text-[14px] font-bold text-[#1a1a1a]">
              {isSelectedToday ? "Today's calls" : "Sessions & calls"}
            </div>
            <div className="text-[12px] font-medium text-[#6a6a6a]">
              {headingDate} · {selectedRows.length} scheduled
            </div>
          </div>
          <Link href="/advisor/sessions-and-calls" className={btnGhostClassName}>
            View all →
          </Link>
        </div>

        {selectedRows.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-[#6a6a6a]">
            No calls or sessions scheduled for this day
          </div>
        ) : (
          selectedRows.map((row) => {
            const meetingTiming = getMeetingTiming(row.meetingAt);
            return (
            <Link
              key={`${row.kind}-${row.id}`}
              href={advisorSessionsAndCallsRowHref(row.kind, row.id)}
              className="flex items-center gap-3 border-b border-[#ece9e4] py-[11px] last:border-b-0 transition-colors hover:bg-[#faf9f4]"
            >
              <div className="min-w-[62px]">
                <div className="text-[12px] font-bold text-[#1B4332]">
                  {formatMeetingTime(row.meetingAt)}
                </div>
                {meetingTiming ? (
                  <div className={meetingTimingClass(meetingTiming)}>
                    {meetingTimingLabel(meetingTiming)}
                  </div>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-[2px] text-[13.5px] font-semibold text-[#1a1a1a]">
                  {row.studentName}
                </div>
                <div className="text-[11.5px] text-[#6a6a6a]">
                  {buildSessionMeta(row)}
                </div>
              </div>
            </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
