"use client";

import {
  searchAdvisorUniversitiesForApplication,
  updateAdvisorUniversityTarget,
  updateAdvisorUniversityTargetDecision,
  updateAdvisorUniversityTargetStatus,
} from "@/actions/advisor-application-university-targets";
import type {
  AdvisorPortalUniversityTargetRow,
  AdvisorPortalUniversityTargetsPanelProps,
} from "@/app/(protected)/advisor/applications/_lib/fetch-advisor-portal-university-targets-page";
import {
  ADVISOR_UNIVERSITY_TARGET_DECISION_FILTER_OPTIONS,
  ADVISOR_UNIVERSITY_TARGET_STATUS_FILTER_OPTIONS,
} from "@/app/(protected)/advisor/applications/_lib/parse-advisor-university-targets-filters";
import {
  ApplicationUniversityTargetsTable,
  type ApplicationUniversityTargetsTableActions,
} from "@/components/application-support/application-university-targets-table";
import { Pagination } from "@/components/pagination";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

const UNIVERSITIES_LIMIT_OPTIONS = [10, 20, 50] as const;

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const filterSelectClass =
  "min-w-[140px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[7px] pl-[10px] pr-9 text-[12px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C]";

const iconBtnClass =
  "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] border border-[#e0deda] bg-white text-[#4a4a4a] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)]";

const ADVISOR_UNIVERSITY_TARGET_ACTIONS: ApplicationUniversityTargetsTableActions = {
  searchUniversities: searchAdvisorUniversitiesForApplication,
  updateTarget: updateAdvisorUniversityTarget,
  updateTargetStatus: updateAdvisorUniversityTargetStatus,
  updateTargetDecision: updateAdvisorUniversityTargetDecision,
};

export function AdvisorApplicationsUniversitiesTab({
  rows,
  totalRows,
  page,
  limit,
  search,
  status,
  decision,
}: AdvisorPortalUniversityTargetsPanelProps) {
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
        next.set("universitiesPage", "1");
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

  const updateFilter = useCallback(
    (param: "targetStatus" | "targetDecision", value: string) => {
      startTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        if (value === "all") {
          next.delete(param);
        } else {
          next.set(param, value);
        }
        next.set("universitiesPage", "1");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const filtersActive =
    search.trim().length > 0 || status !== "all" || decision !== "all";

  const emptyMessage = filtersActive
    ? "No university targets match your filters."
    : "No university targets yet across your assigned applications.";

  return (
    <>
      <div
        className={`overflow-hidden rounded-lg border border-[var(--border-light)] ${isPending ? "opacity-75" : ""}`}
        aria-busy={isPending}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-light)] px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-3">
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
                placeholder="Search student, email, or university..."
                className="w-[280px] max-w-full rounded-[8px] border-[1.5px] border-[var(--border)] bg-[#faf9f4] py-[7px] pl-8 pr-3 text-[12.5px] text-[var(--text)] outline-none transition-colors focus:border-[var(--green-light)] focus:bg-white"
              />
            </div>
            <select
              aria-label="Filter by status"
              className={filterSelectClass}
              style={{ backgroundImage: SELECT_CHEVRON }}
              value={status}
              onChange={(event) => updateFilter("targetStatus", event.target.value)}
            >
              {ADVISOR_UNIVERSITY_TARGET_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by decision"
              className={filterSelectClass}
              style={{ backgroundImage: SELECT_CHEVRON }}
              value={decision}
              onChange={(event) => updateFilter("targetDecision", event.target.value)}
            >
              {ADVISOR_UNIVERSITY_TARGET_DECISION_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ApplicationUniversityTargetsTable
          targets={rows}
          actions={ADVISOR_UNIVERSITY_TARGET_ACTIONS}
          emptyMessage={emptyMessage}
          minWidthClass="min-w-[1050px]"
          leadingHeaderColumns={
            <>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Package</th>
            </>
          }
          renderLeadingColumns={(target) => {
            const row = target as AdvisorPortalUniversityTargetRow;
            return (
              <>
                <td className="px-4 py-3 whitespace-nowrap text-[13px] text-[#4a4a4a]">
                  <Link
                    href={`/advisor/applications/${row.applicationId}?tab=universities`}
                    className="font-semibold text-[var(--green-dark)] hover:underline"
                    onClick={(event) => event.stopPropagation()}
                  >
                    #{row.applicationId}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[13px] text-[#4a4a4a]">
                  <div>{row.studentName}</div>
                  {row.studentEmail !== "—" ? (
                    <div className="mt-0.5 text-[var(--text-hint)]">
                      {row.studentEmail}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-[13px] text-[#4a4a4a]">
                  <div>{row.packageLabel}</div>
                  {row.packagePrice > 0 ? (
                    <div className="mt-0.5 whitespace-nowrap font-medium text-[#2D6A4F]">
                      AED {row.packagePrice.toLocaleString()}
                    </div>
                  ) : null}
                </td>
              </>
            );
          }}
          renderExtraActions={(target) => {
            const row = target as AdvisorPortalUniversityTargetRow;
            return (
              <Link
                href={`/advisor/applications/${row.applicationId}?tab=universities`}
                className={iconBtnClass}
                aria-label={`View application #${row.applicationId}`}
                onClick={(event) => event.stopPropagation()}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-4 w-4"
                  aria-hidden
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </Link>
            );
          }}
        />
      </div>

      <Pagination
        className="mt-4"
        totalRows={totalRows}
        page={page}
        limit={limit}
        limitOptions={UNIVERSITIES_LIMIT_OPTIONS}
        pageParam="universitiesPage"
        limitParam="universitiesLimit"
      />
    </>
  );
}
