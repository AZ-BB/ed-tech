"use client";

import {
  createAdminWebinar,
  getAdminAdvisorOptionsForForm,
} from "@/actions/admin-webinars";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { AdminAdvisorOption } from "../_lib/fetch-admin-webinars-page";
import { AdminWebinarFormFields } from "./admin-webinar-form-fields";

type AdminAddWebinarDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AdminAddWebinarDialog({ open, onClose }: AdminAddWebinarDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [advisors, setAdvisors] = useState<AdminAdvisorOption[]>([]);
  const [agendaItems, setAgendaItems] = useState<string[]>([""]);

  useEffect(() => {
    if (!open) return;
    setFormKey((k) => k + 1);
    setError(null);
    setAgendaItems([""]);
    void getAdminAdvisorOptionsForForm().then(setAdvisors);
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await createAdminWebinar(formData);

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
        aria-labelledby="add-webinar-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[12px] border border-[#ece9e4] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ece9e4] px-5 py-4">
          <h2 id="add-webinar-title" className="text-[16px] font-bold text-[#1a1a1a]">
            Add Webinar
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

        <form key={formKey} onSubmit={handleSubmit} className="px-5 py-4">
          {error ? (
            <p className="mb-4 rounded-[8px] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
              {error}
            </p>
          ) : null}

          <AdminWebinarFormFields
            advisors={advisors}
            agendaItems={agendaItems}
            onAgendaChange={setAgendaItems}
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#1B4332] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating…" : "Create Webinar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
