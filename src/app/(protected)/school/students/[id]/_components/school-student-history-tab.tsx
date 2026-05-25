"use client";

import { Pagination } from "@/components/pagination";
import {
  formatCreditHistoryAmount,
  formatCreditHistoryStatus,
} from "@/lib/student-credit-assignment-log";
import type {
  StudentUsageHistoryItem,
  StudentUsageHistoryKind,
  StudentUsageHistoryKindCounts,
} from "@/lib/student-usage-history";
import {
  STUDENT_USAGE_HISTORY_KINDS,
  STUDENT_USAGE_HISTORY_TAB_LABELS,
} from "@/lib/student-usage-history";
import { format } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

import { SchoolStudentPanel } from "./school-student-panel";

export type SchoolStudentHistoryPanelProps = {
  rows: StudentUsageHistoryItem[];
  totalRows: number;
  page: number;
  limit: number;
  kind: StudentUsageHistoryKind;
  kindCounts: StudentUsageHistoryKindCounts;
};

const HISTORY_LIMIT_OPTIONS = [10, 20, 50] as const;

function formatWhen(iso: string): string {
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

function creditTypeLabel(type: "advisor" | "ambassador" | null): string {
  if (type === "advisor") return "Advisor";
  if (type === "ambassador") return "Ambassador";
  return "—";
}

function HistoryTable({
  kind,
  rows,
}: {
  kind: StudentUsageHistoryKind;
  rows: StudentUsageHistoryItem[];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-light)] px-4 py-10 text-center text-[13px] text-[var(--text-light)]">
        No {STUDENT_USAGE_HISTORY_TAB_LABELS[kind].toLowerCase()} records yet.
      </div>
    );
  }

  if (kind === "advisor_session") {
    return (
      <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Advisor</th>
              <th className="px-4 py-3">Destination</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Help with</th>
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
                <td className="px-4 py-3 text-[var(--text)]">
                  {row.personName ?? "—"}
                </td>
                <td className="px-4 py-3 text-[var(--text-mid)]">
                  {row.destination ?? "—"}
                </td>
                <td className="px-4 py-3 capitalize text-[var(--text-mid)]">
                  {formatStatus(row.status)}
                </td>
                <td className="max-w-[280px] px-4 py-3 text-[var(--text-mid)]">
                  {row.detail ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (kind === "ambassador_session") {
    return (
      <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
        <table className="w-full min-w-[680px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Ambassador</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Discussion topics</th>
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
                <td className="px-4 py-3 text-[var(--text)]">
                  {row.personName ?? "—"}
                </td>
                <td className="px-4 py-3 capitalize text-[var(--text-mid)]">
                  {formatStatus(row.status)}
                </td>
                <td className="max-w-[320px] px-4 py-3 text-[var(--text-mid)]">
                  {row.detail ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (kind === "essay_review" || kind === "ai_matching") {
    return (
      <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Tokens</th>
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
                <td className="px-4 py-3 text-[var(--text)]">{row.model ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--text-mid)]">
                  {row.tokens != null ? row.tokens.toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
      <table className="w-full min-w-[640px] border-collapse text-[13px]">
        <thead>
          <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Added by</th>
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
                {row.creditAmount != null
                  ? formatCreditHistoryAmount(row.creditAmount, row.status)
                  : "—"}
              </td>
              <td className="px-4 py-3 text-[var(--text-mid)]">
                {creditTypeLabel(row.creditType)}
              </td>
              <td className="px-4 py-3 text-[var(--text-mid)]">
                {formatCreditHistoryStatus(row.status)}
              </td>
              <td className="px-4 py-3 text-[var(--text-mid)]">
                {row.addedBy ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SchoolStudentHistoryTab({
  rows,
  totalRows,
  page,
  limit,
  kind,
  kindCounts,
}: SchoolStudentHistoryPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const switchKind = useCallback(
    (nextKind: StudentUsageHistoryKind) => {
      if (nextKind === kind) return;
      startTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        next.set("historyKind", nextKind);
        next.set("historyPage", "1");
        if (!next.get("tab")) next.set("tab", "history");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [kind, pathname, router, searchParams],
  );

  return (
    <SchoolStudentPanel
      head="Usage history"
      sub="Sessions, AI tools, and credit assignments — organized by category"
    >
      <div className={isPending ? "opacity-75" : ""} aria-busy={isPending}>
        <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--border-light)]">
          {STUDENT_USAGE_HISTORY_KINDS.map((tabKind) => {
            const active = tabKind === kind;
            const count = kindCounts[tabKind];
            return (
              <button
                key={tabKind}
                type="button"
                onClick={() => switchKind(tabKind)}
                className={
                  active
                    ? "-mb-px border-b-2 border-[var(--green)] px-3 py-2 text-[13px] font-semibold text-[var(--green-dark)]"
                    : "px-3 py-2 text-[13px] font-medium text-[var(--text-mid)] hover:text-[var(--text)]"
                }
              >
                {STUDENT_USAGE_HISTORY_TAB_LABELS[tabKind]}
                <span className="ml-1.5 text-[11px] font-normal text-[var(--text-hint)]">
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        <HistoryTable kind={kind} rows={rows} />

        <Pagination
          className="mt-4"
          totalRows={totalRows}
          page={page}
          limit={limit}
          limitOptions={HISTORY_LIMIT_OPTIONS}
          pageParam="historyPage"
          limitParam="historyLimit"
        />
      </div>
    </SchoolStudentPanel>
  );
}
