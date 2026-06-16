"use client";

import { useEffect, useState } from "react";
import {
  APPLICATION_CALL_OUTCOMES,
  APPLICATION_CALL_OUTCOME_LABEL,
  APPLICATION_CALL_STATUSES,
  APPLICATION_CALL_STATUS_LABEL,
  APPLICATION_CALL_TYPES,
  APPLICATION_CALL_TYPE_LABEL,
  callStatusRequiresOutcome,
  type ApplicationCallOutcome,
  type ApplicationCallStatus,
  type ApplicationCallType,
} from "@/lib/application-call-constants";

export type LogApplicationCallFormData = {
  callType: ApplicationCallType;
  durationMinutes: string;
  callDate: string;
  status: ApplicationCallStatus;
  outcome: ApplicationCallOutcome | "";
  summary: string;
  createFollowUpTask: boolean;
  followUpTaskTitle: string;
  followUpTaskDueDate: string;
};

type LogApplicationCallDialogProps = {
  open: boolean;
  mode?: "create" | "edit";
  studentName: string;
  initialForm?: LogApplicationCallFormData | null;
  onClose: () => void;
  onSubmit: (data: LogApplicationCallFormData) => void;
  isSubmitting: boolean;
  error: string | null;
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C] disabled:opacity-60";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

const selectClassName = `${inputClassName} cursor-pointer appearance-none bg-[length:10px_6px] bg-[position:right_10px_center] bg-no-repeat pr-9`;

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultFormState(): LogApplicationCallFormData {
  return {
    callType: "paid_advisory_session",
    durationMinutes: "30",
    callDate: todayIsoDate(),
    status: "completed",
    outcome: "",
    summary: "",
    createFollowUpTask: false,
    followUpTaskTitle: "",
    followUpTaskDueDate: "",
  };
}

export function callToFormData(call: {
  callType: ApplicationCallType;
  durationMinutes: number;
  callDate: string;
  status: ApplicationCallStatus;
  outcome: ApplicationCallOutcome | null;
  summary: string | null;
}): LogApplicationCallFormData {
  return {
    callType: call.callType,
    durationMinutes: String(call.durationMinutes),
    callDate: call.callDate,
    status: call.status,
    outcome: call.outcome ?? "",
    summary: call.summary ?? "",
    createFollowUpTask: false,
    followUpTaskTitle: "",
    followUpTaskDueDate: "",
  };
}

export function LogApplicationCallDialog({
  open,
  mode = "create",
  studentName,
  initialForm = null,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: LogApplicationCallDialogProps) {
  const [form, setForm] = useState<LogApplicationCallFormData>(defaultFormState);
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;
    setForm(isEdit && initialForm ? initialForm : defaultFormState());
  }, [open, isEdit, initialForm]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, isSubmitting]);

  if (!open) return null;

  const showOutcome = callStatusRequiresOutcome(form.status);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-application-call-title"
        className="flex max-h-[min(90vh,720px)] w-full max-w-[520px] flex-col overflow-hidden rounded-[12px] border border-[#e0deda] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#ece9e4] px-6 py-5">
          <h2
            id="log-application-call-title"
            className="font-[family-name:var(--font-dm-serif)] text-[20px] font-semibold text-[#1a1a1a]"
          >
            {isEdit ? "Edit call" : "Log call"}
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
              <label htmlFor="log-call-student" className={labelClassName}>
                Student
              </label>
              <input
                id="log-call-student"
                type="text"
                readOnly
                value={studentName}
                className={`${inputClassName} bg-[#faf9f4] text-[#4a4a4a]`}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="log-call-type" className={labelClassName}>
                  Call type
                </label>
                <select
                  id="log-call-type"
                  value={form.callType}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      callType: event.target.value as ApplicationCallType,
                    }))
                  }
                  className={selectClassName}
                  style={{ backgroundImage: SELECT_CHEVRON }}
                >
                  {APPLICATION_CALL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {APPLICATION_CALL_TYPE_LABEL[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="log-call-duration" className={labelClassName}>
                  Duration (min)
                </label>
                <input
                  id="log-call-duration"
                  type="number"
                  min={1}
                  step={1}
                  disabled={isSubmitting}
                  value={form.durationMinutes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, durationMinutes: event.target.value }))
                  }
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="log-call-date" className={labelClassName}>
                  Date
                </label>
                <input
                  id="log-call-date"
                  type="date"
                  disabled={isSubmitting}
                  value={form.callDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, callDate: event.target.value }))
                  }
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="log-call-status" className={labelClassName}>
                  Status
                </label>
                <select
                  id="log-call-status"
                  value={form.status}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    setForm((prev) => {
                      const status = event.target.value as ApplicationCallStatus;
                      return {
                        ...prev,
                        status,
                        outcome: callStatusRequiresOutcome(status) ? prev.outcome : "",
                      };
                    })
                  }
                  className={selectClassName}
                  style={{ backgroundImage: SELECT_CHEVRON }}
                >
                  {APPLICATION_CALL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {APPLICATION_CALL_STATUS_LABEL[status]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {showOutcome ? (
              <div>
                <label htmlFor="log-call-outcome" className={labelClassName}>
                  Outcome
                </label>
                <select
                  id="log-call-outcome"
                  value={form.outcome}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      outcome: event.target.value as ApplicationCallOutcome,
                    }))
                  }
                  className={selectClassName}
                  style={{ backgroundImage: SELECT_CHEVRON }}
                >
                  <option value="">Select outcome…</option>
                  {APPLICATION_CALL_OUTCOMES.map((outcome) => (
                    <option key={outcome} value={outcome}>
                      {APPLICATION_CALL_OUTCOME_LABEL[outcome]}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <label htmlFor="log-call-summary" className={labelClassName}>
                Brief summary
              </label>
              <textarea
                id="log-call-summary"
                rows={4}
                disabled={isSubmitting}
                value={form.summary}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, summary: event.target.value }))
                }
                placeholder="What was covered? Any decisions or follow-ups?"
                className={`${inputClassName} resize-y`}
              />
            </div>

            {!isEdit ? (
            <div className="rounded-[10px] border border-[#ece9e4] bg-[#faf9f4] px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold text-[#1a1a1a]">
                    Create follow-up task
                  </div>
                  <div className="mt-0.5 text-[12px] text-[#7a7a7a]">
                    Auto-add a task tied to this call
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.createFollowUpTask}
                  disabled={isSubmitting}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      createFollowUpTask: !prev.createFollowUpTask,
                    }))
                  }
                  className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors disabled:opacity-60 ${
                    form.createFollowUpTask ? "bg-[var(--green)]" : "bg-[#d8d6d0]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      form.createFollowUpTask ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {form.createFollowUpTask ? (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="log-call-task-title" className={labelClassName}>
                      Task name
                    </label>
                    <input
                      id="log-call-task-title"
                      type="text"
                      disabled={isSubmitting}
                      value={form.followUpTaskTitle}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          followUpTaskTitle: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label htmlFor="log-call-task-due" className={labelClassName}>
                      Due date
                    </label>
                    <input
                      id="log-call-task-due"
                      type="date"
                      disabled={isSubmitting}
                      value={form.followUpTaskDueDate}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          followUpTaskDueDate: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </div>
                </div>
              ) : null}
            </div>
            ) : null}

            {error ? (
              <p className="text-[12px] font-medium text-[#8c2d22]">{error}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-[#ece9e4] px-6 py-4">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[13px] font-semibold text-[#4a4a4a] transition-colors hover:border-[#40916C] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Log call"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
