"use client";

import { Pagination } from "@/components/pagination";
import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import { format } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

import type { AdminSchoolSessionKind } from "../_lib/parse-admin-school-detail-search-params";
import type { AdminSchoolAdvisorSessionsPanelProps } from "../_lib/fetch-admin-school-advisor-sessions-page";
import { ADVISOR_SESSION_STATUS_OPTIONS } from "../_lib/fetch-admin-school-advisor-sessions-page";
import type { AdvisorSessionStatusFilter } from "@/app/(protected)/admin/users/advisors/[id]/_lib/fetch-advisor-sessions-page";
import type { AdminSchoolAmbassadorSessionsPanelProps } from "../_lib/fetch-admin-school-ambassador-sessions-page";
import { AMBASSADOR_SESSION_STATUS_OPTIONS } from "../_lib/fetch-admin-school-ambassador-sessions-page";
import type { AmbassadorSessionStatusFilter } from "@/app/(protected)/admin/users/ambassadors/[id]/_lib/fetch-ambassador-sessions-page";

const SESSIONS_LIMIT_OPTIONS = [10, 20, 50] as const;

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return "—";
  }
}

function formatStatus(status: string | null): string {
  if (!status) return "—";
  return status.replace(/_/g, " ");
}

export type AdminSchoolSessionsTabProps = {
  sessionKind: AdminSchoolSessionKind;
  advisorPanel: AdminSchoolAdvisorSessionsPanelProps;
  ambassadorPanel: AdminSchoolAmbassadorSessionsPanelProps;
};

