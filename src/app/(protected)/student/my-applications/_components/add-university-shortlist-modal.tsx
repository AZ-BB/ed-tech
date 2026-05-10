"use client";

import { useEffect, useState } from "react";

import { APPLICATION_METHOD_OPTIONS } from "../_lib/my-applications-defaults";

import { ModalVeil } from "./modal-veil";

const fieldClass =
  "rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 text-[13px] text-[var(--text)] outline-none focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.07)]";
const labelClass = "text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-mid)]";

export type AddUniversityShortlistForm = {
  university_name: string;
  country: string;
  major_program: string;
  application_method: string;
  application_deadline: string;
};

const emptyForm: AddUniversityShortlistForm = {
  university_name: "",
  country: "",
  major_program: "",
  application_method: "",
  application_deadline: "",
};

export function AddUniversityShortlistModal({
  open,
  onClose,
  countries,
  onAdd,
  onInvalid,
  submitLabel = "Add to shortlist",
}: {
  open: boolean;
  onClose: () => void;
  countries: { id: string; name: string }[];
  onAdd: (form: AddUniversityShortlistForm) => void | Promise<void>;
  onInvalid?: () => void;
  submitLabel?: string;
}) {
  const [form, setForm] = useState<AddUniversityShortlistForm>(emptyForm);

  useEffect(() => {
    if (!open) setForm(emptyForm);
  }, [open]);

  function handleClose() {
    setForm(emptyForm);
    onClose();
  }

  async function submit() {
    if (
      !form.university_name.trim() ||
      !form.country ||
      !form.major_program.trim() ||
      !form.application_method
    ) {
      onInvalid?.();
      return;
    }
    await onAdd({
      university_name: form.university_name.trim(),
      country: form.country,
      major_program: form.major_program.trim(),
      application_method: form.application_method,
      application_deadline: form.application_deadline,
    });
  }

  if (!open) return null;

  return (
    <ModalVeil onClose={handleClose} title="Add a university">
      <div className="flex flex-col gap-3.5">
        <div>
          <label className={labelClass}>University name</label>
          <input
            className={`${fieldClass} mt-1.5 w-full`}
            value={form.university_name}
            onChange={(e) => setForm((f) => ({ ...f, university_name: e.target.value }))}
            placeholder="e.g. University of Edinburgh"
          />
        </div>
        <div>
          <label className={labelClass}>University location</label>
          <select
            className={`${fieldClass} mt-1.5 w-full`}
            value={form.country}
            onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
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
            value={form.major_program}
            onChange={(e) => setForm((f) => ({ ...f, major_program: e.target.value }))}
            placeholder="e.g. BSc Finance"
          />
        </div>
        <div>
          <label className={labelClass}>How do you apply?</label>
          <select
            className={`${fieldClass} mt-1.5 w-full`}
            value={form.application_method}
            onChange={(e) => setForm((f) => ({ ...f, application_method: e.target.value }))}
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
            value={form.application_deadline}
            onChange={(e) => setForm((f) => ({ ...f, application_deadline: e.target.value }))}
          />
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-[var(--border-light)] bg-[var(--cream)] px-[22px] py-3.5 -mx-[22px] -mb-[18px] rounded-b-[14px]">
        <button
          type="button"
          className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)]"
          onClick={handleClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-lg border border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[var(--green-dark)]"
          onClick={() => void submit()}
        >
          {submitLabel}
        </button>
      </div>
    </ModalVeil>
  );
}
