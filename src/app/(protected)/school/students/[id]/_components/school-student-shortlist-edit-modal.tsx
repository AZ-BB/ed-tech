"use client";

import { ModalVeil } from "@/app/(protected)/student/my-applications/_components/modal-veil";
import {
  APPLICATION_METHOD_OPTIONS,
  UNIVERSITY_APPLICATION_STATUSES,
  UNIVERSITY_DECISIONS,
} from "@/app/(protected)/student/my-applications/_lib/my-applications-defaults";
import {
  UNIVERSITY_DECISION_LABEL,
  UNIVERSITY_STATUS_LABEL,
} from "@/app/(protected)/student/my-applications/_lib/my-applications-university-labels";
import {
  SHORTLIST_DOCS_STATUSES,
  SHORTLIST_DOCS_STATUS_LABEL,
  SHORTLIST_ESSAY_STATUSES,
  SHORTLIST_ESSAY_STATUS_LABEL,
} from "@/app/(protected)/student/my-applications/_lib/shortlist-docs-essay-status";
import type { Database } from "@/database.types";
import { useEffect, useState } from "react";

type ShortlistRow =
  Database["public"]["Tables"]["student_shortlist_universities"]["Row"];

const fieldClass =
  "rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 text-[13px] text-[var(--text)] outline-none focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.07)]";
const labelClass =
  "text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-mid)]";

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const s = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

export function SchoolStudentShortlistEditModal({
  open,
  row,
  countries,
  onClose,
  onSave,
  onRemove,
  onInvalid,
}: {
  open: boolean;
  row: ShortlistRow | null;
  countries: { id: string; name: string }[];
  onClose: () => void;
  onSave: (patch: {
    university_name: string;
    country: string;
    major_program: string;
    application_method: string;
    application_deadline: string | null;
    status: string;
    decision: string | null;
    docs_status: string;
    essay_status: string;
  }) => void | Promise<void>;
  onRemove: () => void | Promise<void>;
  onInvalid?: () => void;
}) {
  const [university_name, setUniversityName] = useState("");
  const [country, setCountry] = useState("");
  const [major_program, setMajorProgram] = useState("");
  const [application_method, setApplicationMethod] = useState("");
  const [application_deadline, setApplicationDeadline] = useState("");
  const [status, setStatus] = useState("");
  const [decision, setDecision] = useState("");
  const [docs_status, setDocsStatus] = useState("not_completed");
  const [essay_status, setEssayStatus] = useState("not_reviewed");

  useEffect(() => {
    if (!open || !row) return;
    setUniversityName(row.university_name);
    setCountry(row.country ?? "");
    setMajorProgram(row.major_program ?? "");
    setApplicationMethod(row.application_method ?? "");
    setApplicationDeadline(toDateInput(row.application_deadline));
    setStatus(row.status);
    setDecision(row.decision ?? "");
    const d = row.docs_status;
    const e = row.essay_status;
    setDocsStatus(
      d === "completed" || d === "not_completed" ? d : "not_completed",
    );
    setEssayStatus(
      e === "approved" || e === "not_reviewed" ? e : "not_reviewed",
    );
  }, [open, row]);

  function handleClose() {
    onClose();
  }

  async function submit() {
    if (!row) return;
    if (
      !university_name.trim() ||
      !country ||
      !major_program.trim() ||
      !application_method
    ) {
      onInvalid?.();
      return;
    }
    await onSave({
      university_name: university_name.trim(),
      country,
      major_program: major_program.trim(),
      application_method,
      application_deadline: application_deadline || null,
      status,
      decision: decision || null,
      docs_status,
      essay_status,
    });
  }

  if (!open || !row) return null;

  return (
    <ModalVeil title="Edit university" onClose={handleClose}>
      <div className="flex flex-col gap-3.5">
        <div>
          <label className={labelClass}>University name</label>
          <input
            className={`${fieldClass} mt-1.5 w-full`}
            value={university_name}
            onChange={(e) => setUniversityName(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>University location</label>
          <select
            className={`${fieldClass} mt-1.5 w-full`}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="">Select country…</option>
            {countries.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Major / program</label>
          <input
            className={`${fieldClass} mt-1.5 w-full`}
            value={major_program}
            onChange={(e) => setMajorProgram(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>How do you apply?</label>
          <select
            className={`${fieldClass} mt-1.5 w-full`}
            value={application_method}
            onChange={(e) => setApplicationMethod(e.target.value)}
          >
            <option value="">Select application system…</option>
            {APPLICATION_METHOD_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Deadline (optional)</label>
          <input
            type="date"
            className={`${fieldClass} mt-1.5 w-full`}
            value={application_deadline}
            onChange={(e) => setApplicationDeadline(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Application status</label>
          <select
            className={`${fieldClass} mt-1.5 w-full`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {UNIVERSITY_APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {UNIVERSITY_STATUS_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Decision</label>
          <select
            className={`${fieldClass} mt-1.5 w-full`}
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
          >
            {UNIVERSITY_DECISIONS.map((d) => (
              <option key={d || "none"} value={d}>
                {UNIVERSITY_DECISION_LABEL[d] ?? d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Docs</label>
          <select
            className={`${fieldClass} mt-1.5 w-full`}
            value={docs_status}
            onChange={(e) => setDocsStatus(e.target.value)}
          >
            {SHORTLIST_DOCS_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SHORTLIST_DOCS_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Essay</label>
          <select
            className={`${fieldClass} mt-1.5 w-full`}
            value={essay_status}
            onChange={(e) => setEssayStatus(e.target.value)}
          >
            {SHORTLIST_ESSAY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SHORTLIST_ESSAY_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2 border-t border-[var(--border-light)] bg-[var(--cream)] px-[22px] py-3.5 -mx-[22px] -mb-[18px] rounded-b-[14px]">
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-[8px] border border-[var(--border)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)]"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-[8px] border border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[var(--green-dark)]"
            onClick={() => void submit()}
          >
            Save
          </button>
        </div>
        <div className="flex justify-end border-t border-[var(--border-light)] pt-2.5">
          <button
            type="button"
            className="rounded-[8px] border border-[var(--border)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[var(--red)] hover:border-[#f0c4c4] hover:bg-[#FCEBEB]"
            onClick={() => void onRemove()}
          >
            Remove from shortlist
          </button>
        </div>
      </div>
    </ModalVeil>
  );
}
