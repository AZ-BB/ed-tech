"use client";

import { useState, useTransition } from "react";

import { saveProgram, unsaveProgram } from "@/actions/program-activities";
import { useLocale } from "@/lib/i18n/locale-context";

import detailStyles from "./program-detail.module.css";

type ProgramSaveButtonProps = {
  programId: string;
  initialSaved: boolean;
};

export function ProgramSaveButton({
  programId,
  initialSaved,
}: ProgramSaveButtonProps) {
  const { dict } = useLocale();
  const t = dict.student.programs;
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={detailStyles.heroSaveBtn}
      disabled={isPending}
      aria-pressed={isSaved}
      onClick={() => {
        startTransition(async () => {
          const wasSaved = isSaved;
          setIsSaved(!wasSaved);
          const result = wasSaved
            ? await unsaveProgram(programId)
            : await saveProgram(programId);
          if (!result.ok) {
            setIsSaved(wasSaved);
          }
        });
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={isSaved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
      >
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
      </svg>
      {isSaved ? t.saved : t.saveProgram}
    </button>
  );
}
