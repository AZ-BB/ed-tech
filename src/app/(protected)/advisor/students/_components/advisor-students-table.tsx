"use client";

import type { AdvisorStudentsPanelProps } from "@/app/(protected)/advisor/students/_lib/fetch-advisor-students-page";
import {
  ADVISOR_STUDENT_STATUS_LABEL,
  advisorStudentStatusPillClass,
  type AdvisorStudentStatusFilter,
} from "@/lib/advisor-student-derivations";
import { Pagination } from "@/components/pagination";
import { format } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

const STUDENTS_LIMIT_OPTIONS = [10, 20, 50] as const;

const STATUS_OPTIONS: {
  value: AdvisorStudentStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "active_package", label: "Active Package" },
  { value: "active_advisory", label: "Active Advisory" },
  { value: "awaiting_payment", label: "Awaiting Payment" },
  { value: "submitted", label: "Submitted" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "d MMM yyyy");
  } catch {
    return "—";
  }
}

function deadlineRiskClass(level: string): string {
  if (level === "urgent") return "bg-[rgba(231,76,60,0.12)] text-[#8c2d22]";
  if (level === "soon") return "bg-[rgba(212,162,42,0.14)] text-[#7a5d10]";
  if (level === "ok") return "bg-[#e8f5ee] text-[#2D6A4F]";
  return "bg-[#f0f0f0] text-[#6a6a6a]";
}

export function AdvisorStudentsTable({
  rows,
  totalRows,
  page,
  limit,
  search,
  status,
  statusCounts,
}: AdvisorStudentsPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const applySearch = useCallback(
    (value: string) => {
      startTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        const trimmed = value.trim();
        if (trimmed) {
          next.set("search", trimmed);
        } else {
          next.delete("search");
        }
        next.set("studentsPage", "1");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (searchInput.trim() === search.trim()) return;
      applySearch(searchInput);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [searchInput, search, applySearch]);

  const switchStatus = useCallback(
    (nextStatus: AdvisorStudentStatusFilter) => {
      if (nextStatus === status) return;
      startTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        if (nextStatus === "all") {
          next.delete("studentStatus");
        } else {
          next.set("studentStatus", nextStatus);
        }
        next.set("studentsPage", "1");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams, status],
  );

  return (
    <div
      className={`overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white ${isPending ? "opacity-75" : ""}`}
      aria-busy={isPending}
    >
      <div className="flex flex-wrap gap-1 border-b border-[var(--border-light)] px-4 pt-3">
        {STATUS_OPTIONS.map((option) => {
          const active = option.value === status;
          const count = statusCounts[option.value];
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => switchStatus(option.value)}
              className={
                active
                  ? "-mb-px border-b-2 border-[var(--green)] px-3 py-2 text-[13px] font-semibold text-[var(--green-dark)]"
                  : "px-3 py-2 text-[13px] font-medium text-[var(--text-mid)] hover:text-[var(--text)]"
              }
            >
              {option.label}
              <span className="ml-1.5 text-[11px] font-normal text-[var(--text-hint)]">
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-light)] px-4 py-3.5">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-[10px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[var(--text-hint)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search students..."
            className="w-[240px] max-w-full rounded-[8px] border-[1.5px] border-[var(--border)] bg-[#faf9f4] py-[7px] pl-8 pr-3 text-[12.5px] text-[var(--text)] outline-none transition-colors focus:border-[var(--green-light)] focus:bg-white"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Destinations</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Last contact</th>
              <th className="px-4 py-3">Next follow-up</th>
              <th className="px-4 py-3">Deadline risk</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-[var(--text-light)]"
                >
                  {search.trim()
                    ? "No students match your search."
                    : "No students with assigned applications yet."}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const detailHref = `/advisor/students/${row.studentId}`;

                function openDetail() {
                  router.push(detailHref);
                }

                return (
                  <tr
                    key={row.studentId}
                    className="cursor-pointer border-t border-[var(--border-light)] transition-colors hover:bg-[#faf9f4]"
                    onClick={openDetail}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDetail();
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`View student ${row.studentName}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] text-[11.5px] font-bold text-[var(--green-dark)]">
                          {row.studentInitials}
                        </span>
                        <div>
                          <div className="font-semibold text-[var(--text)]">
                            {row.studentName}
                          </div>
                          <div className="text-[11.5px] text-[var(--text-light)]">
                            {row.schoolName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${advisorStudentStatusPillClass(row.managementStatus)}`}
                      >
                        {ADVISOR_STUDENT_STATUS_LABEL[row.managementStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.destinations.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.destinations.map((dest) => (
                            <span
                              key={`${row.studentId}-${dest.countryCode}`}
                              className="inline-flex rounded-full border border-[var(--border-light)] bg-[#faf9f4] px-2 py-0.5 text-[10px] font-medium text-[var(--text-mid)]"
                            >
                              {dest.label}
                              {dest.count > 1 ? ` ×${dest.count}` : ""}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[var(--text-hint)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-mid)]">
                      {row.stage}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-light)]">
                      {formatDate(row.lastContact)}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-light)]">
                      {formatDate(row.nextFollowUp)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${deadlineRiskClass(row.deadlineRiskLevel)}`}
                      >
                        {row.deadlineRiskLabel}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[var(--border-light)] px-4 py-3">
        <Pagination
          totalRows={totalRows}
          page={page}
          limit={limit}
          limitOptions={STUDENTS_LIMIT_OPTIONS}
          pageParam="studentsPage"
          limitParam="studentsLimit"
        />
      </div>
    </div>
  );
}
