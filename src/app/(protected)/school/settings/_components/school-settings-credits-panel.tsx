"use client";

import type { StudentAllocationRow } from "@/app/(protected)/school/settings/_lib/build-student-allocations";
import { isStudentCreditBalanceExhausted } from "@/lib/student-credit-limit";
import Link from "next/link";
import { useState } from "react";

export type SchoolCreditsSummary = {
  usedThisYear: number;
  defaultAmbassadorLimit: number | null;
  defaultAdvisorLimit: number | null;
  yearlyCreditPlan: number | null;
  renewalDate: string | null;
  subscriptionStatus: string;
  creditPool: number | null;
};

export type RechargeHistoryRow = {
  id: number;
  amount: number;
  kind: string;
  created_at: string | null;
};

export type StudentUsageRow = {
  id: number;
  amount: number;
  type: string;
  status: string | null;
  created_at: string | null;
  studentName: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function rechargeKindLabel(kind: string): string {
  if (kind === "YEARLY_SUB") return "Yearly plan";
  if (kind === "EXTRA") return "Extra";
  return kind;
}

function creditTypeLabel(t: string): string {
  switch (t) {
    case "advisor":
      return "Advisor";
    case "ambassador":
      return "Ambassador";
    case "base_credit":
      return "Base credit";
    case "extra_credits":
      return "Extra credits";
    default:
      return t;
  }
}

type SchoolSettingsCreditsPanelProps = {
  credits: SchoolCreditsSummary;
  rechargeHistory: RechargeHistoryRow[];
  studentUsageHistory: StudentUsageRow[];
  studentAllocations: StudentAllocationRow[];
};

export function SchoolSettingsCreditsPanel({
  credits,
  rechargeHistory,
  studentUsageHistory,
  studentAllocations,
}: SchoolSettingsCreditsPanelProps) {
  const [historyTab, setHistoryTab] = useState<
    "recharge" | "usage" | "allocations"
  >("recharge");

  const amb = credits.defaultAmbassadorLimit;
  const adv = credits.defaultAdvisorLimit;

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white">
      <div className="border-b border-[var(--border-light)] px-5 py-[18px]">
        <div className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[var(--text)]">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--green-bg)] text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </span>
          Credits
        </div>
        <p className="mt-2 max-w-[820px] text-[12px] leading-relaxed text-[var(--text-light)]">
          School credit pool for assigning extra credits to students, signup defaults (managed by
          Univeera), and renewal info. Yearly top-ups run daily on UTC.
        </p>
      </div>

      <div className="px-5 py-[18px]">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-[10px] border border-[var(--border-light)] bg-white px-[18px] py-4">
            <div className="font-[family-name:var(--font-dm-serif)] text-[30px] leading-none tracking-tight text-[var(--text)]">
              {credits.usedThisYear.toLocaleString()}
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              Used this year
            </div>
            <div className="mt-2.5 border-t border-[var(--border-light)] pt-2.5 text-[11.5px] leading-snug text-[var(--text-light)]">
              Net advisor + ambassador credits ({new Date().getUTCFullYear()} UTC).
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[10px] border border-[var(--border-light)] bg-white px-[18px] py-4">
            <div className="font-[family-name:var(--font-dm-serif)] text-xl leading-snug tracking-tight text-[var(--text)]">
              <span className="text-[var(--text-hint)]">Ambassador</span>{" "}
              {amb != null ? amb : "—"}
              <span className="mx-2 text-[var(--border)]">|</span>
              <span className="text-[var(--text-hint)]">Advisor</span>{" "}
              {adv != null ? adv : "—"}
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              Signup defaults / student
            </div>
            <div className="mt-2.5 border-t border-[var(--border-light)] pt-2.5 text-[11.5px] leading-snug text-[var(--text-light)]">
              Granted at signup (not deducted from pool). Managed by Univeera.
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[10px] border border-[var(--border-light)] bg-white px-[18px] py-4">
            <div className="font-[family-name:var(--font-dm-serif)] text-[30px] leading-none tracking-tight text-[var(--text)]">
              {credits.yearlyCreditPlan != null
                ? credits.yearlyCreditPlan.toLocaleString()
                : "—"}
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              Yearly credit plan
            </div>
            <div className="mt-2.5 border-t border-[var(--border-light)] pt-2.5 text-[11.5px] leading-snug text-[var(--text-light)]">
              Renewal {formatDate(credits.renewalDate)} · {credits.subscriptionStatus}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[10px] border border-[var(--border-light)] bg-white px-[18px] py-4">
            <div className="font-[family-name:var(--font-dm-serif)] text-[30px] leading-none tracking-tight text-[var(--text)]">
              {credits.creditPool != null ? credits.creditPool.toLocaleString() : "—"}
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              Credit pool
            </div>
            <div className="mt-2.5 border-t border-[var(--border-light)] pt-2.5 text-[11.5px] leading-snug text-[var(--text-light)]">
              Available to assign to students from the student profile page.
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex gap-1 border-b border-[var(--border-light)]">
            <button
              type="button"
              className={
                historyTab === "recharge"
                  ? "-mb-px border-b-2 border-[var(--green)] px-3 py-2 text-[13px] font-semibold text-[var(--green-dark)]"
                  : "px-3 py-2 text-[13px] font-medium text-[var(--text-mid)] hover:text-[var(--text)]"
              }
              onClick={() => setHistoryTab("recharge")}
            >
              Recharge history
            </button>
            <button
              type="button"
              className={
                historyTab === "usage"
                  ? "-mb-px border-b-2 border-[var(--green)] px-3 py-2 text-[13px] font-semibold text-[var(--green-dark)]"
                  : "px-3 py-2 text-[13px] font-medium text-[var(--text-mid)] hover:text-[var(--text)]"
              }
              onClick={() => setHistoryTab("usage")}
            >
              Student usage
            </button>
            <button
              type="button"
              className={
                historyTab === "allocations"
                  ? "-mb-px border-b-2 border-[var(--green)] px-3 py-2 text-[13px] font-semibold text-[var(--green-dark)]"
                  : "px-3 py-2 text-[13px] font-medium text-[var(--text-mid)] hover:text-[var(--text)]"
              }
              onClick={() => setHistoryTab("allocations")}
            >
              Student balances
            </button>
          </div>

          {historyTab === "recharge" ? (
            <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
              <table className="w-full min-w-[520px] border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Kind</th>
                  </tr>
                </thead>
                <tbody>
                  {rechargeHistory.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-[var(--text-light)]">
                        No recharge events yet.
                      </td>
                    </tr>
                  ) : (
                    rechargeHistory.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-[var(--border-light)] hover:bg-[#faf9f4]"
                      >
                        <td className="px-4 py-3 text-[var(--text)]">
                          {formatDate(row.created_at)}
                        </td>
                        <td className="px-4 py-3 font-medium text-[var(--text)]">
                          {row.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-mid)]">
                          {rechargeKindLabel(row.kind)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : historyTab === "usage" ? (
            <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
              <table className="w-full min-w-[640px] border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {studentUsageHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-light)]">
                        No usage rows yet.
                      </td>
                    </tr>
                  ) : (
                    studentUsageHistory.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-[var(--border-light)] hover:bg-[#faf9f4]"
                      >
                        <td className="px-4 py-3 text-[var(--text)]">
                          {formatDate(row.created_at)}
                        </td>
                        <td className="px-4 py-3 text-[var(--text)]">{row.studentName}</td>
                        <td className="px-4 py-3 font-medium text-[var(--text)]">
                          {row.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-mid)]">
                          {creditTypeLabel(row.type)}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-mid)]">
                          {row.status ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
              <table className="w-full min-w-[520px] border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Advisor remaining</th>
                    <th className="px-4 py-3">Ambassador remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {studentAllocations.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-[var(--text-light)]">
                        No students yet.
                      </td>
                    </tr>
                  ) : (
                    studentAllocations.map((row) => {
                      const advisorExhausted = isStudentCreditBalanceExhausted(
                        row.advisorRemaining,
                      );
                      const ambassadorExhausted = isStudentCreditBalanceExhausted(
                        row.ambassadorRemaining,
                      );
                      return (
                        <tr
                          key={row.studentId}
                          className="border-t border-[var(--border-light)] hover:bg-[#faf9f4]"
                        >
                          <td className="px-4 py-3 text-[var(--text)]">
                            <Link
                              href={`/school/students/${row.studentId}`}
                              className="font-medium text-[var(--green-dark)] hover:underline"
                            >
                              {row.studentName}
                            </Link>
                          </td>
                          <td
                            className={`px-4 py-3 font-medium ${
                              advisorExhausted
                                ? "text-[#B8860B]"
                                : "text-[var(--text)]"
                            }`}
                          >
                            {row.advisorRemaining != null
                              ? row.advisorRemaining.toLocaleString()
                              : "—"}
                          </td>
                          <td
                            className={`px-4 py-3 font-medium ${
                              ambassadorExhausted
                                ? "text-[#B8860B]"
                                : "text-[var(--text)]"
                            }`}
                          >
                            {row.ambassadorRemaining != null
                              ? row.ambassadorRemaining.toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
