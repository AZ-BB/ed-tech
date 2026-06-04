"use client";

import { assignStudentTeacher } from "@/actions/school-students";
import type { SchoolTeacherOption } from "@/lib/fetch-school-teacher-options";
import { STUDENT_TEACHER_UNASSIGNED_FILTER } from "@/lib/student-teacher-assignment";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22 fill=%22none%22%3E%3Cpath d=%22M1 1l4 4 4-4%22 stroke=%22%236a6a6a%22 stroke-width=%221.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E")';

const selectClassName =
  "w-full min-w-[140px] max-w-[200px] rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-mid)] outline-none appearance-none bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat pr-8 cursor-pointer transition-colors focus:border-[var(--green-light)] disabled:cursor-not-allowed disabled:opacity-55";

export type StudentTeacherAssignSelectProps = {
  studentId: string;
  value: string | null;
  options: SchoolTeacherOption[];
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function StudentTeacherAssignSelect({
  studentId,
  value,
  options,
  disabled = false,
  className,
  "aria-label": ariaLabel = "Assigned teacher",
}: StudentTeacherAssignSelectProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const selectValue = value ?? STUDENT_TEACHER_UNASSIGNED_FILTER;

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    if (next === selectValue) return;

    setError(null);
    startTransition(async () => {
      const result = await assignStudentTeacher(studentId, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={className} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <select
        aria-label={ariaLabel}
        style={{ backgroundImage: SELECT_CHEVRON }}
        className={selectClassName}
        value={selectValue}
        disabled={disabled || isPending}
        onChange={handleChange}
        onClick={(e) => e.stopPropagation()}
      >
        <option value={STUDENT_TEACHER_UNASSIGNED_FILTER}>Unassigned</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1 text-[10px] leading-snug text-[#c0392b]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
