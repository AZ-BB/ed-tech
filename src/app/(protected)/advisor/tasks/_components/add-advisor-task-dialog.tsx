"use client";

import type {
  AdvisorTaskStudentOption,
} from "@/app/(protected)/advisor/tasks/_lib/fetch-advisor-tasks-page";
import {
  APPLICATION_TASK_PRIORITIES,
  APPLICATION_TASK_PRIORITY_LABEL,
  type ApplicationTaskPriority,
} from "@/lib/application-task-constants";
import { useEffect, useMemo, useState } from "react";

export type AddAdvisorTaskSubmitInput = {
  applicationId: number;
  title: string;
  dueDate: string | null;
  priority: ApplicationTaskPriority;
};

type AddAdvisorTaskDialogProps = {
  open: boolean;
  onClose: () => void;
  studentOptions: AdvisorTaskStudentOption[];
  onSubmit: (input: AddAdvisorTaskSubmitInput) => void;
  isSubmitting: boolean;
  error: string | null;
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C] disabled:opacity-60";

const selectClassName = `${inputClassName} cursor-pointer appearance-none bg-[length:10px_6px] bg-[position:right_10px_center] bg-no-repeat pr-9`;

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

function defaultFormState() {
  return {
    selectedStudentId: "",
    selectedApplicationId: "",
    title: "",
    dueDate: "",
    priority: "medium" as ApplicationTaskPriority,
  };
}

export function AddAdvisorTaskDialog({
  open,
  onClose,
  studentOptions,
  onSubmit,
  isSubmitting,
  error,
}: AddAdvisorTaskDialogProps) {
  const [form, setForm] = useState(defaultFormState);

  const selectedStudent = useMemo(
    () => studentOptions.find((option) => option.studentId === form.selectedStudentId) ?? null,
    [form.selectedStudentId, studentOptions],
  );

  const showApplicationSelect = (selectedStudent?.applications.length ?? 0) > 1;

  const resolvedApplicationId = useMemo(() => {
    if (!selectedStudent) return null;
    if (selectedStudent.applications.length === 1) {
      return selectedStudent.applications[0]?.applicationId ?? null;
    }
    const parsed = Number.parseInt(form.selectedApplicationId, 10);
    if (!Number.isFinite(parsed)) return null;
    return (
      selectedStudent.applications.find((option) => option.applicationId === parsed)
        ?.applicationId ?? null
    );
  }, [form.selectedApplicationId, selectedStudent]);

  useEffect(() => {
    if (!open) return;
    setForm(defaultFormState());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, isSubmitting]);

  if (!open) return null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resolvedApplicationId == null || !form.title.trim()) return;

    onSubmit({
      applicationId: resolvedApplicationId,
      title: form.title.trim(),
      dueDate: form.dueDate.trim() || null,
      priority: form.priority,
    });
  }

  const canSubmit =
    Boolean(form.selectedStudentId) &&
    resolvedApplicationId != null &&
    form.title.trim().length > 0 &&
    !isSubmitting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-advisor-task-title"
        className="flex max-h-[min(90vh,720px)] w-full max-w-[520px] flex-col overflow-hidden rounded-[12px] border border-[#e0deda] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#ece9e4] px-6 py-5">
          <h2
            id="add-advisor-task-title"
            className="font-[family-name:var(--font-dm-serif)] text-[20px] font-semibold text-[#1a1a1a]"
          >
            Add task
          </h2>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="cursor-pointer rounded-[6px] p-1 text-[#7a7a7a] transition-colors hover:bg-[#f5f4f0] hover:text-[#1a1a1a] disabled:opacity-60"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <label htmlFor="add-task-student" className={labelClassName}>
                Student
              </label>
              <select
                id="add-task-student"
                disabled={isSubmitting}
                value={form.selectedStudentId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    selectedStudentId: event.target.value,
                    selectedApplicationId: "",
                  }))
                }
                className={selectClassName}
                style={{ backgroundImage: SELECT_CHEVRON }}
                required
              >
                <option value="">Select student…</option>
                {studentOptions.map((option) => (
                  <option key={option.studentId} value={option.studentId}>
                    {option.studentName}
                  </option>
                ))}
              </select>
            </div>

            {showApplicationSelect ? (
              <div>
                <label htmlFor="add-task-application" className={labelClassName}>
                  Application
                </label>
                <select
                  id="add-task-application"
                  disabled={isSubmitting}
                  value={form.selectedApplicationId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      selectedApplicationId: event.target.value,
                    }))
                  }
                  className={selectClassName}
                  style={{ backgroundImage: SELECT_CHEVRON }}
                  required
                >
                  <option value="">Select application…</option>
                  {selectedStudent?.applications.map((option) => (
                    <option key={option.applicationId} value={String(option.applicationId)}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <label htmlFor="add-task-title" className={labelClassName}>
                Task name
              </label>
              <input
                id="add-task-title"
                type="text"
                disabled={isSubmitting}
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="e.g. Review personal statement draft"
                className={inputClassName}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="add-task-due" className={labelClassName}>
                  Due date
                </label>
                <input
                  id="add-task-due"
                  type="date"
                  disabled={isSubmitting}
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, dueDate: event.target.value }))
                  }
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="add-task-priority" className={labelClassName}>
                  Priority
                </label>
                <select
                  id="add-task-priority"
                  disabled={isSubmitting}
                  value={form.priority}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      priority: event.target.value as ApplicationTaskPriority,
                    }))
                  }
                  className={selectClassName}
                  style={{ backgroundImage: SELECT_CHEVRON }}
                >
                  {APPLICATION_TASK_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {APPLICATION_TASK_PRIORITY_LABEL[priority]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error ? (
              <p className="text-[12px] font-medium text-[#8c2d22]">{error}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-[#ece9e4] px-6 py-4">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a] transition-colors hover:bg-[#f5f4f0] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Adding…" : "Add task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
