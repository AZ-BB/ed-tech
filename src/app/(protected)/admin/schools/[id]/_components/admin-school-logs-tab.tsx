"use client";

import { SchoolStudentActivityLogsTab } from "@/app/(protected)/school/students/[id]/_components/school-student-activity-logs-tab";
import type { StudentActivityLogsPanelProps } from "@/lib/student-activity-logs";

export type AdminSchoolLogsTabProps = StudentActivityLogsPanelProps;

export function AdminSchoolLogsTab(props: AdminSchoolLogsTabProps) {
  return (
    <SchoolStudentActivityLogsTab
      {...props}
      head="Activity logs"
      sub="Platform events for this school's students and teachers"
    />
  );
}
