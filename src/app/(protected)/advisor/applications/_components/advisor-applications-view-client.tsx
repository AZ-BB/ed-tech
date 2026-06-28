"use client";

import type { AdminAdvisorApplicationsPanelProps } from "@/app/(protected)/admin/users/advisors/[id]/_lib/fetch-advisor-applications-page";
import type { AdvisorPortalUniversityTargetsPanelProps } from "@/app/(protected)/advisor/applications/_lib/fetch-advisor-portal-university-targets-page";
import type { AdvisorApplicationsView } from "@/app/(protected)/advisor/applications/_lib/parse-advisor-applications-view";
import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

import { AdvisorApplicationsTable } from "./advisor-applications-table";
import { AdvisorApplicationsUniversitiesTab } from "./advisor-applications-universities-tab";

const VIEW_OPTIONS: { value: AdvisorApplicationsView; label: string }[] = [
  { value: "applications", label: "Applications" },
  { value: "universities", label: "Universities" },
];

type AdvisorApplicationsViewClientProps = {
  view: AdvisorApplicationsView;
  applicationsPanel?: AdminAdvisorApplicationsPanelProps;
  universitiesPanel?: AdvisorPortalUniversityTargetsPanelProps;
};

export function AdvisorApplicationsViewClient({
  view,
  applicationsPanel,
  universitiesPanel,
}: AdvisorApplicationsViewClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const switchView = useCallback(
    (nextView: AdvisorApplicationsView) => {
      if (nextView === view) return;
      startTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        if (nextView === "applications") {
          next.delete("view");
          next.set("applicationsPage", "1");
        } else {
          next.set("view", "universities");
          next.set("universitiesPage", "1");
        }
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams, view],
  );

  const sub =
    view === "universities"
      ? "University targets across your assigned applications"
      : "Application support cases assigned to you";

  return (
    <SchoolStudentPanel head="My applications" sub={sub}>
      <div className={isPending ? "opacity-75" : ""} aria-busy={isPending}>
        <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--border-light)]">
          {VIEW_OPTIONS.map((option) => {
            const active = option.value === view;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => switchView(option.value)}
                className={
                  active
                    ? "-mb-px border-b-2 border-[var(--green)] px-3 py-2 text-[13px] font-semibold text-[var(--green-dark)]"
                    : "px-3 py-2 text-[13px] font-medium text-[var(--text-mid)] hover:text-[var(--text)]"
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {view === "applications" && applicationsPanel ? (
          <AdvisorApplicationsTable {...applicationsPanel} isPending={isPending} />
        ) : null}

        {view === "universities" && universitiesPanel ? (
          <AdvisorApplicationsUniversitiesTab {...universitiesPanel} isPending={isPending} />
        ) : null}
      </div>
    </SchoolStudentPanel>
  );
}
