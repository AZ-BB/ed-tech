"use client";

import { Pagination } from "@/components/pagination";
import { format } from "date-fns";
import { usePathname, useRouter } from "next/navigation";

import type { AdminPostAdmissionTableRow } from "../_lib/fetch-admin-post-admission-list";
import {
  POST_ADMISSION_STATUS_FILTER_OPTIONS,
  POST_ADMISSION_STATUS_LABEL,
  postAdmissionStatusPillClass,
} from "@/lib/post-admission-status-labels";
import type { AdminPostAdmissionStatusFilter } from "../_lib/parse-admin-post-admission-search-params";

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

function formatCreatedAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function StatusBadge({ status }: { status: string }) {
  const label =
    POST_ADMISSION_STATUS_LABEL[status as keyof typeof POST_ADMISSION_STATUS_LABEL] ?? status;

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${postAdmissionStatusPillClass(status as keyof typeof POST_ADMISSION_STATUS_LABEL)}`}
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

export type AdminPostAdmissionTableClientProps = {
  rows: AdminPostAdmissionTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
  status: AdminPostAdmissionStatusFilter;
  detailHrefPrefix?: string;
};

export function AdminPostAdmissionTableClient({
  rows,
  totalRows,
  page,
  limit,
  q,
  status,
  detailHrefPrefix = "/admin/post-admission",
}: AdminPostAdmissionTableClientProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const filtersActive = q.trim().length > 0 || status !== "";

  return (
    <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-[14px] font-bold text-[#1a1a1a]">Post-admission cases</h2>
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
            <label htmlFor="admin-post-admission-search" className="sr-only">
              Search students
            </label>
            <input
              id="admin-post-admission-search"
              key={`${q}-${status}`}
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search students..."
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
            {POST_ADMISSION_STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value === "all" ? "" : option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-3 py-[7px] text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Apply
          </button>

          {filtersActive ? (
            <button
              type="button"
              onClick={() => router.push(pathname)}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-3 py-[7px] text-[12px] font-semibold text-[#4a4a4a] transition-colors hover:border-[var(--green-light)]"
            >
              Clear
            </button>
          ) : null}
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#ece9e4] bg-[#faf9f4] text-[11px] font-semibold uppercase tracking-[0.06em] text-[#a0a0a0]">
              <th className="px-5 py-3">Student</th>
              <th className="px-5 py-3">School</th>
              <th className="px-5 py-3">Advisor</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Meeting</th>
              <th className="px-5 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[13px] text-[#a0a0a0]">
                  No post-admission cases found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-[#f4f3f0] transition-colors hover:bg-[#faf9f4]"
                  onClick={() => router.push(`${detailHrefPrefix}/${row.id}`)}
                >
                  <td className="px-5 py-3.5">
                    <div className="text-[13px] font-semibold text-[#1a1a1a]">
                      {row.studentName}
                    </div>
                    <div className="text-[11px] text-[#a0a0a0]">{row.studentEmail}</div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-[#4a4a4a]">{row.schoolName}</td>
                  <td className="px-5 py-3.5">
                    <AdvisorCell advisorName={row.advisorName} />
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-[13px] text-[#4a4a4a]">
                    {formatScheduledAt(row.scheduledAt)}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-[13px] text-[#4a4a4a]">
                    {formatCreatedAt(row.createdAt)}
                  </td>
                </tr>
              ))
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
