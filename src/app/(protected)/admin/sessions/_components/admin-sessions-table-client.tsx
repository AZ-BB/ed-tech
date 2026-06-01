"use client";

import { Pagination } from "@/components/pagination";
import { format } from "date-fns";
import { usePathname, useRouter } from "next/navigation";

import type { AdminSchoolOption } from "@/app/(protected)/admin/users/_lib/fetch-admin-school-options";

import type { SessionsTabId } from "../_data/sessions-tabs-data";
import {
  getAdminSessionDetailHref,
  isMergedSessionsTab,
  sessionsTabs,
} from "../_data/sessions-tabs-data";
import type { AdminSessionTableRow } from "../_lib/fetch-admin-sessions-page";
import type { AdminSessionKindFilter } from "../_lib/parse-admin-sessions-search-params";
import {
  ADMIN_ADVISOR_SESSION_STATUS_FILTER_OPTIONS,
  ADMIN_AMBASSADOR_SESSION_STATUS_FILTER_OPTIONS,
  ADMIN_SESSION_KIND_FILTER_OPTIONS,
  ADMIN_SESSION_STATUS_LABEL,
  adminSessionStatusPillClass,
  sessionKindBadgeClass,
  sessionKindLabel,
} from "../_lib/session-status-labels";

const LIMIT_OPTIONS = [10, 20, 30, 50] as const;

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const filterSelectClass =
  "min-w-[140px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[7px] pl-[10px] pr-9 text-[12px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C]";

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return "—";
  }
}

function StatusBadge({ status }: { status: string }) {
  const label = ADMIN_SESSION_STATUS_LABEL[status] ?? status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${adminSessionStatusPillClass(status)}`}
    >
      {label}
    </span>
  );
}

function tabHeading(tabId: SessionsTabId): string {
  return sessionsTabs.find((tab) => tab.id === tabId)?.label ?? "Sessions";
}

function providerColumnHeading(tabId: SessionsTabId): string {
  if (tabId === "advisor") return "Advisor";
  if (tabId === "ambassador") return "Ambassador";
  return "Advisor / Ambassador";
}

export type AdminSessionsTableClientProps = {
  tabId: SessionsTabId;
  rows: AdminSessionTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
  status: string;
  kind: AdminSessionKindFilter;
  schoolId: string;
  schoolOptions: AdminSchoolOption[];
};

export function AdminSessionsTableClient({
  tabId,
  rows,
  totalRows,
  page,
  limit,
  q,
  status,
  kind,
  schoolId,
  schoolOptions,
}: AdminSessionsTableClientProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const mergedTab = isMergedSessionsTab(tabId);
  const filtersActive =
    q.trim().length > 0 || status !== "" || kind !== "" || schoolId !== "";

  const statusOptions = mergedTab
    ? ADMIN_SESSION_KIND_FILTER_OPTIONS
    : tabId === "ambassador"
      ? ADMIN_AMBASSADOR_SESSION_STATUS_FILTER_OPTIONS
      : ADMIN_ADVISOR_SESSION_STATUS_FILTER_OPTIONS;

  const secondaryFilterName = mergedTab ? "kind" : "status";
  const secondaryFilterValue = mergedTab ? kind : status;

  return (
    <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-[14px] font-bold text-[#1a1a1a]">{tabHeading(tabId)}</h2>
          <span className="text-[11px] text-[#a0a0a0]">
            {totalRows.toLocaleString()} total
          </span>
        </div>

        <form
          className="flex min-w-[220px] flex-1 flex-wrap items-center justify-end gap-2"
          action={pathname}
          method="get"
        >
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="limit" value={String(limit)} />

          <div className="relative w-full max-w-[220px]">
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
            <label htmlFor="admin-sessions-search" className="sr-only">
              Search sessions
            </label>
            <input
              id="admin-sessions-search"
              key={`${q}-${status}-${kind}-${schoolId}`}
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search students..."
              className="w-full rounded-[8px] border border-[#e0deda] bg-white py-[7px] pl-8 pr-3 text-[12px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#a0a0a0] focus:border-[#40916C]"
            />
          </div>

          <select
            name="school"
            aria-label="Filter by school"
            className={`${filterSelectClass} max-w-[220px]`}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={schoolId}
          >
            <option value="">All schools</option>
            {schoolOptions.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>

          <select
            name={secondaryFilterName}
            aria-label={mergedTab ? "Filter by session type" : "Filter by status"}
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={secondaryFilterValue}
          >
            {statusOptions.map((option) => (
              <option
                key={option.value || (mergedTab ? "all-types" : "all-statuses")}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-[7px] text-[12px] font-semibold text-[#4a4a4a] transition-all duration-150 hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
          >
            Apply
          </button>
        </form>
      </div>

      <div className="overflow-x-auto px-5 pb-1 pt-1 [zoom:0.95]">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="bg-[#fafaf8]">
              {[
                "Student / School",
                providerColumnHeading(tabId),
                "Status",
                "Date",
              ].map((heading) => (
                <th
                  key={heading}
                  className="border-b border-[#ece9e4] px-4 py-[10px] text-left text-[10px] font-bold uppercase tracking-[0.8px] text-[#a0a0a0]"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-[13px] text-[#a0a0a0]"
                >
                  {filtersActive
                    ? "No sessions match your filters."
                    : "No sessions found yet."}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const isLastRow = index === rows.length - 1;
                const cellBorder = isLastRow ? "" : "border-b border-[#ece9e4]";
                const rowKey = `${row.kind}-${row.id}`;
                const detailHref = getAdminSessionDetailHref(row.kind, row.id);

                return (
                  <tr
                    key={rowKey}
                    className="cursor-pointer transition-colors hover:bg-[#f0f7f2]"
                    onClick={() => router.push(detailHref)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(detailHref);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`View ${row.kind} session for ${row.studentName}`}
                  >
                    <td className={`${cellBorder} px-4 py-3`}>
                      <div className="text-[13px] font-semibold text-[#1a1a1a]">
                        {row.studentName}
                      </div>
                      <div className="mt-px text-[11px] text-[#a0a0a0]">
                        {row.schoolName}
                      </div>
                    </td>
                    <td className={`${cellBorder} px-4 py-3`}>
                      <div className="flex flex-wrap items-center gap-2">
                        {mergedTab ? (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${sessionKindBadgeClass(row.kind)}`}
                          >
                            {sessionKindLabel(row.kind)}
                          </span>
                        ) : null}
                        <span className="text-[13px] text-[#4a4a4a]">
                          {row.providerName}
                        </span>
                      </div>
                    </td>
                    <td className={`${cellBorder} px-4 py-3`}>
                      <StatusBadge status={row.status} />
                    </td>
                    <td
                      className={`${cellBorder} whitespace-nowrap px-4 py-3 text-[13px] text-[#4a4a4a]`}
                    >
                      {formatWhen(row.occurredAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[#ece9e4] px-5 py-3">
        <Pagination
          totalRows={totalRows}
          page={page}
          limit={limit}
          limitOptions={LIMIT_OPTIONS}
        />
      </div>
    </div>
  );
}
