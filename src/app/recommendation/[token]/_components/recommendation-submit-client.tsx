"use client";

import type { RecommendationSubmitContext } from "@/actions/recommendation-requests";
import { submitRecommendationByToken } from "@/actions/recommendation-requests";
import { useState } from "react";

const fieldClass =
  "rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 text-[13px] text-[var(--text)] outline-none focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.07)]";
const labelClass =
  "text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-mid)]";

function formatDeadline(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Props = {
  token: string;
  context: RecommendationSubmitContext;
};

export function RecommendationSubmitClient({ token, context }: Props) {
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(context.alreadySubmitted);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted) return;
    if (!file) {
      setError("Please upload a recommendation letter (PDF, DOC, or DOCX).");
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("letter", file);
    if (notes.trim()) {
      formData.set("notes", notes.trim());
    }

    const res = await submitRecommendationByToken(token, formData);
    setSubmitting(false);

    if ("error" in res) {
      setError(res.error);
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="rounded-[14px] border border-[var(--border-light)] bg-white px-6 py-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--green-bg)] text-[var(--green)]">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">
          Thank you!
        </h2>
        <p className="mt-2 text-sm text-[var(--text-mid)]">
          Your recommendation for {context.studentName} has been submitted
          successfully.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-[var(--border-light)] bg-white px-6 py-6 sm:px-8 sm:py-8">
      <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">
        Hi {context.teacherName}
      </h1>
      <p className="mt-2 text-sm text-[var(--text-mid)]">
        {context.studentName} has requested a recommendation letter from you.
        Please upload the letter below — no account is required.
      </p>

      <div className="mt-5 rounded-[10px] border border-[var(--border-light)] bg-[var(--cream)] px-4 py-3.5">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-light)]">
              Student
            </dt>
            <dd className="mt-0.5 font-medium text-[var(--text)]">
              {context.studentName}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-light)]">
              School
            </dt>
            <dd className="mt-0.5 font-medium text-[var(--text)]">
              {context.schoolName}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-light)]">
              Grade
            </dt>
            <dd className="mt-0.5 font-medium text-[var(--text)]">
              {context.grade}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-light)]">
              Application
            </dt>
            <dd className="mt-0.5 font-medium text-[var(--text)]">
              {context.forApplication}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-light)]">
              Needed by
            </dt>
            <dd className="mt-0.5 font-medium text-[var(--text)]">
              {formatDeadline(context.neededBy)}
            </dd>
          </div>
          {context.personalNote ? (
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-light)]">
                Note from student
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-[var(--text-mid)]">
                {context.personalNote}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <form className="mt-6 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
        <div>
          <label className={labelClass} htmlFor="rec-letter">
            Recommendation letter
          </label>
          <input
            id="rec-letter"
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className={`${fieldClass} mt-1.5 block w-full file:mr-3 file:rounded-md file:border-0 file:bg-[var(--green-bg)] file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-[var(--green-dark)]`}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
            }}
          />
          <p className="mt-1 text-[11.5px] text-[var(--text-light)]">
            PDF, DOC, or DOCX
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor="rec-notes">
            Notes
          </label>
          <textarea
            id="rec-notes"
            className={`${fieldClass} mt-1.5 min-h-[100px] w-full resize-y`}
            placeholder="Optional notes for the student or counselor"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error ? (
          <p className="text-sm text-[var(--red)]" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg border border-[var(--green)] bg-[var(--green)] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--green-dark)] disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit recommendation"}
        </button>
      </form>
    </div>
  );
}
