"use client";

import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import type {
  ApplicationPayoutRow,
  ApplicationPayoutSummary,
} from "@/lib/advisor-payouts/types";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
        {label}
      </div>
      <div className="mt-1 text-[13px] font-medium text-[var(--text)]">{value}</div>
    </div>
  );
}

function PayoutPercentageCard({ percentage }: { percentage: number }) {
  const clamped = Math.min(100, Math.max(0, percentage));

  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--border-light)] bg-white">
      <div className="px-3.5 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
          Payout percentage
        </div>
        <div className="mt-1 text-[13px] font-medium text-[var(--text)]">{percentage}%</div>
      </div>
      <div
        className="h-1.5 bg-[var(--border-light)]"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Payout percentage: ${percentage}%`}
      >
        <div
          className="h-full bg-[var(--green)] transition-[width]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export type AdvisorApplicationPayoutsTabProps = {
  applicationId: number;
  payouts: ApplicationPayoutRow[];
  payoutSummary: ApplicationPayoutSummary;
};

export function AdvisorApplicationPayoutsTab({
  applicationId,
  payouts,
  payoutSummary,
}: AdvisorApplicationPayoutsTabProps) {
  return (
    <SchoolStudentPanel
      head="Payouts"
      sub={`Your commission payouts for application #${applicationId}`}
    >
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PayoutPercentageCard percentage={payoutSummary.payoutPercentage} />
        <SummaryCard
          label="Total pending"
          value={`${payoutSummary.pendingAmount.toLocaleString()} AED / ${payoutSummary.pendingCount} payout${payoutSummary.pendingCount === 1 ? "" : "s"}`}
        />
        <SummaryCard
          label="Total paid"
          value={`${payoutSummary.paidAmount.toLocaleString()} AED / ${payoutSummary.paidCount} payout${payoutSummary.paidCount === 1 ? "" : "s"}`}
        />
      </div>

      {payouts.length === 0 ? (
        <p className="text-[13px] text-[var(--text-light)]">
          No payouts for this application yet. Payouts are created when students pay
          payment requests you sent.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                <th className="px-4 py-3">Payment (AED)</th>
                <th className="px-4 py-3">Payout %</th>
                <th className="px-4 py-3">Payout (AED)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment paid</th>
                <th className="px-4 py-3">Payout paid</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr
                  key={payout.id}
                  className="border-t border-[var(--border-light)] hover:bg-[#faf9f4]"
                >
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
                    {formatDate(payout.paymentPaidAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--text-mid)]">
                    {formatDate(payout.status === "paid" ? payout.paidAt : null)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SchoolStudentPanel>
  );
}
