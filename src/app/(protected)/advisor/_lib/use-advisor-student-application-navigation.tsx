"use client";

import { SelectAdvisorStudentApplicationDialog } from "@/app/(protected)/advisor/_components/select-advisor-student-application-dialog";
import type { AdvisorStudentApplicationOption } from "@/lib/advisor-student-application-options";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type ModalState = {
  studentId: string;
  studentName: string;
  applications: AdvisorStudentApplicationOption[];
};

export function useAdvisorStudentApplicationNavigation(
  studentApplicationOptions: Record<string, AdvisorStudentApplicationOption[]>,
) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState | null>(null);

  const navigateToApplication = useCallback(
    (applicationId: number) => {
      setModal(null);
      router.push(`/advisor/applications/${applicationId}`);
    },
    [router],
  );

  const handleStudentClick = useCallback(
    (studentId: string, studentName: string) => {
      const applications = studentApplicationOptions[studentId] ?? [];
      if (applications.length === 0) return;
      if (applications.length === 1) {
        navigateToApplication(applications[0]!.applicationId);
        return;
      }
      setModal({ studentId, studentName, applications });
    },
    [navigateToApplication, studentApplicationOptions],
  );

  const closeModal = useCallback(() => setModal(null), []);

  const applicationSelectDialog =
    modal != null ? (
      <SelectAdvisorStudentApplicationDialog
        open
        studentName={modal.studentName}
        applications={modal.applications}
        onSelect={navigateToApplication}
        onClose={closeModal}
      />
    ) : null;

  return {
    handleStudentClick,
    applicationSelectDialog,
  };
}