export function AdminSchoolSessionsTab({
  sessionKind,
  advisorPanel,
  ambassadorPanel,
}: AdminSchoolSessionsTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const switchKind = useCallback(
    (nextKind: AdminSchoolSessionKind) => {
      if (nextKind === sessionKind) return;
      startTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        next.set("tab", "sessions");
        next.set("sessionKind", nextKind);
        next.set("sessionsPage", "1");
        next.delete("sessionStatus");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams, sessionKind],
  );

  const switchAdvisorStatus = useCallback(
    (nextStatus: AdvisorSessionStatusFilter) => {
      if (nextStatus === advisorPanel.status) return;
      startTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        next.set("tab", "sessions");
        next.set("sessionKind", "advisor");
        if (nextStatus === "all") next.delete("sessionStatus");
        else next.set("sessionStatus", nextStatus);
        next.set("sessionsPage", "1");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [advisorPanel.status, pathname, router, searchParams],
  );

  const switchAmbassadorStatus = useCallback(
    (nextStatus: AmbassadorSessionStatusFilter) => {
      if (nextStatus === ambassadorPanel.status) return;
      startTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        next.set("tab", "sessions");
        next.set("sessionKind", "ambassador");
        if (nextStatus === "all") next.delete("sessionStatus");
        else next.set("sessionStatus", nextStatus);
        next.set("sessionsPage", "1");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [ambassadorPanel.status, pathname, router, searchParams],
  );

  return (
    <SchoolStudentPanel
      head="Sessions"
      sub="Advisor and ambassador sessions for this school's students"
    >
      <div className={isPending ? "opacity-75" : ""} aria-busy={isPending}>
        <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--border-light)]">
          {(
            [
              { id: "advisor" as const, label: "Advisor" },
              { id: "ambassador" as const, label: "Ambassador" },
            ] as const
          ).map((option) => {
            const active = option.id === sessionKind;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => switchKind(option.id)}
                className={
                  active
                    ? "-mb-px border-b-2 border-[var(--green)] px-3 py-2 text-[13px] font-semibold text-[var(--green-dark)]"
                    : "px-3 py-2 text-[13px] font-medium text-[var(--text-mid)] hover:text-[var(--text)]"
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {sessionKind === "advisor" ? (
          <>
            <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--border-light)]">
              {ADVISOR_SESSION_STATUS_OPTIONS.map((option) => {
                const active = option.value === advisorPanel.status;
                const count = advisorPanel.statusCounts[option.value];
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => switchAdvisorStatus(option.value)}
                    className={
                      active
                        ? "-mb-px border-b-2 border-[var(--green)] px-3 py-2 text-[13px] font-semibold text-[var(--green-dark)]"
                        : "px-3 py-2 text-[13px] font-medium text-[var(--text-mid)] hover:text-[var(--text)]"
                    }
                  >
                    {option.label}
                    <span className="ml-1.5 text-[11px] font-normal text-[var(--text-hint)]">
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
              <table className="w-full min-w-[920px] border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                    <th className="px-4 py-3">Booked at</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Advisor</th>
                    <th className="px-4 py-3">Destination</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Help with</th>
                  </tr>
                </thead>
                <tbody>
                  {advisorPanel.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-[var(--text-light)]">
                        No advisor sessions found for this filter.
                      </td>
                    </tr>
                  ) : (
                    advisorPanel.rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-[var(--border-light)] hover:bg-[#faf9f4]"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--text)]">
                          {formatWhen(row.bookedAt)}
                        </td>
                        <td className="px-4 py-3 text-[var(--text)]">
                          <div>{row.studentName}</div>
                          {row.studentEmail ? (
                            <div className="mt-0.5 text-[11px] text-[var(--text-hint)]">
                              {row.studentEmail}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-mid)]">{row.advisorName}</td>
                        <td className="px-4 py-3 text-[var(--text-mid)]">{row.destination}</td>
                        <td className="px-4 py-3 capitalize text-[var(--text-mid)]">
                          {formatStatus(row.status)}
                        </td>
                        <td className="max-w-[240px] px-4 py-3 text-[var(--text-mid)]">
                          {row.helpWith ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              className="mt-4"
              totalRows={advisorPanel.totalRows}
              page={advisorPanel.page}
              limit={advisorPanel.limit}
              limitOptions={SESSIONS_LIMIT_OPTIONS}
              pageParam="sessionsPage"
              limitParam="sessionsLimit"
            />
          </>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--border-light)]">
              {AMBASSADOR_SESSION_STATUS_OPTIONS.map((option) => {
                const active = option.value === ambassadorPanel.status;
                const count = ambassadorPanel.statusCounts[option.value];
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => switchAmbassadorStatus(option.value)}
                    className={
                      active
                        ? "-mb-px border-b-2 border-[var(--green)] px-3 py-2 text-[13px] font-semibold text-[var(--green-dark)]"
                        : "px-3 py-2 text-[13px] font-medium text-[var(--text-mid)] hover:text-[var(--text)]"
                    }
                  >
                    {option.label}
                    <span className="ml-1.5 text-[11px] font-normal text-[var(--text-hint)]">
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
              <table className="w-full min-w-[920px] border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                    <th className="px-4 py-3">Requested</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Ambassador</th>
                    <th className="px-4 py-3">Preferred time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Discussion topics</th>
                  </tr>
                </thead>
                <tbody>
                  {ambassadorPanel.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-[var(--text-light)]">
                        No ambassador sessions found for this filter.
                      </td>
                    </tr>
                  ) : (
                    ambassadorPanel.rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-[var(--border-light)] hover:bg-[#faf9f4]"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--text)]">
                          {formatWhen(row.requestedAt)}
                        </td>
                        <td className="px-4 py-3 text-[var(--text)]">
                          <div>{row.studentName}</div>
                          {row.studentEmail ? (
                            <div className="mt-0.5 text-[11px] text-[var(--text-hint)]">
                              {row.studentEmail}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-mid)]">{row.ambassadorName}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--text-mid)]">
                          {formatWhen(row.preferredTime)}
                        </td>
                        <td className="px-4 py-3 capitalize text-[var(--text-mid)]">
                          {formatStatus(row.status)}
                        </td>
                        <td className="max-w-[240px] px-4 py-3 text-[var(--text-mid)]">
                          {row.discussionTopics ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              className="mt-4"
              totalRows={ambassadorPanel.totalRows}
              page={ambassadorPanel.page}
              limit={ambassadorPanel.limit}
              limitOptions={SESSIONS_LIMIT_OPTIONS}
              pageParam="sessionsPage"
              limitParam="sessionsLimit"
            />
          </>
        )}
      </div>
    </SchoolStudentPanel>
  );
}
