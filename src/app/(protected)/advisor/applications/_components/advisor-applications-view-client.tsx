"use client";

import type { AdvisorPortalUniversityTargetsPanelProps } from "@/app/(protected)/advisor/applications/_lib/fetch-advisor-portal-university-targets-page";
import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";

import { AdvisorApplicationsUniversitiesTab } from "./advisor-applications-universities-tab";

type AdvisorApplicationsViewClientProps = {
  universitiesPanel: AdvisorPortalUniversityTargetsPanelProps;
};

export function AdvisorApplicationsViewClient({
  universitiesPanel,
}: AdvisorApplicationsViewClientProps) {
  return (
    <SchoolStudentPanel
      head="My applications"
      sub="University targets across your assigned applications"
    >
      <AdvisorApplicationsUniversitiesTab {...universitiesPanel} />
    </SchoolStudentPanel>
  );
}
