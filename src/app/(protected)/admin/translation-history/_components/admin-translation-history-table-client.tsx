"use client";

import { Pagination } from "@/components/pagination";
import { format } from "date-fns";
import { usePathname } from "next/navigation";
import { Fragment, useState } from "react";

import type { AdminTranslationHistoryGroup } from "../_lib/fetch-admin-translation-history-page";

const LIMIT_OPTIONS = [10, 20, 30, 50] as const;

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return "—";
  }
}

function shortId(id: string | null): string {
  if (!id) return "—";
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function formatTokens(n: number): string {
  return n.toLocaleString();
}

function formatUsd(tokens: number, usdPerMillion: number): string {
  const usd = (tokens / 1_000_000) * usdPerMillion;
  return `$${usd.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}`;
}

const INPUT_USD_PER_1M = 0.2;
const OUTPUT_USD_PER_1M = 1.2;

function statusSummary(group: AdminTranslationHistoryGroup): string {
  if (group.errorCount === 0) return `${group.okCount} ok`;
  if (group.okCount === 0) return `${group.errorCount} failed`;
  return `${group.okCount} ok · ${group.errorCount} failed`;
}

export type AdminTranslationHistoryTableClientProps = {
  groups: AdminTranslationHistoryGroup[];
  totalGroups: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  page: number;
  limit: number;
  q: string;
};

export function AdminTranslationHistoryTableClient({
  groups,
  totalGroups,
  totalInputTokens,
  totalOutputTokens,
  page,
  limit,
  q,
}: AdminTranslationHistoryTableClientProps) {
  const pathname = usePathname() ?? "";
  const filtersActive = q.trim().length > 0;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  function toggleExpanded(groupKey: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white px-5 py-[18px]">
          <div className="absolute left-0 right-0 top-0 h-[3px] bg-[#3498DB]" />
          <div
            className="mb-0.5 text-[26px] leading-none text-[#3498DB]"
            style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
          >
            {formatTokens(totalInputTokens)}
          </div>
          <div className="text-[11px] font-medium text-[#6a6a6a]">Total input tokens</div>
          <div className="mt-2 text-[13px] font-semibold text-[#1a1a1a]">
            {formatUsd(totalInputTokens, INPUT_USD_PER_1M)}
          </div>
          <div className="text-[10px] text-[#a0a0a0]">$0.20 / 1M tokens</div>
        </div>
        <div className="relative overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white px-5 py-[18px]">
          <div className="absolute left-0 right-0 top-0 h-[3px] bg-[#E67E22]" />
          <div
            className="mb-0.5 text-[26px] leading-none text-[#E67E22]"
            style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
          >
            {formatTokens(totalOutputTokens)}
          </div>
          <div className="text-[11px] font-medium text-[#6a6a6a]">Total output tokens</div>
          <div className="mt-2 text-[13px] font-semibold text-[#1a1a1a]">
            {formatUsd(totalOutputTokens, OUTPUT_USD_PER_1M)}
          </div>
          <div className="text-[10px] text-[#a0a0a0]">$1.20 / 1M tokens</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-[14px] font-bold text-[#1a1a1a]">Translation History</h2>
          <span className="text-[11px] text-[#a0a0a0]">
            {totalGroups.toLocaleString()} {totalGroups === 1 ? "request" : "requests"}
          </span>
        </div>

        <form
          className="flex min-w-[220px] flex-1 flex-wrap items-center justify-end gap-2"
          action={pathname}
          method="get"
        >
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="limit" value={String(limit)} />

          <div className="relative w-full max-w-[260px]">
            <svg
              className="pointer-events-none absolute left-[10px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#a0a0a0]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <label htmlFor="admin-translation-history-search" className="sr-only">
              Search translation history
            </label>
            <input
              id="admin-translation-history-search"
              key={q}
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search request, entity, model..."
              className="w-full rounded-[8px] border border-[#e0deda] bg-white py-[7px] pl-8 pr-3 text-[12px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#a0a0a0] focus:border-[#40916C]"
            />
          </div>

          <button
            type="submit"
            className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-[7px] text-[12px] font-semibold text-[#4a4a4a] transition-all duration-150 hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
          >
            Apply
          </button>
        </form>
      </div>

      <div className="overflow-x-auto px-5 pb-1 pt-1 [zoom:0.95]">
        <table className="w-full min-w-[960px] border-collapse">
          <thead>
            <tr className="bg-[#fafaf8]">
              {[
                "",
                "Date",
                "Request",
                "Calls",
                "Tokens",
                "Model",
                "Requested by",
                "Status",
              ].map((heading) => (
                <th
                  key={heading || "expand"}
                  className="border-b border-[#ece9e4] px-4 py-[10px] text-left text-[10px] font-bold uppercase tracking-[0.8px] text-[#a0a0a0]"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-[13px] text-[#a0a0a0]"
                >
                  {filtersActive
                    ? "No translation requests found."
                    : "No translation requests recorded yet."}
                </td>
              </tr>
            ) : (
              groups.map((group, index) => {
                const isLastRow = index === groups.length - 1;
                const cellBorder = isLastRow && !expanded.has(group.groupKey)
                  ? ""
                  : "border-b border-[#ece9e4]";
                const isOpen = expanded.has(group.groupKey);

                return (
                  <Fragment key={group.groupKey}>
                    <tr className="transition-colors hover:bg-[#f0f7f2]">
                      <td className={`${cellBorder} px-2 py-3`}>
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-label={isOpen ? "Collapse request" : "Expand request"}
                          onClick={() => toggleExpanded(group.groupKey)}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] text-[#4a4a4a] transition-colors hover:bg-[#e8f5ee] hover:text-[#2D6A4F]"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`}
                            aria-hidden
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </button>
                      </td>
                      <td
                        className={`${cellBorder} px-4 py-3 whitespace-nowrap text-[13px] text-[#4a4a4a]`}
                      >
                        {formatWhen(group.startedAt)}
                      </td>
                      <td className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}>
                        <span className="font-mono text-[12px]" title={group.requestId ?? group.groupKey}>
                          {shortId(group.requestId ?? group.groupKey)}
                        </span>
                        {!group.requestId ? (
                          <div className="mt-0.5 text-[11px] text-[#a0a0a0]">Legacy (ungrouped)</div>
                        ) : null}
                      </td>
                      <td className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}>
                        {group.callCount}
                      </td>
                      <td className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}>
                        <div>{formatTokens(group.totalTokens)}</div>
                        <div className="mt-0.5 text-[11px] text-[#a0a0a0]">
                          {formatTokens(group.inputTokens)} in · {formatTokens(group.outputTokens)} out
                        </div>
                      </td>
                      <td className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}>
                        {group.model ?? "—"}
                      </td>
                      <td className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}>
                        {group.requestedByName ?? "—"}
                      </td>
                      <td className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}>
                        <span
                          className={
                            group.errorCount > 0
                              ? "text-[#E65100]"
                              : "text-[#2D6A4F]"
                          }
                        >
                          {statusSummary(group)}
                        </span>
                      </td>
                    </tr>
                    {isOpen ? (
                      <tr>
                        <td
                          colSpan={8}
                          className={`${isLastRow ? "" : "border-b border-[#ece9e4]"} bg-[#fafaf8] px-4 py-3`}
                        >
                          <div className="overflow-x-auto rounded-[8px] border border-[#ece9e4] bg-white">
                            <table className="w-full min-w-[720px] border-collapse text-[12px]">
                              <thead>
                                <tr className="bg-[#fafaf8]">
                                  {[
                                    "Entity",
                                    "Field",
                                    "Input",
                                    "Output",
                                    "Total",
                                    "HTTP",
                                    "Status",
                                    "Error",
                                  ].map((h) => (
                                    <th
                                      key={h}
                                      className="border-b border-[#ece9e4] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.6px] text-[#a0a0a0]"
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {group.calls.map((call) => (
                                  <tr key={call.id} className="border-t border-[#ece9e4]">
                                    <td className="px-3 py-2 text-[#4a4a4a]">
                                      <div>{call.entityType ?? "—"}</div>
                                      {call.entityId ? (
                                        <div className="mt-0.5 font-mono text-[11px] text-[#a0a0a0]">
                                          {call.entityId}
                                        </div>
                                      ) : null}
                                    </td>
                                    <td className="px-3 py-2 text-[#4a4a4a]">
                                      {call.fieldKey ?? "—"}
                                    </td>
                                    <td className="px-3 py-2 text-[#4a4a4a]">
                                      {call.inputTokens != null
                                        ? formatTokens(call.inputTokens)
                                        : "—"}
                                    </td>
                                    <td className="px-3 py-2 text-[#4a4a4a]">
                                      {call.outputTokens != null
                                        ? formatTokens(call.outputTokens)
                                        : "—"}
                                    </td>
                                    <td className="px-3 py-2 text-[#4a4a4a]">
                                      {call.totalTokens != null
                                        ? formatTokens(call.totalTokens)
                                        : "—"}
                                    </td>
                                    <td className="px-3 py-2 text-[#4a4a4a]">
                                      {call.httpStatus ?? "—"}
                                    </td>
                                    <td className="px-3 py-2 text-[#4a4a4a]">
                                      {call.workflowStatus ?? "—"}
                                    </td>
                                    <td className="max-w-[280px] px-3 py-2 text-[#4a4a4a]">
                                      {call.errorMessage ? (
                                        <span className="line-clamp-2 text-[#E65100]" title={call.errorMessage}>
                                          {call.errorMessage}
                                        </span>
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[#ece9e4] px-5 py-3">
        <Pagination
          totalRows={totalGroups}
          page={page}
          limit={limit}
          limitOptions={LIMIT_OPTIONS}
        />
      </div>
    </div>
    </div>
  );
}
