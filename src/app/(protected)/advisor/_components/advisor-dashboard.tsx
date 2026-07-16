import Link from "next/link";

import type { AdvisorDashboardPayload } from "../_lib/parse-advisor-dashboard";
import type { AdvisorSessionsAndCallsRow } from "../sessions-and-calls/_lib/advisor-sessions-and-calls-shared";

import { AdvisorDashboardCallsCalendar } from "./advisor-dashboard-calls-calendar";
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
  monthSessionsAndCalls: AdvisorSessionsAndCallsRow[];
  calendarYear: number;
  calendarMonthIndex: number;
  welcome: AdvisorDashboardWelcome;
};

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

export function AdvisorDashboard({
  data,
  monthSessionsAndCalls,
  calendarYear,
  calendarMonthIndex,
  welcome,
}: Props) {
  const { kpis, awaitingPayment, upcomingDeadlines } = data;

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

      <AdvisorDashboardCallsCalendar
        initialMonthRows={monthSessionsAndCalls}
        initialYear={calendarYear}
        initialMonthIndex={calendarMonthIndex}
      />

      <div className="grid grid-cols-1 gap-[18px] min-[900px]:grid-cols-2">
        <div className="rounded-[14px] border border-[#ece9e4] bg-white p-[20px_22px]">
          <div className="mb-[14px] flex items-center justify-between">
            <div className="text-[14px] font-bold text-[#1a1a1a]">Payments issued</div>
            <Link href="/advisor/payments" className={btnGhostClassName}>
              View all →
            </Link>
          </div>
          {awaitingPayment.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#6a6a6a]">
              No pending payment requests
            </div>
          ) : (
            awaitingPayment.map((item) => (
              <Link
                key={item.applicationId}
                href={`/advisor/applications/${item.applicationId}`}
                className="flex gap-[11px] border-b border-[#ece9e4] py-[10px] last:border-b-0 transition-colors hover:bg-[#faf9f4]"
              >
                <div className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full bg-[#2563eb]" />
                <div>
                  <div className="text-[12.5px] font-semibold leading-[1.45] text-[#1a1a1a]">
                    {item.studentName}
                  </div>
                  <div className="mt-[2px] text-[11px] text-[#a0a0a0]">
                    {formatSentAgo(item.sentAt)} · {formatAmountAed(item.amount)}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="rounded-[14px] border border-[#ece9e4] bg-white p-[20px_22px]">
          <div className="mb-[14px] text-[14px] font-bold text-[#1a1a1a]">
            Upcoming university deadlines
          </div>
          {upcomingDeadlines.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#6a6a6a]">
              No upcoming deadlines
            </div>
          ) : (
            upcomingDeadlines.map((item) => {
              const rowKey = `${item.studentId}-${item.universityName}-${item.deadline}`;
              const href =
                item.applicationId != null
                  ? `/advisor/applications/${item.applicationId}`
                  : "/advisor/applications";

              return (
                <Link
                  key={rowKey}
                  href={href}
                  className="flex gap-[11px] border-b border-[#ece9e4] py-[10px] last:border-b-0 transition-colors hover:bg-[#faf9f4]"
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
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
