"use client";

import {
  ADMIN_APPLICATION_STATUS_LABEL,
  adminApplicationStatusPillClass,
} from "@/app/(protected)/admin/applications/_lib/application-status-labels";
import {
  ADVISOR_APPLICATION_STATUS_OPTIONS,
  type AdminAdvisorApplicationsPanelProps,
  type AdvisorApplicationStatusFilter,
} from "@/app/(protected)/admin/users/advisors/[id]/_lib/fetch-advisor-applications-page";
import { Pagination } from "@/components/pagination";
import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import { format } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

const APPLICATIONS_LIMIT_OPTIONS = [10, 20, 50] as const;

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function AdvisorApplicationsTable({
  rows,
  totalRows,
  page,
  limit,
  status,
  statusCounts,
}: AdminAdvisorApplicationsPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const switchStatus = useCallback(
    (nextStatus: AdvisorApplicationStatusFilter) => {
      if (nextStatus === status) return;
      startTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        if (nextStatus === "all") {
          next.delete("applicationStatus");
        } else {
          next.set("applicationStatus", nextStatus);
        }
        next.set("applicationsPage", "1");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams, status],
  );

  return (
    <SchoolStudentPanel
      head="My applications"
      sub="Application support cases assigned to you"
    >
      <div className={isPending ? "opacity-75" : ""} aria-busy={isPending}>
        <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--border-light)]">
          {ADVISOR_APPLICATION_STATUS_OPTIONS.map((option) => {
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

        <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
          <table className="w-full min-w-[920px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-[var(--text-light)]"
                  >
                    No applications assigned to you yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const statusLabel =
                    ADMIN_APPLICATION_STATUS_LABEL[
                      row.status as keyof typeof ADMIN_APPLICATION_STATUS_LABEL
                    ] ?? row.status;
                  const detailHref = `/advisor/applications/${row.id}`;

                  function openDetail() {
                    router.push(detailHref);
                  }

                  return (
                    <tr
                      key={row.id}
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
                      aria-label={`View application #${row.id} for ${row.studentName}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-[var(--green-dark)]">
                        #{row.id}
                      </td>
                      <td className="px-4 py-3 text-[var(--text)]">
                        <div>{row.studentName}</div>
                        {row.studentEmail !== "—" ? (
                          <div className="mt-0.5 text-[11px] text-[var(--text-hint)]">
                            {row.studentEmail}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-mid)]">
                        {row.schoolName}
                      </td>
                      <td className="max-w-[200px] px-4 py-3 text-[var(--text-mid)]">
                        <div>{row.packageLabel}</div>
                        {row.universitiesLabel !== "—" ? (
                          <div
                            className="mt-0.5 truncate text-[11px] text-[var(--text-hint)]"
                            title={row.universitiesLabel}
                          >
                            {row.universitiesLabel}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${adminApplicationStatusPillClass(row.status)}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--text-mid)]">
                        {formatWhen(row.assignedAt ?? row.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          className="mt-4"
          totalRows={totalRows}
          page={page}
          limit={limit}
          limitOptions={APPLICATIONS_LIMIT_OPTIONS}
          pageParam="applicationsPage"
          limitParam="applicationsLimit"
        />
      </div>
    </SchoolStudentPanel>
  );
}
