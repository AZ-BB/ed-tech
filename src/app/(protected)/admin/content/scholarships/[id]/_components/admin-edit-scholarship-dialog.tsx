"use client";

import { updateAdminScholarship } from "@/actions/admin-scholarships";
import { AdminScholarshipFormFields } from "@/app/(protected)/admin/content/_components/admin-scholarship-form-fields";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AdminScholarshipDetailPayload } from "../_lib/fetch-admin-scholarship-detail";

type AdminEditScholarshipDialogProps = {
  open: boolean;
  onClose: () => void;
  payload: AdminScholarshipDetailPayload;
};

export function AdminEditScholarshipDialog({
  open,
  onClose,
  payload,
}: AdminEditScholarshipDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await updateAdminScholarship(formData);

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="edit-scholarship-title"
        className="flex max-h-[90vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#ece9e4] px-5 py-4">
          <h2 id="edit-scholarship-title" className="text-[16px] font-bold text-[#1a1a1a]">
            Edit Scholarship
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer rounded-[6px] px-2 py-1 text-[#a0a0a0] hover:bg-[#f3f2f0] hover:text-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <AdminScholarshipFormFields
              countries={payload.countries}
              initial={payload.scholarship}
              scholarshipId={payload.scholarship.id}
              disabled={isSubmitting}
            />
          </div>

          <div className="shrink-0 border-t border-[#ece9e4] bg-white px-5 py-4">
            {error ? (
              <p className="mb-3 text-[13px] font-medium text-[#c1121f]" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-[7px] text-[12px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-[7px] text-[12px] font-semibold text-white hover:bg-[#1B4332] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
