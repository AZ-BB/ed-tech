import Link from "next/link";
import { format } from "date-fns";

import type { AdvisorSessionsAndCallsRow } from "../sessions-and-calls/_lib/advisor-sessions-and-calls-shared";
import {
  advisorSessionsAndCallsKindLabel,
  advisorSessionsAndCallsRowHref,
} from "../sessions-and-calls/_lib/advisor-sessions-and-calls-shared";

import type { AdvisorDashboardPayload } from "../_lib/parse-advisor-dashboard";

import { AdvisorDashboardKpiGrid } from "./advisor-dashboard-kpi-grid";

const fontSans =
  '"DM Sans", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"' as const;
const fontSerif = '"DM Serif Display", Georgia, serif' as const;

const btnGhostClassName =
  "inline-flex cursor-pointer items-center gap-[5px] rounded-[8px] border-0 bg-transparent px-[10px] py-[6px] text-[12px] font-semibold leading-none text-[#6a6a6a] transition-all duration-150 hover:bg-[#f0f7f2] hover:text-[#1B4332]";

type AdvisorDashboardWelcome = {
  firstName: string;
  displayName: string;
  title?: string;
};

type Props = {
  data: AdvisorDashboardPayload;
  todaysSessionsAndCalls: AdvisorSessionsAndCallsRow[];
  welcome: AdvisorDashboardWelcome;
};

