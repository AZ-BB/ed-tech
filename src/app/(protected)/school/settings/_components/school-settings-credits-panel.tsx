"use client";

import { updateSchoolDefaultCreditLimitsAction } from "@/actions/school-credits";
import type { GeneralResponse } from "@/utils/response";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

export type SchoolCreditsSummary = {
  usedThisYear: number;
  defaultAmbassadorLimit: number | null;
  defaultAdvisorLimit: number | null;
  yearlyCreditPlan: number | null;
  renewalDate: string | null;
  subscriptionStatus: string;
  creditPool: number | null;
  extraCredits: number | null;
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

function fieldClass() {
  return [
    "w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5",
    "font-[family-name:var(--font-dm-sans)] text-[13px] text-[var(--text)] outline-none",
    "transition-colors focus:border-[var(--green-light)]",
  ].join(" ");
}

function labelClass() {
  return "mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--text-mid)]";
}

function btnSecondaryClass() {
  return [
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-[var(--border)]",
    "bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--text-mid)] transition-all",
    "hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]",
    "disabled:cursor-not-allowed disabled:opacity-55",
  ].join(" ");
}

function btnPrimaryClass() {
  return [
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-[var(--green)]",
    "bg-[var(--green)] px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-all",
    "hover:border-[var(--green-dark)] hover:bg-[var(--green-dark)]",
    "disabled:cursor-not-allowed disabled:opacity-55",
  ].join(" ");
}

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
  onShowToast: (msg: string) => void;
};

export function SchoolSettingsCreditsPanel({
  credits,
  rechargeHistory,
  studentUsageHistory,
  onShowToast,
}: SchoolSettingsCreditsPanelProps) {
  const router = useRouter();
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<"recharge" | "usage">("recharge");

  const [limitsState, limitsAction, limitsPending] = useActionState(
    updateSchoolDefaultCreditLimitsAction,
    null as GeneralResponse<null> | null,
  );
  const limitsPrevPending = useRef(false);

  useEffect(() => {
    const done = limitsPrevPending.current && !limitsPending;
    if (done && limitsState && limitsState.error === null) {
      onShowToast("Default credit limits saved.");
      setLimitsOpen(false);
      router.refresh();
    }
    limitsPrevPending.current = limitsPending;
  }, [limitsPending, limitsState, onShowToast, router]);

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
          Per-student session limits, school pool balances, and renewal info (subscription managed
          by Univeera). Yearly top-ups run daily on UTC; main pool resets on each renewal date.
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
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-[family-name:var(--font-dm-serif)] text-2xl leading-none tracking-tight text-[var(--text)]">
                  <span className="text-[var(--text-hint)]">Am</span>{" "}
                  {amb != null ? amb : "—"}
                  <span className="mx-2 text-[var(--border)]">|</span>
                  <span className="text-[var(--text-hint)]">Ad</span>{" "}
                  {adv != null ? adv : "—"}
                </div>
                <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Default limits / student
                </div>
              </div>
              <button
                type="button"
                className={`${btnSecondaryClass()} shrink-0 !px-2.5 !py-1 text-[11.5px]`}
                onClick={() => setLimitsOpen(true)}
              >
                Edit
              </button>
            </div>
            <div className="mt-2.5 border-t border-[var(--border-light)] pt-2.5 text-[11.5px] leading-snug text-[var(--text-light)]">
              Ambassador vs advisor credits when student has no override.
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
            <div className="font-[family-name:var(--font-dm-serif)] text-2xl leading-none tracking-tight text-[var(--text)]">
              <span title="Main pool (credit_pool)">
                {credits.creditPool != null ? credits.creditPool.toLocaleString() : "—"}
              </span>
              <span className="font-[family-name:var(--font-dm-sans)] text-base font-normal text-[var(--text-light)]">
                {" "}
                /{" "}
              </span>
              <span title="Extra credits pool">
                {credits.extraCredits != null ? credits.extraCredits.toLocaleString() : "—"}
              </span>
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              Main pool / Extra
            </div>
            <div className="mt-2.5 border-t border-[var(--border-light)] pt-2.5 text-[11.5px] leading-snug text-[var(--text-light)]">
              Main resets on yearly renewal; extra is separate.
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
          ) : (
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
          )}
        </div>
      </div>

      {limitsOpen ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(15,30,20,.5)] p-5"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !limitsPending) setLimitsOpen(false);
          }}
        >
          <div
            className="w-full max-w-[480px] overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[0_12px_32px_rgba(15,30,20,.08)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="limits-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-light)] px-[22px] py-[18px]">
              <h2
                id="limits-modal-title"
                className="font-[family-name:var(--font-dm-serif)] text-xl tracking-tight text-[var(--text)]"
              >
                Default credits per student
              </h2>
              <button
                type="button"
                className="flex cursor-pointer rounded-md p-1.5 text-[var(--text-light)] hover:bg-[#faf9f4] hover:text-[var(--text)]"
                aria-label="Close"
                onClick={() => !limitsPending && setLimitsOpen(false)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form action={limitsAction}>
              <div className="flex flex-col gap-3.5 px-[22px] py-[18px]">
                <div>
                  <label className={labelClass()} htmlFor="lim-amb">
                    Ambassador credit limit (default)
                  </label>
                  <input
                    id="lim-amb"
                    name="default_ambassador_credit_limit"
                    className={fieldClass()}
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={amb ?? ""}
                    placeholder="Empty = none"
                  />
                </div>
                <div>
                  <label className={labelClass()} htmlFor="lim-adv">
                    Advisor credit limit (default)
                  </label>
                  <input
                    id="lim-adv"
                    name="default_advisor_credit_limit"
                    className={fieldClass()}
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={adv ?? ""}
                    placeholder="Empty = none"
                  />
                </div>
                <p className="text-[11.5px] leading-relaxed text-[var(--text-hint)]">
                  Leave blank to clear the school default (students fall back to product rules). Use
                  whole numbers ≥ 0.
                </p>
                {limitsState?.error ? (
                  <p className="text-[12px] font-medium text-[#E74C3C]">{limitsState.error}</p>
                ) : null}
              </div>
              <div className="flex justify-end gap-2 border-t border-[var(--border-light)] bg-[#faf9f4] px-[22px] py-3.5">
                <button
                  type="button"
                  className={btnSecondaryClass()}
                  disabled={limitsPending}
                  onClick={() => setLimitsOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={btnPrimaryClass()} disabled={limitsPending}>
                  {limitsPending ? "Saving…" : "Save limits"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
