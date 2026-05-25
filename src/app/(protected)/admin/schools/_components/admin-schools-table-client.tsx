"use client";

import { Pagination } from "@/components/pagination";
import { usePathname, useRouter } from "next/navigation";

import type { AdminSchoolTableRow } from "../_lib/fetch-admin-schools-page";
import {
  ADMIN_SCHOOLS_STATUS_FILTER_OPTIONS,
  type AdminSchoolsStatusFilter,
} from "../_lib/parse-admin-schools-search-params";
import { AdminSchoolsRowActionsMenu } from "./admin-schools-row-actions-menu";

const LIMIT_OPTIONS = [10, 20, 30, 50] as const;

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const filterSelectClass =
  "min-w-[140px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[7px] pl-[10px] pr-9 text-[12px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C]";

function StatusBadge({ row }: { row: AdminSchoolTableRow }) {
  if (!row.isActive) {
    return (
      <span className="inline-flex rounded-full bg-[#f3f2f0] px-2.5 py-0.5 text-[10px] font-semibold text-[#8a8a8a]">
        Inactive
      </span>
    );
  }

  if (row.isLowTokens) {
    return (
      <span className="inline-flex rounded-full bg-[#FFF3E0] px-2.5 py-0.5 text-[10px] font-semibold text-[#E67E22]">
        Low tokens
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-[#e8f5ee] px-2.5 py-0.5 text-[10px] font-semibold text-[#2D6A4F]">
      Active
    </span>
  );
}

function TokenCell({ row }: { row: AdminSchoolTableRow }) {
  const pool = row.creditPool ?? 0;
  const plan = row.yearlyCreditPlan;

  if (plan == null || plan <= 0) {
    return <span className="text-[12px] text-[#4a4a4a]">—</span>;
  }

  const percent = row.tokenPercent ?? 0;
  const barColor = percent <= 10 ? "#E67E22" : "#2D6A4F";

  return (
    <div className="min-w-[100px] text-[12px] text-[#4a4a4a]">
      <strong className="font-semibold text-[#1a1a1a]">{pool.toLocaleString()}</strong>
      <span>/{plan.toLocaleString()}</span>
      <div className="mt-1 h-1 rounded-[2px] bg-[#ece9e4]">
        <div
          className="h-full rounded-[2px]"
          style={{ width: `${Math.min(100, percent)}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

export type AdminSchoolsTableClientProps = {
  rows: AdminSchoolTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
  status: AdminSchoolsStatusFilter;
};

export function AdminSchoolsTableClient({
  rows,
  totalRows,
  page,
  limit,
  q,
  status,
}: AdminSchoolsTableClientProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const filtersActive = q.trim().length > 0 || status !== "";

  return (
    <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-[14px] font-bold text-[#1a1a1a]">All Schools</h2>
          <span className="text-[11px] text-[#a0a0a0]">
            {totalRows.toLocaleString()} {totalRows === 1 ? "school" : "schools"}
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
            <label htmlFor="admin-schools-search" className="sr-only">
              Search schools
            </label>
            <input
              id="admin-schools-search"
              key={`${q}-${status}`}
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search schools..."
              className="w-full rounded-[8px] border border-[#e0deda] bg-white py-[7px] pl-8 pr-3 text-[12px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#a0a0a0] focus:border-[#40916C]"
            />
          </div>

          <select
            name="status"
            aria-label="Filter by status"
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={status}
          >
            {ADMIN_SCHOOLS_STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value || "all-statuses"} value={option.value}>
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
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#fafaf8]">
              {[
                "School",
                "Code",
                "Students",
                "Tokens",
                "Status",
                "Owner",
                "Renewal",
                "Actions",
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
                  colSpan={8}
                  className="px-4 py-10 text-center text-[13px] text-[#a0a0a0]"
                >
                  {filtersActive
                    ? "No schools match your filters."
                    : "No schools found."}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const isLastRow = index === rows.length - 1;
                const cellBorder = isLastRow ? "" : "border-b border-[#ece9e4]";
                const detailHref = `/admin/schools/${row.id}`;

                function openDetail() {
                  router.push(detailHref);
                }

                const studentsLabel =
                  row.studentsLimit != null
                    ? `${row.studentCount}/${row.studentsLimit}`
                    : String(row.studentCount);

                return (
                  <tr
                    key={row.id}
                    className="cursor-pointer transition-colors hover:bg-[#f0f7f2]"
                    onClick={openDetail}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDetail();
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`View ${row.name} details`}
                  >
                    <td className={`${cellBorder} px-4 py-3`}>
                      <div className="text-[13px] font-semibold text-[#1a1a1a]">{row.name}</div>
                      <div className="mt-px text-[11px] text-[#a0a0a0]">{row.locationLabel}</div>
                    </td>
                    <td className={`${cellBorder} px-4 py-3`}>
                      <code className="rounded-[4px] bg-[#e8f5ee] px-2 py-0.5 text-[11px] font-semibold text-[#2D6A4F]">
                        {row.code}
                      </code>
                    </td>
                    <td className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}>
                      {studentsLabel}
                    </td>
                    <td className={`${cellBorder} px-4 py-3`}>
                      <TokenCell row={row} />
                    </td>
                    <td className={`${cellBorder} px-4 py-3`}>
                      <StatusBadge row={row} />
                    </td>
                    <td className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}>
                      {row.ownerName}
                    </td>
                    <td className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}>
                      {row.renewalLabel}
                    </td>
                    <td
                      className={`${cellBorder} px-4 py-3`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <AdminSchoolsRowActionsMenu
                        schoolId={row.id}
                        schoolName={row.name}
                        isActive={row.isActive}
                      />
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
