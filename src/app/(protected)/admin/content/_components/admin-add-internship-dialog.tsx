"use client";

import {
  createAdminInternship,
  fetchAdminInternshipFormCountries,
  type AdminCountryOption,
} from "@/actions/admin-internships";
import { getAdminInternshipDetailHref } from "../_lib/admin-internship-detail-href";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminInternshipFormFields } from "./admin-internship-form-fields";

type AdminAddInternshipDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AdminAddInternshipDialog({
  open,
  onClose,
}: AdminAddInternshipDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [countries, setCountries] = useState<AdminCountryOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsLoadingCountries(true);
    setError(null);

    void fetchAdminInternshipFormCountries().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setCountries([]);
      } else {
        setCountries(result.countries);
      }
      setIsLoadingCountries(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setFormKey((k) => k + 1);
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await createAdminInternship(formData);

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    onClose();
    router.push(getAdminInternshipDetailHref(result.internshipId));
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
        aria-labelledby="add-internship-title"
        className="flex max-h-[90vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#ece9e4] px-5 py-4">
          <h2
            id="add-internship-title"
            className="text-[16px] font-bold text-[#1a1a1a]"
          >
            Add Internship
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

        <form
          key={formKey}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {isLoadingCountries ? (
              <p className="text-[13px] text-[#a0a0a0]">Loading countries…</p>
            ) : (
              <AdminInternshipFormFields
                countries={countries}
                disabled={isSubmitting}
              />
            )}
          </div>

          <div className="shrink-0 border-t border-[#ece9e4] bg-white px-5 py-4">
            {error ? (
              <p
                className="mb-3 text-[13px] font-medium text-[#c1121f]"
                role="alert"
              >
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
                disabled={isSubmitting || isLoadingCountries}
                className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-[7px] text-[12px] font-semibold text-white hover:bg-[#1B4332] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Adding…" : "Add Internship"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
