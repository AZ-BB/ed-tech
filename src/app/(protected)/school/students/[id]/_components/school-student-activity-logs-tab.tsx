"use client";

import { Pagination } from "@/components/pagination";
import {
  formatActivityLogAction,
  formatActivityLogActorType,
  formatActivityLogEntityType,
  type StudentActivityLogsPanelProps,
} from "@/lib/student-activity-logs";
import { format } from "date-fns";

import { SchoolStudentPanel } from "./school-student-panel";

const ACTIVITY_LOGS_LIMIT_OPTIONS = [10, 20, 50] as const;

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return "—";
  }
}

export function SchoolStudentActivityLogsTab({
  rows,
  totalRows,
  page,
  limit,
  head = "Activity logs",
  sub = "Platform events and actions recorded for this student",
}: StudentActivityLogsPanelProps & {
  head?: string;
  sub?: string;
}) {
  return (
    <SchoolStudentPanel head={head} sub={sub}>
      <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
        <table className="w-full min-w-[860px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Actor</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-[var(--text-light)]"
                >
                  No activity logs recorded yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-[var(--border-light)] hover:bg-[#faf9f4]"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--text)]">
                    {formatWhen(row.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-[var(--text)]">
                    {formatActivityLogAction(row.action)}
                  </td>
                  <td className="max-w-[360px] px-4 py-3 leading-snug text-[var(--text-mid)]">
                    {row.message}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-mid)]">
                    <div>{formatActivityLogEntityType(row.entityType)}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--text-hint)]">
                      {row.entityId}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-mid)]">
                    <div>{row.actorName ?? "—"}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--text-hint)]">
                      {formatActivityLogActorType(row.createdByType)}
                    </div>
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
        limitOptions={ACTIVITY_LOGS_LIMIT_OPTIONS}
        pageParam="activityLogsPage"
        limitParam="activityLogsLimit"
      />
    </SchoolStudentPanel>
  );
}
