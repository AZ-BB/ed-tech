"use client";

import { markAdvisorPayoutsPaid } from "@/actions/admin-advisor-payouts";
import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import { Pagination } from "@/components/pagination";
import type { AdvisorPayoutTableRow, AdvisorPayoutsSummary } from "@/lib/advisor-payouts/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function payoutStatusClass(status: string): string {
  if (status === "paid") return "bg-[#e8f5ee] text-[#2D6A4F]";
  if (status === "canceled") return "bg-[#FCEBEB] text-[#E74C3C]";
  return "bg-[#FFF3E0] text-[#E67E22]";
}

function SnapItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
        {label}
      </div>
      <div className="mt-1 text-[13px] font-medium text-[var(--text)]">{value}</div>
    </div>
  );
}

export type AdminAdvisorPayoutsTabProps = {
  advisorId: string;
  rows: AdvisorPayoutTableRow[];
  summary: AdvisorPayoutsSummary;
  total: number;
  page: number;
  pageSize: number;
};

export function AdminAdvisorPayoutsTab({
  advisorId,
  rows,
  summary,
  total,
  page,
  pageSize,
}: AdminAdvisorPayoutsTabProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pendingRows = useMemo(
    () => rows.filter((row) => row.status === "pending"),
    [rows],
  );

  const allPendingSelected =
    pendingRows.length > 0 && pendingRows.every((row) => selectedIds.has(row.id));

  function toggleOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllPending() {
    if (allPendingSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(pendingRows.map((row) => row.id)));
  }

  function handleMarkPaid() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await markAdvisorPayoutsPaid(ids);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        `Marked ${result.updated} payout${result.updated === 1 ? "" : "s"} as paid.`,
      );
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SnapItem
          label="Total paid to advisor"
          value={`${summary.totalPaidToAdvisor.toLocaleString()} AED (${summary.paidCount} payouts)`}
        />
        <SnapItem
          label="Total pending"
          value={`${summary.totalPending.toLocaleString()} AED (${summary.pendingCount} payouts)`}
        />
        <SnapItem
          label="Total revenue to app"
          value={`${summary.totalRevenueToApp.toLocaleString()} AED`}
        />
      </div>

      <SchoolStudentPanel
        head="All payouts"
        sub={`Commission payouts for advisor ${advisorId.slice(0, 8)}…`}
        actions={
          <button
            type="button"
            disabled={isPending || selectedIds.size === 0}
            onClick={handleMarkPaid}
            className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Mark selected as paid
          </button>
        }
      >
        {message ? (
          <p className="mb-3 text-[12px] font-medium text-[var(--green-dark)]">{message}</p>
        ) : null}
        {error ? (
          <p className="mb-3 text-[12px] font-medium text-[#c0392b]">{error}</p>
        ) : null}

        {rows.length === 0 ? (
          <p className="text-[13px] text-[var(--text-light)]">No payouts yet for this advisor.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
            <table className="w-full min-w-[860px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allPendingSelected}
                      disabled={pendingRows.length === 0 || isPending}
                      onChange={toggleAllPending}
                      className="h-4 w-4 accent-[#2D6A4F]"
                      aria-label="Select all pending payouts on page"
                    />
                  </th>
                  <th className="px-4 py-3">Application</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Payment (AED)</th>
                  <th className="px-4 py-3">Payout %</th>
                  <th className="px-4 py-3">Payout (AED)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Paid at</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isPendingRow = row.status === "pending";
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-[var(--border-light)] hover:bg-[#faf9f4]"
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          disabled={!isPendingRow || isPending}
                          onChange={() => toggleOne(row.id)}
                          className="h-4 w-4 accent-[#2D6A4F]"
                          aria-label={`Select payout #${row.id}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/applications/${row.applicationId}?tab=payouts`}
                          className="font-medium text-[var(--green-dark)] hover:underline"
                        >
                          #{row.applicationId}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-mid)]">
                        {row.studentName ?? "—"}
                      </td>
                      <td className="px-4 py-3">{row.paymentAmount.toLocaleString()}</td>
                      <td className="px-4 py-3">{row.percentage}%</td>
                      <td className="px-4 py-3 font-medium">{row.amount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${payoutStatusClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--text-mid)]">
                        {formatDateTime(row.paidAt ?? row.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 ? (
          <Pagination
            className="mt-4"
            totalRows={total}
            page={page}
            limit={pageSize}
            limitOptions={[20]}
            pageParam="payoutsPage"
            limitParam="payoutsLimit"
          />
        ) : null}
      </SchoolStudentPanel>
    </div>
  );
}
