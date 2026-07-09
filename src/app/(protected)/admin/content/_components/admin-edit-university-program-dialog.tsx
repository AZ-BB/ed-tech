"use client";

import { updateAdminUniversityProgram } from "@/actions/admin-university-programs";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AdminUniversityProgramTableRow } from "../_lib/fetch-admin-university-programs-page";
import { AdminUniversityProgramNoteFields } from "./admin-university-program-form-fields";

type AdminEditUniversityProgramDialogProps = {
  open: boolean;
  row: AdminUniversityProgramTableRow | null;
  onClose: () => void;
};

export function AdminEditUniversityProgramDialog({
  open,
  row,
  onClose,
}: AdminEditUniversityProgramDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !row) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("id", row!.id);
    const result = await updateAdminUniversityProgram(formData);

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
          Edit University Program Link
        </h2>
        <div className="mt-3 rounded-[8px] border border-[#ece9e4] bg-[#faf9f7] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
            University
          </p>
          <p className="mt-0.5 text-[14px] font-medium text-[#1a1a1a]">{row.universityName}</p>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
            Program
          </p>
          <p className="mt-0.5 text-[14px] font-medium text-[#1a1a1a]">{row.programTitle}</p>
          <p className="font-mono text-[11px] text-[#a0a0a0]">{row.programSlug}</p>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <AdminUniversityProgramNoteFields
            disabled={isSubmitting}
            values={{
              rankingNote: row.rankingNote ?? "",
              tuitionNote: row.tuitionNote ?? "",
              shortDescription: row.shortDescription ?? "",
              programSchoolNote: row.programSchoolNote ?? "",
              featured: row.featured,
            }}
          />
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
              disabled={isSubmitting}
              className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
