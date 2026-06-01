"use client";

import {
  updateAdminAdvisorSessionDetails,
  updateAdminAmbassadorSessionDetails,
} from "@/actions/admin-sessions";
import { COUNTRIES } from "@/lib/countries";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AdminSessionDetailPayload } from "../../../../_lib/fetch-admin-session-detail";

const ADVISOR_STAGES = [
  "Just exploring",
  "Shortlisting universities",
  "Preparing application",
  "Ready to apply",
] as const;

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const selectClassName =
  "w-full cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_12px_center] bg-no-repeat px-3 py-2 pr-9 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type AdminEditSessionDialogProps = {
  open: boolean;
  onClose: () => void;
  payload: AdminSessionDetailPayload;
};

export function AdminEditSessionDialog({
  open,
  onClose,
  payload,
}: AdminEditSessionDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const { session, provider, student } = payload;
  const isAdvisor = session.kind === "advisor";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = isAdvisor
      ? await updateAdminAdvisorSessionDetails(formData)
      : await updateAdminAmbassadorSessionDetails(formData);

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="edit-session-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[12px] border border-[#ece9e4] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ece9e4] px-5 py-4">
          <h2 id="edit-session-title" className="text-[16px] font-bold text-[#1a1a1a]">
            Edit session details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-[6px] px-2 py-1 text-[#a0a0a0] hover:bg-[#f3f2f0] hover:text-[#1a1a1a]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4">
          <input type="hidden" name="sessionId" value={session.id} />

          {error ? (
            <p className="mb-4 rounded-[8px] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
              {error}
            </p>
          ) : null}

          <div className="mb-4 rounded-[8px] border border-[#ece9e4] bg-[#fafaf8] px-3 py-2.5 text-[12px] text-[#6a6a6a]">
            <p>
              <span className="font-semibold text-[#4a4a4a]">Student:</span>{" "}
              {student.fullName} (not editable)
            </p>
            <p className="mt-1">
              <span className="font-semibold text-[#4a4a4a]">
                {isAdvisor ? "Advisor" : "Ambassador"}:
              </span>{" "}
              {provider.fullName} (not editable)
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="edit-session-student-name" className={labelClassName}>
              Contact name on session
            </label>
            <input
              id="edit-session-student-name"
              name="studentName"
              type="text"
              required
              defaultValue={session.studentName}
              className={inputClassName}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="edit-session-student-email" className={labelClassName}>
              Contact email on session
            </label>
            <input
              id="edit-session-student-email"
              name="studentEmail"
              type="email"
              required
              defaultValue={session.studentEmail ?? ""}
              className={inputClassName}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="edit-session-student-phone" className={labelClassName}>
              Contact phone on session
            </label>
            <input
              id="edit-session-student-phone"
              name="studentPhone"
              type="tel"
              required
              defaultValue={session.studentPhone ?? ""}
              className={inputClassName}
            />
          </div>

          {isAdvisor ? (
            <>
              <div className="mb-4">
                <label htmlFor="edit-session-destination" className={labelClassName}>
                  Destination country
                </label>
                <select
                  id="edit-session-destination"
                  name="destinationCountryCode"
                  required
                  defaultValue={session.destinationCountryCode}
                  className={selectClassName}
                  style={{ backgroundImage: SELECT_CHEVRON }}
                >
                  {COUNTRIES.map((country) => (
                    <option key={country.alpha2} value={country.alpha2}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="edit-session-stage" className={labelClassName}>
                  Current stage
                </label>
                <select
                  id="edit-session-stage"
                  name="currentStage"
                  required
                  defaultValue={session.currentStage}
                  className={selectClassName}
                  style={{ backgroundImage: SELECT_CHEVRON }}
                >
                  {!ADVISOR_STAGES.includes(
                    session.currentStage as (typeof ADVISOR_STAGES)[number],
                  ) ? (
                    <option value={session.currentStage}>{session.currentStage}</option>
                  ) : null}
                  {ADVISOR_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="edit-session-specific-uni" className={labelClassName}>
                  Specific universities
                </label>
                <textarea
                  id="edit-session-specific-uni"
                  name="specificUni"
                  rows={2}
                  defaultValue={session.specificUni ?? ""}
                  className={`${inputClassName} resize-y`}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="edit-session-help-with" className={labelClassName}>
                  Help with
                </label>
                <textarea
                  id="edit-session-help-with"
                  name="helpWith"
                  rows={3}
                  defaultValue={session.helpWith ?? ""}
                  className={`${inputClassName} resize-y`}
                />
              </div>

              <div className="mb-5">
                <label htmlFor="edit-session-booked-at" className={labelClassName}>
                  Booked at
                </label>
                <input
                  id="edit-session-booked-at"
                  name="bookedAt"
                  type="datetime-local"
                  defaultValue={toDatetimeLocalValue(session.bookedAt)}
                  className={inputClassName}
                />
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label htmlFor="edit-session-pref-1" className={labelClassName}>
                  Preferred time 1
                </label>
                <input
                  id="edit-session-pref-1"
                  name="prefTime1"
                  type="datetime-local"
                  required
                  defaultValue={toDatetimeLocalValue(session.prefTime1)}
                  className={inputClassName}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="edit-session-pref-2" className={labelClassName}>
                  Preferred time 2
                </label>
                <input
                  id="edit-session-pref-2"
                  name="prefTime2"
                  type="datetime-local"
                  defaultValue={toDatetimeLocalValue(session.prefTime2)}
                  className={inputClassName}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="edit-session-pref-3" className={labelClassName}>
                  Preferred time 3
                </label>
                <input
                  id="edit-session-pref-3"
                  name="prefTime3"
                  type="datetime-local"
                  defaultValue={toDatetimeLocalValue(session.prefTime3)}
                  className={inputClassName}
                />
              </div>

              <div className="mb-5">
                <label htmlFor="edit-session-topics" className={labelClassName}>
                  Discussion topics
                </label>
                <textarea
                  id="edit-session-topics"
                  name="discussionTopics"
                  rows={4}
                  defaultValue={session.discussionTopics ?? ""}
                  className={`${inputClassName} resize-y`}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 border-t border-[#ece9e4] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
