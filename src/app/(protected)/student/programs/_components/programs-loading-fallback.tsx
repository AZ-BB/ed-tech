"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { StudentLoadingCenter } from "../../_components/student-spinner";

export function ProgramsPageLoadingFallback() {
  const { dict } = useLocale();
  return (
    <StudentLoadingCenter
      label={dict.student.programs.loading}
      className="mx-auto w-full max-w-6xl px-4"
    />
  );
}

export function ProgramDetailLoadingFallback() {
  const { dict } = useLocale();
  return (
    <StudentLoadingCenter
      label={dict.student.programs.loadingProgram}
      className="mx-auto w-full px-4"
    />
  );
}
