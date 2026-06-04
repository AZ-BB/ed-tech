"use client";

import { Pagination } from "@/components/pagination";
import type { StudentCreditUsagePanelProps } from "@/lib/student-credit-usage";
import { format } from "date-fns";

import { SchoolStudentPanel } from "./school-student-panel";

const USAGE_LIMIT_OPTIONS = [10, 20, 50] as const;

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return "—";
  }
}

function statusPillClass(status: string | null): string {
  switch (status) {
    case "added":
      return "bg-[#e8f5ee] text-[#2D6A4F]";
    case "refunded":
      return "bg-[#E3F2FD] text-[#3498DB]";
    case "used":
      return "bg-[#FFF3E0] text-[#E67E22]";
    default:
      return "bg-[#f0f0f0] text-[#6a6a6a]";
  }
}

export function SchoolStudentCreditUsageTab({
  rows,
  totalRows,
  page,
  limit,
}: StudentCreditUsagePanelProps) {
  return (
    <SchoolStudentPanel
      head="Credit usage"
      sub="Full ledger of credits added, used, and refunded for this student"
    >
      <div>
        {rows.length === 0 ? (
          <div className="rounded-lg border border-[var(--border-light)] px-4 py-10 text-center text-[13px] text-[var(--text-light)]">
            No credit history recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
            <table className="w-full min-w-[760px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">By</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[var(--border-light)] hover:bg-[#faf9f4]"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text)]">
                      {formatWhen(row.at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--text)]">
                      {row.amountDisplay}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-mid)]">
                      {row.creditTypeLabel}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusPillClass(row.status)}`}
                      >
                        {row.statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-mid)]">
                      {row.reference ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-mid)]">
                      {row.actorName ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          className="mt-4"
          totalRows={totalRows}
          page={page}
          limit={limit}
          limitOptions={USAGE_LIMIT_OPTIONS}
          pageParam="usagePage"
          limitParam="usageLimit"
        />
      </div>
    </SchoolStudentPanel>
  );
}
