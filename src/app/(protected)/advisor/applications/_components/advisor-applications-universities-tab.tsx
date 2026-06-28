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
  ApplicationUniversityTargetsTable,
  type ApplicationUniversityTargetsTableActions,
} from "@/components/application-support/application-university-targets-table";
import { Pagination } from "@/components/pagination";
import Link from "next/link";

const UNIVERSITIES_LIMIT_OPTIONS = [10, 20, 50] as const;

const ADVISOR_UNIVERSITY_TARGET_ACTIONS: ApplicationUniversityTargetsTableActions = {
  searchUniversities: searchAdvisorUniversitiesForApplication,
  updateTarget: updateAdvisorUniversityTarget,
  updateTargetStatus: updateAdvisorUniversityTargetStatus,
  updateTargetDecision: updateAdvisorUniversityTargetDecision,
};

type AdvisorApplicationsUniversitiesTabProps = AdvisorPortalUniversityTargetsPanelProps & {
  isPending?: boolean;
};

export function AdvisorApplicationsUniversitiesTab({
  rows,
  totalRows,
  page,
  limit,
  isPending = false,
}: AdvisorApplicationsUniversitiesTabProps) {
  return (
    <div className={isPending ? "opacity-75" : ""} aria-busy={isPending}>
      <div className="overflow-hidden rounded-lg border border-[var(--border-light)]">
        <ApplicationUniversityTargetsTable
          targets={rows}
          actions={ADVISOR_UNIVERSITY_TARGET_ACTIONS}
          emptyMessage="No university targets yet across your assigned applications."
          minWidthClass="min-w-[900px]"
          leadingHeaderColumns={
            <>
              <th className="px-4 py-3">Application</th>
              <th className="px-4 py-3">Student</th>
            </>
          }
          renderLeadingColumns={(target) => {
            const row = target as AdvisorPortalUniversityTargetRow;
            return (
              <>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link
                    href={`/advisor/applications/${row.applicationId}?tab=universities`}
                    className="font-semibold text-[var(--green-dark)] hover:underline"
                    onClick={(event) => event.stopPropagation()}
                  >
                    #{row.applicationId}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--text)]">
                  <div>{row.studentName}</div>
                  {row.studentEmail !== "—" ? (
                    <div className="mt-0.5 text-[11px] text-[var(--text-hint)]">
                      {row.studentEmail}
                    </div>
                  ) : null}
                </td>
              </>
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
    </div>
  );
}
