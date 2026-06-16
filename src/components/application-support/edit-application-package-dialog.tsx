"use client";

import { useEffect, useState } from "react";

type EditApplicationPackageDialogProps = {
  open: boolean;
  planName: string;
  universitiesTotal: number;
  defaultUniversitiesCount: number;
  minUniversities: number;
  onClose: () => void;
  onSubmit: (universitiesTotal: number) => void;
  isSubmitting: boolean;
  error: string | null;
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C] disabled:opacity-60";

export function EditApplicationPackageDialog({
  open,
  planName,
  universitiesTotal,
  defaultUniversitiesCount,
  minUniversities,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: EditApplicationPackageDialogProps) {
  const [value, setValue] = useState(String(universitiesTotal));

  useEffect(() => {
    if (!open) return;
    setValue(String(universitiesTotal));
  }, [open, universitiesTotal]);

  if (!open) return null;

  const parsed = Number.parseInt(value, 10);
  const isValid =
    Number.isFinite(parsed) && parsed >= Math.max(1, minUniversities);
  const isOverridden = universitiesTotal !== defaultUniversitiesCount;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) return;
    onSubmit(parsed);
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(15,30,20,0.45)] p-4"
      role="presentation"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-package-title"
        className="w-full max-w-[420px] rounded-[12px] border border-[#ece9e4] bg-white p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h3
          id="edit-package-title"
          className="text-[15px] font-semibold text-[var(--text)]"
        >
          Edit package
        </h3>
        <p className="mt-1 text-[12px] text-[var(--text-light)]">
          Change how many universities are included in this application&apos;s package.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <div className="mb-1.5 text-[12px] font-semibold text-[#4a4a4a]">Plan</div>
            <div className="rounded-[8px] border border-[#ece9e4] bg-[#faf9f7] px-3 py-2 text-[13px] text-[var(--text)]">
              {planName}
            </div>
            {isOverridden ? (
              <p className="mt-1.5 text-[11.5px] text-[var(--text-light)]">
                Plan default: {defaultUniversitiesCount} universities
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="edit-package-universities"
              className="mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]"
            >
              Universities included
            </label>
            <input
              id="edit-package-universities"
              type="number"
              min={Math.max(1, minUniversities)}
              step={1}
              required
              disabled={isSubmitting}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className={inputClassName}
            />
            {minUniversities > 0 ? (
              <p className="mt-1.5 text-[11.5px] text-[var(--text-light)]">
                Minimum {minUniversities} — that many universities are already on this
                application.
              </p>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-[8px] border border-[#f0c4c4] bg-[#FCEBEB] px-3 py-2 text-[12.5px] text-[#8c2d22]">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-[7px] text-[12px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-4 py-[7px] text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
