"use client";

import { createAdminSchool, fetchAdminSchoolFormCountries } from "@/actions/admin-schools";
import { fetchAdminSchoolFormDefaults } from "@/actions/admin-settings";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminAddSchoolDialogProps = {
  open: boolean;
  onClose: () => void;
};

type CountryOption = {
  id: string;
  name: string;
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

export function AdminAddSchoolDialog({ open, onClose }: AdminAddSchoolDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [defaultAdvisorCreditLimit, setDefaultAdvisorCreditLimit] = useState<number | null>(null);
  const [defaultAmbassadorCreditLimit, setDefaultAmbassadorCreditLimit] = useState<number | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsLoadingCountries(true);
    setIsLoadingDefaults(true);
    setError(null);

    void Promise.all([fetchAdminSchoolFormCountries(), fetchAdminSchoolFormDefaults()]).then(
      ([countriesResult, defaultsResult]) => {
        if (cancelled) return;

        if (!countriesResult.ok) {
          setError(countriesResult.error);
          setCountries([]);
        } else {
          setCountries(countriesResult.countries);
        }
        setIsLoadingCountries(false);

        if (!defaultsResult.ok) {
          setError((prev) => prev ?? defaultsResult.error);
          setDefaultAdvisorCreditLimit(null);
          setDefaultAmbassadorCreditLimit(null);
        } else {
          setDefaultAdvisorCreditLimit(defaultsResult.defaultAdvisorCreditLimit);
          setDefaultAmbassadorCreditLimit(defaultsResult.defaultAmbassadorCreditLimit);
        }
        setIsLoadingDefaults(false);
      },
    );

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

    const formData = new FormData(form);
    const result = await createAdminSchool(formData);

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    form.reset();
    router.refresh();
    onClose();
    router.push(`/admin/schools/${result.schoolId}`);
  }

  function handleClose() {
    setError(null);
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
        aria-labelledby="admin-add-school-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="admin-add-school-title" className="text-[18px] font-semibold text-[#1a1a1a]">
          Add School
        </h2>
        <p className="mt-2 text-[13px] text-[#666]">
          Create a new school with profile and credit settings.
        </p>

        <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
          <div>
            <h3 className="mb-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#a0a0a0]">
              Profile
            </h3>
            <div className="space-y-4">
          <div>
            <label htmlFor="add-school-name" className={labelClassName}>
              School name
            </label>
            <input
              id="add-school-name"
              name="name"
              type="text"
              required
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="add-school-code" className={labelClassName}>
              School code
            </label>
            <input
              id="add-school-code"
              name="code"
              type="text"
              required
              className={inputClassName}
              placeholder="Unique access code"
            />
          </div>

          <div>
            <label htmlFor="add-school-email" className={labelClassName}>
              Contact email
            </label>
            <input
              id="add-school-email"
              name="contactEmail"
              type="email"
              required
              className={inputClassName}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="add-school-city" className={labelClassName}>
                City
              </label>
              <input id="add-school-city" name="city" type="text" className={inputClassName} />
            </div>
            <div>
              <label htmlFor="add-school-country" className={labelClassName}>
                Country
              </label>
              <select
                id="add-school-country"
                name="countryCode"
                required
                disabled={isLoadingCountries}
                className={`${inputClassName} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
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
          </div>

          <div>
            <label htmlFor="add-school-limit" className={labelClassName}>
              Students limit
            </label>
            <input
              id="add-school-limit"
              name="studentsLimit"
              type="number"
              min={0}
              className={inputClassName}
              placeholder="Optional"
            />
          </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#a0a0a0]">
              Credits
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="add-school-yearly" className={labelClassName}>
                  Yearly credit plan
                </label>
                <input
                  id="add-school-yearly"
                  name="yearlyCreditPlan"
                  type="number"
                  min={0}
                  className={inputClassName}
                  placeholder="Sets initial credit pool"
                />
                <p className="mt-1 text-[11px] text-[#888]">
                  The credit pool starts at this amount.
                </p>
              </div>
              <div>
                <label htmlFor="add-school-advisor-limit" className={labelClassName}>
                  Default advisor limit
                </label>
                <input
                  id="add-school-advisor-limit"
                  key={`advisor-${defaultAdvisorCreditLimit ?? "empty"}`}
                  name="defaultAdvisorCreditLimit"
                  type="number"
                  min={0}
                  className={inputClassName}
                  placeholder="Optional"
                  defaultValue={defaultAdvisorCreditLimit ?? undefined}
                  disabled={isLoadingDefaults}
                />
              </div>
              <div>
                <label htmlFor="add-school-ambassador-limit" className={labelClassName}>
                  Default ambassador limit
                </label>
                <input
                  id="add-school-ambassador-limit"
                  key={`ambassador-${defaultAmbassadorCreditLimit ?? "empty"}`}
                  name="defaultAmbassadorCreditLimit"
                  type="number"
                  min={0}
                  className={inputClassName}
                  placeholder="Optional"
                  defaultValue={defaultAmbassadorCreditLimit ?? undefined}
                  disabled={isLoadingDefaults}
                />
              </div>
            </div>
          </div>

          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingCountries || isLoadingDefaults}
              className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Creating…" : "Create school"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
