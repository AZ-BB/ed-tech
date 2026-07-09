"use client";

import { useLocale } from "@/lib/i18n/locale-context";

export function ProgramsPageLoadingFallback() {
  const { dict } = useLocale();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 text-center text-[14px] text-[var(--text-light)]">
      {dict.student.programs.loading}
    </div>
  );
}

export function ProgramDetailLoadingFallback() {
  const { dict } = useLocale();
  return (
    <div className="mx-auto w-full px-4 py-12 text-center text-[14px] text-[var(--text-light)]">
      {dict.student.programs.loadingProgram}
    </div>
  );
}
