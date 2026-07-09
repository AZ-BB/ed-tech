"use client";

import { updateAdminProgramDiscovery } from "@/actions/admin-programs-discovery";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AdminProgramFormFields,
  type AdminProgramFormValues,
} from "./admin-program-form-fields";

type AdminEditProgramDialogProps = {
  open: boolean;
  onClose: () => void;
  programId: string;
  values: AdminProgramFormValues;
};

export function AdminEditProgramDialog({
  open,
  onClose,
  programId,
  values,
}: AdminEditProgramDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("program_id", programId);
    const result = await updateAdminProgramDiscovery(formData);

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
        className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
      >
        <h2 className="text-[18px] font-semibold text-[#1a1a1a]">Edit Program</h2>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <AdminProgramFormFields
            values={values}
            slugReadOnly
            showJsonSections
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
