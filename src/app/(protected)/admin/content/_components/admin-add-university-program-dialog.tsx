"use client";

import {
  createAdminUniversityProgram,
  getAdminUniversityProgramFormOptions,
} from "@/actions/admin-university-programs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type {
  AdminProgramDiscoveryOption,
  AdminUniversityOption,
} from "../_lib/fetch-admin-university-programs-page";
import { AdminUniversityProgramFormFields } from "./admin-university-program-form-fields";

type AdminAddUniversityProgramDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AdminAddUniversityProgramDialog({
  open,
  onClose,
}: AdminAddUniversityProgramDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [universityOptions, setUniversityOptions] = useState<AdminUniversityOption[]>([]);
  const [programOptions, setProgramOptions] = useState<AdminProgramDiscoveryOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsLoadingOptions(true);
    setError(null);

    void getAdminUniversityProgramFormOptions().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setUniversityOptions([]);
        setProgramOptions([]);
      } else {
        setUniversityOptions(result.universities);
        setProgramOptions(result.programs);
      }
      setIsLoadingOptions(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setFormKey((key) => key + 1);
    setError(null);
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await createAdminUniversityProgram(formData);

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
      >
        <h2 className="text-[18px] font-semibold text-[#1a1a1a]">
          Add University Program Link
        </h2>
        <p className="mt-1 text-[13px] text-[#666]">
          Connect a university to a program discovery entry with per-university notes.
        </p>

        <form key={formKey} className="mt-5 space-y-4" onSubmit={handleSubmit}>
          {isLoadingOptions ? (
            <p className="text-[13px] text-[#666]">Loading options…</p>
          ) : (
            <AdminUniversityProgramFormFields
              universityOptions={universityOptions}
              programOptions={programOptions}
              disabled={isSubmitting}
            />
          )}
          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingOptions}
              className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Creating…" : "Create Link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
