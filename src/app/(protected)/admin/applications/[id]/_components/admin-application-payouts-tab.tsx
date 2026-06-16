"use client";

import { markAdvisorPayoutsPaid } from "@/actions/admin-advisor-payouts";
import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import type { ApplicationPayoutRow } from "@/lib/advisor-payouts/types";
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

export type AdminApplicationPayoutsTabProps = {
  applicationId: number;
  payouts: ApplicationPayoutRow[];
};

export function AdminApplicationPayoutsTab({
  applicationId,
  payouts,
}: AdminApplicationPayoutsTabProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pendingPayouts = useMemo(
    () => payouts.filter((payout) => payout.status === "pending"),
    [payouts],
  );

  const allPendingSelected =
    pendingPayouts.length > 0 &&
    pendingPayouts.every((payout) => selectedIds.has(payout.id));

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
    setSelectedIds(new Set(pendingPayouts.map((payout) => payout.id)));
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
    <SchoolStudentPanel
      head="Payouts"
      sub={`Advisor commission payouts for application #${applicationId}`}
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

      {payouts.length === 0 ? (
        <p className="text-[13px] text-[var(--text-light)]">
          No advisor payouts for this application yet. Payouts are created when students pay
          advisor-issued payment requests.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allPendingSelected}
                    disabled={pendingPayouts.length === 0 || isPending}
                    onChange={toggleAllPending}
                    className="h-4 w-4 accent-[#2D6A4F]"
                    aria-label="Select all pending payouts"
                  />
                </th>
                <th className="px-4 py-3">Advisor</th>
                <th className="px-4 py-3">Payment (AED)</th>
                <th className="px-4 py-3">Payout %</th>
                <th className="px-4 py-3">Payout (AED)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Paid at</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => {
                const isPendingPayout = payout.status === "pending";
                return (
                  <tr
                    key={payout.id}
                    className="border-t border-[var(--border-light)] hover:bg-[#faf9f4]"
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(payout.id)}
                        disabled={!isPendingPayout || isPending}
                        onChange={() => toggleOne(payout.id)}
                        className="h-4 w-4 accent-[#2D6A4F]"
                        aria-label={`Select payout #${payout.id}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--text)]">
                      {payout.advisorName}
                    </td>
                    <td className="px-4 py-3">{payout.paymentAmount.toLocaleString()}</td>
                    <td className="px-4 py-3">{payout.percentage}%</td>
                    <td className="px-4 py-3 font-medium">{payout.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${payoutStatusClass(payout.status)}`}
                      >
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-mid)]">
                      {formatDateTime(payout.paidAt ?? payout.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SchoolStudentPanel>
  );
}
