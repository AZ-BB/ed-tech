"use client";

import { Pagination } from "@/components/pagination";
import { format } from "date-fns";
import { usePathname, useRouter } from "next/navigation";

import type { AdminApplicationTableRow } from "../_lib/fetch-admin-applications-page";
import {
  ADMIN_APPLICATIONS_UNASSIGNED_FILTER,
  type AdminApplicationAdvisorOption,
} from "../_lib/fetch-admin-application-advisor-options";
import {
  ADMIN_APPLICATION_STATUS_FILTER_OPTIONS,
  ADMIN_APPLICATION_STATUS_LABEL,
  adminApplicationStatusPillClass,
  type AdminApplicationStatusFilter,
} from "../_lib/application-status-labels";
import type { AdminApplicationsAssignedToFilter } from "../_lib/parse-admin-applications-search-params";
import type { AdminSchoolOption } from "@/app/(protected)/admin/users/_lib/fetch-admin-school-options";

const LIMIT_OPTIONS = [10, 20, 30, 50] as const;

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const filterSelectClass =
  "min-w-[140px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[7px] pl-[10px] pr-9 text-[12px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C]";

function formatScheduledAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return "—";
  }
}

function StatusBadge({ status }: { status: string }) {
  const label =
    ADMIN_APPLICATION_STATUS_LABEL[
      status as keyof typeof ADMIN_APPLICATION_STATUS_LABEL
    ] ?? status;

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${adminApplicationStatusPillClass(status)}`}
    >
      {label}
    </span>
  );
}

function AdvisorCell({ advisorName }: { advisorName: string | null }) {
  if (!advisorName) {
    return (
      <span className="inline-flex rounded-full bg-[#FCEBEB] px-2.5 py-0.5 text-[10px] font-semibold text-[#E74C3C]">
        Unassigned
      </span>
    );
  }

  return <span className="text-[13px] text-[#4a4a4a]">{advisorName}</span>;
}

export type AdminApplicationsTableClientProps = {
  rows: AdminApplicationTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
  status: AdminApplicationStatusFilter;
  assignedTo: AdminApplicationsAssignedToFilter;
  schoolId: string;
  advisorOptions: AdminApplicationAdvisorOption[];
  schoolOptions: AdminSchoolOption[];
};

export function AdminApplicationsTableClient({
  rows,
  totalRows,
  page,
  limit,
  q,
  status,
  assignedTo,
  schoolId,
  advisorOptions,
  schoolOptions,
}: AdminApplicationsTableClientProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const filtersActive =
    q.trim().length > 0 || status !== "" || assignedTo !== "" || schoolId !== "";

  return (
    <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-[14px] font-bold text-[#1a1a1a]">All Applications</h2>
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
            <label htmlFor="admin-applications-search" className="sr-only">
              Search students
            </label>
            <input
              id="admin-applications-search"
              key={`${q}-${status}-${assignedTo}-${schoolId}`}
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
            name="assignedTo"
            aria-label="Filter by assigned advisor"
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={assignedTo}
          >
            <option value="">All advisors</option>
            <option value={ADMIN_APPLICATIONS_UNASSIGNED_FILTER}>Unassigned</option>
            {advisorOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            name="status"
            aria-label="Filter by status"
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={status}
          >
            {ADMIN_APPLICATION_STATUS_FILTER_OPTIONS.map((option) => (
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
                "Student",
                "Package",
                "Universities",
                "Advisor",
                "Status",
                "Scheduled at",
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
                  colSpan={6}
                  className="px-4 py-10 text-center text-[13px] text-[#a0a0a0]"
                >
                  {filtersActive
                    ? "No applications match your filters."
                    : "No application support submissions yet."}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const isLastRow = index === rows.length - 1;
                const cellBorder = isLastRow ? "" : "border-b border-[#ece9e4]";
                const detailHref = `/admin/applications/${row.id}`;

                function openDetail() {
                  router.push(detailHref);
                }

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
                    aria-label={`View application for ${row.studentName}`}
                  >
                    <td className={`${cellBorder} px-4 py-3`}>
                      <div className="text-[13px] font-semibold text-[#1a1a1a]">
                        {row.studentName}
                      </div>
                      <div className="mt-px text-[11px] text-[#a0a0a0]">
                        {row.schoolName}
                      </div>
                    </td>
                    <td className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}>
                      {row.packageLabel}
                    </td>
                    <td className={`${cellBorder} max-w-[240px] px-4 py-3 text-[13px] text-[#4a4a4a]`}>
                      {row.universitiesLabel}
                    </td>
                    <td className={`${cellBorder} px-4 py-3`}>
                      <AdvisorCell advisorName={row.advisorName} />
                    </td>
                    <td className={`${cellBorder} px-4 py-3`}>
                      <StatusBadge status={row.status} />
                    </td>
                    <td className={`${cellBorder} whitespace-nowrap px-4 py-3 text-[13px] text-[#4a4a4a]`}>
                      {formatScheduledAt(row.scheduledAt)}
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
