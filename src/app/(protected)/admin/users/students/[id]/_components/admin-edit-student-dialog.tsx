"use client";

import {
  fetchAdminStudentFormCountries,
  updateAdminStudentProfile,
  type AdminCountryOption,
} from "@/actions/admin-students";
import { GRADE_FILTER_OPTIONS } from "@/lib/school-portal-destination-options";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type AdminEditStudentDialogProps = {
  open: boolean;
  studentId: string;
  defaults: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    grade: string;
    nationalityCountryCode: string;
  };
  onClose: () => void;
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

export function AdminEditStudentDialog({
  open,
  studentId,
  defaults,
  onClose,
}: AdminEditStudentDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [countries, setCountries] = useState<AdminCountryOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsLoadingCountries(true);
    setError(null);
    setSuccess(false);

    void fetchAdminStudentFormCountries().then((result) => {
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

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(form);
    const result = await updateAdminStudentProfile(studentId, formData);

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setSuccess(true);
    setIsSubmitting(false);
    router.refresh();
  }

  function handleClose() {
    setError(null);
    setSuccess(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-edit-student-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="admin-edit-student-title" className="text-[18px] font-semibold text-[#1a1a1a]">
          Edit student
        </h2>
        <p className="mt-2 text-[13px] text-[#666]">
          Update basic profile information. Email and school assignment cannot be changed here.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-student-first-name" className={labelClassName}>
                First name
              </label>
              <input
                id="edit-student-first-name"
                name="firstName"
                type="text"
                required
                defaultValue={defaults.firstName}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="edit-student-last-name" className={labelClassName}>
                Last name
              </label>
              <input
                id="edit-student-last-name"
                name="lastName"
                type="text"
                required
                defaultValue={defaults.lastName}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-student-email" className={labelClassName}>
              Email
            </label>
            <input
              id="edit-student-email"
              type="email"
              readOnly
              value={defaults.email}
              className={`${inputClassName} cursor-not-allowed bg-[#faf9f4] text-[#7a7a7a]`}
            />
          </div>

          <div>
            <label htmlFor="edit-student-phone" className={labelClassName}>
              Phone
            </label>
            <input
              id="edit-student-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue={defaults.phone}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="edit-student-grade" className={labelClassName}>
              Grade
            </label>
            <select
              id="edit-student-grade"
              name="grade"
              required
              defaultValue={defaults.grade}
              className={`${inputClassName} cursor-pointer`}
            >
              <option value="">Select grade</option>
              {GRADE_FILTER_OPTIONS.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-student-nationality" className={labelClassName}>
              Nationality
            </label>
            <select
              id="edit-student-nationality"
              name="nationalityCountryCode"
              required
              disabled={isLoadingCountries || isSubmitting}
              defaultValue={defaults.nationalityCountryCode}
              className={`${inputClassName} cursor-pointer disabled:opacity-60`}
            >
              <option value="">
                {isLoadingCountries ? "Loading countries…" : "Select country"}
              </option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
          {success ? (
            <p className="text-[13px] text-[#2D6A4F]">Student updated successfully.</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a]"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingCountries}
              className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
