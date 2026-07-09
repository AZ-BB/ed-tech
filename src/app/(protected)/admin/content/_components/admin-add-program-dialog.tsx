"use client";

import { createAdminProgramDiscovery } from "@/actions/admin-programs-discovery";
import { getAdminProgramDiscoveryDetailHref } from "../_lib/admin-program-detail-href";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminProgramFormFields } from "./admin-program-form-fields";

type AdminAddProgramDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AdminAddProgramDialog({ open, onClose }: AdminAddProgramDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

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
    const result = await createAdminProgramDiscovery(formData);

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    onClose();
    router.push(getAdminProgramDiscoveryDetailHref(result.programId));
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
      >
        <h2 className="text-[18px] font-semibold text-[#1a1a1a]">Add Program</h2>
        <p className="mt-1 text-[13px] text-[#666]">
          Create a program shell. Use bulk import to load full JSON sections.
        </p>

        <form key={formKey} className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <AdminProgramFormFields />
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
              {isSubmitting ? "Creating…" : "Create Program"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