function formatTodayHeading(count: number): string {
  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return `${dateLabel} · ${count} scheduled`;
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

function formatSentAgo(iso: string | null): string {
  if (!iso) return "Sent recently";
  const sent = new Date(iso);
  if (Number.isNaN(sent.getTime())) return "Sent recently";

  const now = new Date();
  const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const sentYmd = `${sent.getFullYear()}-${String(sent.getMonth() + 1).padStart(2, "0")}-${String(sent.getDate()).padStart(2, "0")}`;
  const todayMs = new Date(`${todayYmd}T12:00:00`).getTime();
  const sentMs = new Date(`${sentYmd}T12:00:00`).getTime();
  const diffDays = Math.round((todayMs - sentMs) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Sent today";
  if (diffDays === 1) return "Sent yesterday";
  return `Sent ${diffDays} days ago`;
}

function formatAmountAed(amount: number): string {
  return `AED ${amount.toLocaleString()}`;
}

function formatDeadlineLabel(daysUntil: number): string {
  if (daysUntil === 0) return "Deadline today";
  if (daysUntil === 1) return "Deadline in 1 day";
  return `Deadline in ${daysUntil} days`;
}

function deadlineDotClass(daysUntil: number): string {
  if (daysUntil < 14) return "bg-[#d97706]";
  return "bg-[#52B788]";
}

export function AdvisorDashboard({ data, todaysSessionsAndCalls, welcome }: Props) {
  const { kpis, conversionMetrics, awaitingPayment, upcomingDeadlines } = data;

  return (
    <div style={{ fontFamily: fontSans }}>
      <div className="mb-[22px] rounded-[14px] border border-[#ece9e4] bg-white px-6 py-3 shadow-sm">
        <h2
          className="text-[20px] font-semibold tracking-[-0.01em] text-[#2D6A4F]"
          style={{ fontFamily: fontSerif }}
        >
          Welcome{welcome.firstName ? `, ${welcome.firstName}` : ""}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-[#666]">
          You are signed in to the Univeera advisor portal as{" "}
          <span className="font-medium text-[#1a1a1a]">{welcome.displayName}</span>
          {welcome.title ? (
            <>
              {" "}
              (<span className="text-[#4a4a4a]">{welcome.title}</span>)
            </>
          ) : null}
          .
        </p>
      </div>

      <AdvisorDashboardKpiGrid kpis={kpis} />

      <div className="mb-[18px] grid grid-cols-1 gap-[18px] min-[1101px]:grid-cols-[2fr_1fr]">
        <div className="rounded-[14px] border border-[#ece9e4] bg-white p-[20px_22px]">
          <div className="mb-[14px] flex items-center justify-between">
            <div>
              <div className="text-[14px] font-bold text-[#1a1a1a]">Today&apos;s calls</div>
              <div className="text-[12px] font-medium text-[#6a6a6a]">
                {formatTodayHeading(todaysSessionsAndCalls.length)}
              </div>
            </div>
            <Link href="/advisor/sessions-and-calls" className={btnGhostClassName}>
              View all →
            </Link>
          </div>

          {todaysSessionsAndCalls.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#6a6a6a]">
              No calls or sessions scheduled for today
            </div>
          ) : (
            todaysSessionsAndCalls.map((row) => (
              <Link
                key={`${row.kind}-${row.id}`}
                href={advisorSessionsAndCallsRowHref(row.kind, row.id)}
                className="flex items-center gap-3 border-b border-[#ece9e4] py-[11px] last:border-b-0 transition-colors hover:bg-[#faf9f4]"
              >
                <div className="min-w-[62px]">
                  <div className="text-[12px] font-bold text-[#1B4332]">
                    {formatMeetingTime(row.meetingAt)}
                  </div>
                  {row.isOverdue ? (
                    <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#d97706]">
                      Overdue
                    </div>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-[2px] text-[13.5px] font-semibold text-[#1a1a1a]">
                    {row.studentName}
                  </div>
                  <div className="text-[11.5px] text-[#6a6a6a]">{buildSessionMeta(row)}</div>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="rounded-[14px] border border-[#ece9e4] bg-white p-[20px_22px]">
          <div className="mb-[14px] text-[14px] font-bold text-[#1a1a1a]">Conversion metrics</div>

          <div className="flex items-center justify-between border-b border-[#ece9e4] py-[11px]">
            <div className="text-[12.5px] font-medium text-[#6a6a6a]">Call-to-package conversion</div>
            <div className="text-[14px] font-bold text-[#1a1a1a]">
              {conversionMetrics.callToPackagePct}%
            </div>
          </div>
          <div className="-mt-[6px] mb-[10px]">
            <div className="h-[6px] overflow-hidden rounded-[3px] bg-[#f0f7f2]">
              <div
                className="h-full rounded-[3px] bg-[#52B788] transition-[width] duration-300"
                style={{ width: `${Math.min(100, conversionMetrics.callToPackagePct)}%` }}
              />
            </div>
          </div>

          {[
            { label: "Calls completed (month)", value: conversionMetrics.callsCompletedMonth },
            { label: "Packages purchased", value: conversionMetrics.packagesPurchased },
            {
              label: "Avg. days call → signup",
              value:
                conversionMetrics.avgDaysCallToSignup != null
                  ? conversionMetrics.avgDaysCallToSignup
                  : "—",
            },
            {
              label: "Students under management",
              value: conversionMetrics.studentsUnderManagement,
            },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between border-b border-[#ece9e4] py-[11px] last:border-b-0"
            >
              <div className="text-[12.5px] font-medium text-[#6a6a6a]">{row.label}</div>
              <div
                className="text-[14px] font-bold text-[#1a1a1a]"
                style={row.label === "Avg. days call → signup" ? { fontFamily: fontSerif } : undefined}
              >
                {row.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[18px] min-[900px]:grid-cols-2">
        <div className="rounded-[14px] border border-[#ece9e4] bg-white p-[20px_22px]">
          <div className="mb-[14px] text-[14px] font-bold text-[#1a1a1a]">Awaiting payment</div>
          {awaitingPayment.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#6a6a6a]">
              No pending payment requests
            </div>
          ) : (
            awaitingPayment.map((item) => (
              <div
                key={item.applicationId}
                className="flex gap-[11px] border-b border-[#ece9e4] py-[10px] last:border-b-0"
              >
                <div className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full bg-[#2563eb]" />
                <div>
                  <div className="text-[12.5px] leading-[1.45] text-[#4a4a4a]">
                    <span className="font-semibold text-[#1a1a1a]">{item.studentName}</span>
                    {" · "}
                    {item.packageLabel}
                  </div>
                  <div className="mt-[2px] text-[11px] text-[#a0a0a0]">
                    {formatSentAgo(item.sentAt)} · {formatAmountAed(item.amount)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-[14px] border border-[#ece9e4] bg-white p-[20px_22px]">
          <div className="mb-[14px] text-[14px] font-bold text-[#1a1a1a]">Upcoming uni deadlines</div>
          {upcomingDeadlines.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#6a6a6a]">
              No upcoming deadlines
            </div>
          ) : (
            upcomingDeadlines.map((item) => (
              <div
                key={`${item.studentId}-${item.universityName}-${item.deadline}`}
                className="flex gap-[11px] border-b border-[#ece9e4] py-[10px] last:border-b-0"
              >
                <div
                  className={`mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full ${deadlineDotClass(item.daysUntil)}`}
                />
                <div>
                  <div className="text-[12.5px] leading-[1.45] text-[#4a4a4a]">
                    <span className="font-semibold text-[#1a1a1a]">{item.studentName}</span>
                    {" · "}
                    {item.universityName}
                    {item.program ? ` · ${item.program}` : ""}
                  </div>
                  <div className="mt-[2px] text-[11px] text-[#a0a0a0]">
                    {formatDeadlineLabel(item.daysUntil)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
