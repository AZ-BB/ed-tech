"use client";

import { runAdminFormSubmit } from "@/app/(protected)/admin/users/_lib/run-admin-form-submit";
import {
  fetchAdvisorFormOptions,
  updateAdminAdvisorProfile,
  type AdminCountryOption,
} from "@/actions/admin-advisors";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CountryMultiSelectAutocomplete } from "../../../_components/country-multi-select-autocomplete";

export type AdminEditAdvisorDialogProps = {
  open: boolean;
  advisorId: string;
  defaults: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    title: string;
    languages: string;
    experienceYears: string;
    nationalityCountryCode: string;
    specializationCountryCodes: string[];
    description: string;
    bestFor: string;
    sessionFor: string;
    sessionCoverage: string;
    about: string;
    questions: string;
    tags: string;
    avatarUrl: string | null;
    isActive: boolean;
    payoutPercentage: string;
  };
  onClose: () => void;
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

export function AdminEditAdvisorDialog({
  open,
  advisorId,
  defaults,
  onClose,
}: AdminEditAdvisorDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [countries, setCountries] = useState<AdminCountryOption[]>([]);
  const [specializationCountryCodes, setSpecializationCountryCodes] = useState(
    defaults.specializationCountryCodes,
  );
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsLoadingOptions(true);
    setError(null);
    setSuccess(false);
    setSpecializationCountryCodes(defaults.specializationCountryCodes);
    setAvatarPreviewUrl(null);

    void fetchAdvisorFormOptions().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setCountries([]);
      } else {
        setCountries(result.countries);
      }
      setIsLoadingOptions(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  if (!open) return null;

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);

    if (!file) {
      setAvatarPreviewUrl(null);
      return;
    }

    setAvatarPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    await runAdminFormSubmit(
      {
        setSubmitting: setIsSubmitting,
        setError,
        onBeforeSubmit: () => setSuccess(false),
      },
      () => updateAdminAdvisorProfile(advisorId, new FormData(form)),
      () => {
        setSuccess(true);
        router.refresh();
        window.setTimeout(() => onClose(), 600);
      },
    );
  }

  const avatarDisplayUrl = avatarPreviewUrl ?? defaults.avatarUrl;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-edit-advisor-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="admin-edit-advisor-title" className="text-[18px] font-semibold text-[#1a1a1a]">
          Edit advisor
        </h2>
        <p className="mt-1 text-[12.5px] text-[#7a7a7a]">
          Update profile information. Email cannot be changed here.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-advisor-first-name" className={labelClassName}>
                First name
              </label>
              <input
                id="edit-advisor-first-name"
                name="firstName"
                required
                defaultValue={defaults.firstName}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="edit-advisor-last-name" className={labelClassName}>
                Last name
              </label>
              <input
                id="edit-advisor-last-name"
                name="lastName"
                required
                defaultValue={defaults.lastName}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-advisor-email" className={labelClassName}>
                Email
              </label>
              <input
                id="edit-advisor-email"
                name="email"
                type="email"
                required
                defaultValue={defaults.email}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="edit-advisor-phone" className={labelClassName}>
                Phone
              </label>
              <input
                id="edit-advisor-phone"
                name="phone"
                type="tel"
                defaultValue={defaults.phone}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-advisor-nationality" className={labelClassName}>
                Nationality country <span className="font-normal text-[#a0a0a0]">(optional)</span>
              </label>
              <select
                id="edit-advisor-nationality"
                name="nationalityCountryCode"
                disabled={isLoadingOptions || isSubmitting}
                defaultValue={defaults.nationalityCountryCode}
                className={`${inputClassName} cursor-pointer disabled:opacity-60`}
              >
                <option value="">
                  {isLoadingOptions ? "Loading countries…" : "Select country"}
                </option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-advisor-experience-years" className={labelClassName}>
                  Experience (years)
                </label>
                <input
                  id="edit-advisor-experience-years"
                  name="experienceYears"
                  type="number"
                  min={0}
                  max={80}
                  defaultValue={defaults.experienceYears}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-advisor-payout-percentage" className={labelClassName}>
                  Payout percentage
                </label>
                <input
                  id="edit-advisor-payout-percentage"
                  name="payoutPercentage"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={defaults.payoutPercentage}
                  className={inputClassName}
                />
              </div>
            </div>
          </div>

          <CountryMultiSelectAutocomplete
            id="edit-advisor-specializations"
            label="Specialization countries"
            options={countries}
            value={specializationCountryCodes}
            onChange={setSpecializationCountryCodes}
            inputClassName={inputClassName}
            labelClassName={labelClassName}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-advisor-title" className={labelClassName}>
                Title
              </label>
              <input
                id="edit-advisor-title"
                name="title"
                defaultValue={defaults.title}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="edit-advisor-languages" className={labelClassName}>
                Languages
              </label>
              <input
                id="edit-advisor-languages"
                name="languages"
                defaultValue={defaults.languages}
                placeholder="Arabic, English, French"
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-advisor-avatar" className={labelClassName}>
              Profile photo
            </label>
            <input
              id="edit-advisor-avatar"
              name="avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleAvatarChange}
              className={`${inputClassName} cursor-pointer file:mr-3 file:cursor-pointer file:rounded-[6px] file:border-0 file:bg-[#e8f5ee] file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-[#1B4332]`}
            />
            {avatarDisplayUrl ? (
              <img
                src={avatarDisplayUrl}
                alt="Avatar preview"
                className="mt-3 h-20 w-20 rounded-full border border-[#e0deda] object-cover"
              />
            ) : null}
          </div>

          <div>
            <label htmlFor="edit-advisor-description" className={labelClassName}>
              Description
            </label>
            <textarea
              id="edit-advisor-description"
              name="description"
              rows={2}
              defaultValue={defaults.description}
              className={`${inputClassName} resize-y`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-advisor-best-for" className={labelClassName}>
                Best for
              </label>
              <input
                id="edit-advisor-best-for"
                name="bestFor"
                defaultValue={defaults.bestFor}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="edit-advisor-session-for" className={labelClassName}>
                Session for
              </label>
              <input
                id="edit-advisor-session-for"
                name="sessionFor"
                defaultValue={defaults.sessionFor}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-advisor-session-coverage" className={labelClassName}>
              Session coverage (one topic per line)
            </label>
            <textarea
              id="edit-advisor-session-coverage"
              name="sessionCoverage"
              rows={3}
              defaultValue={defaults.sessionCoverage}
              className={`${inputClassName} resize-y`}
            />
          </div>

          <div>
            <label htmlFor="edit-advisor-about" className={labelClassName}>
              About
            </label>
            <textarea
              id="edit-advisor-about"
              name="about"
              rows={3}
              defaultValue={defaults.about}
              className={`${inputClassName} resize-y`}
            />
          </div>

          <div>
            <label htmlFor="edit-advisor-questions" className={labelClassName}>
              Questions (one per line)
            </label>
            <textarea
              id="edit-advisor-questions"
              name="questions"
              rows={3}
              defaultValue={defaults.questions}
              className={`${inputClassName} resize-y`}
            />
          </div>

          <div>
            <label htmlFor="edit-advisor-tags" className={labelClassName}>
              Tags (comma-separated)
            </label>
            <input
              id="edit-advisor-tags"
              name="tags"
              defaultValue={defaults.tags}
              placeholder="Scholarships, Essays, Strategy"
              className={inputClassName}
            />
          </div>

          <label className="flex items-center gap-2 text-[13px] text-[#4a4a4a]">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={defaults.isActive}
              className="h-4 w-4 rounded border-[#e0deda]"
            />
            Active
          </label>

          {error ? (
            <p className="text-[12px] text-[#c0392b]" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-[12px] text-[#2D6A4F]" role="status">
              Advisor updated.
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[13px] font-semibold text-[#4a4a4a] hover:bg-[#faf9f4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingOptions}
              className="rounded-[8px] border border-[#40916C] bg-[#40916C] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#2D6A4F] disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
