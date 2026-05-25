"use client";

import { Pagination } from "@/components/pagination";
import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import { format } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

import {
  AMBASSADOR_SESSION_STATUS_OPTIONS,
  type AdminAmbassadorSessionsPanelProps,
  type AmbassadorSessionStatusFilter,
} from "../_lib/fetch-ambassador-sessions-page";

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

export function AdminAmbassadorSessionsTab({
  rows,
  totalRows,
  page,
  limit,
  status,
  statusCounts,
}: AdminAmbassadorSessionsPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const switchStatus = useCallback(
    (nextStatus: AmbassadorSessionStatusFilter) => {
      if (nextStatus === status) return;
      startTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        if (nextStatus === "all") {
          next.delete("sessionStatus");
        } else {
          next.set("sessionStatus", nextStatus);
        }
        next.set("sessionsPage", "1");
        if (!next.get("tab")) next.set("tab", "sessions");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams, status],
  );

  return (
    <SchoolStudentPanel
      head="Session requests"
      sub="All ambassador session requests — filter by status"
    >
      <div className={isPending ? "opacity-75" : ""} aria-busy={isPending}>
        <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--border-light)]">
          {AMBASSADOR_SESSION_STATUS_OPTIONS.map((option) => {
            const active = option.value === status;
            const count = statusCounts[option.value];
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => switchStatus(option.value)}
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
          <table className="w-full min-w-[880px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Preferred time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Discussion topics</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-[var(--text-light)]"
                  >
                    No session requests found for this filter.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[var(--border-light)] hover:bg-[#faf9f4]"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text)]">
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
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-mid)]">
                      {formatWhen(row.preferredTime)}
                    </td>
                    <td className="px-4 py-3 capitalize text-[var(--text-mid)]">
                      {formatStatus(row.status)}
                    </td>
                    <td className="max-w-[280px] px-4 py-3 text-[var(--text-mid)]">
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
          totalRows={totalRows}
          page={page}
          limit={limit}
          limitOptions={SESSIONS_LIMIT_OPTIONS}
          pageParam="sessionsPage"
          limitParam="sessionsLimit"
        />
      </div>
    </SchoolStudentPanel>
  );
}
