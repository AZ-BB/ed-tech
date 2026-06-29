"use client";

import { runAdminFormSubmit } from "@/app/(protected)/admin/users/_lib/run-admin-form-submit";
import {
  createAdvisor,
  fetchAdvisorFormOptions,
  type AdminCountryOption,
} from "@/actions/admin-advisors";
import { generateRandomPassword } from "@/lib/generate-random-password";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CountryMultiSelectAutocomplete } from "./country-multi-select-autocomplete";

type UsersAddAdvisorDialogProps = {
  open: boolean;
  onClose: () => void;
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

export function UsersAddAdvisorDialog({ open, onClose }: UsersAddAdvisorDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [countries, setCountries] = useState<AdminCountryOption[]>([]);
  const [specializationCountryCodes, setSpecializationCountryCodes] = useState<string[]>([]);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsLoadingOptions(true);
    setError(null);

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
      },
      () => createAdvisor(new FormData(form)),
      () => {
        form.reset();
        router.refresh();
        handleClose();
      },
    );
  }

  function handleGeneratePassword() {
    if (passwordInputRef.current) {
      passwordInputRef.current.value = generateRandomPassword(8);
    }
  }

  function handleClose() {
    setError(null);
    setShowPassword(false);
    setSpecializationCountryCodes([]);
    if (passwordInputRef.current) passwordInputRef.current.value = "";
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarPreviewUrl(null);
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
        aria-labelledby="users-add-advisor-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-[12px] border border-[#e0deda] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[#e0deda] px-6 py-5">
          <h2 id="users-add-advisor-title" className="text-[18px] font-semibold text-[#1a1a1a]">
            Add Advisor
          </h2>
          <p className="mt-2 text-[13px] text-[#666]">
            Create a new advisor profile. Login credentials are emailed to the address below.
          </p>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {isLoadingOptions ? (
              <p className="text-[13px] text-[#666]">Loading form options…</p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="add-advisor-first-name" className={labelClassName}>
                  First name
                </label>
                <input
                  id="add-advisor-first-name"
                  name="firstName"
                  type="text"
                  required
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="add-advisor-last-name" className={labelClassName}>
                  Last name
                </label>
                <input
                  id="add-advisor-last-name"
                  name="lastName"
                  type="text"
                  required
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="add-advisor-email" className={labelClassName}>
                  Email
                </label>
                <input
                  id="add-advisor-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="add-advisor-phone" className={labelClassName}>
                  Phone
                </label>
                <input id="add-advisor-phone" name="phone" type="tel" className={inputClassName} />
              </div>
            </div>

            <div>
              <label htmlFor="add-advisor-password" className={labelClassName}>
                Password
              </label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <input
                    ref={passwordInputRef}
                    id="add-advisor-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={`${inputClassName} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md border-0 bg-transparent p-1 text-[#888] hover:text-[#4a4a4a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#40916C] focus-visible:ring-offset-1"
                    aria-pressed={showPassword}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="shrink-0 rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[12px] font-semibold text-[#4a4a4a] whitespace-nowrap"
                >
                  Generate password
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="add-advisor-nationality-country" className={labelClassName}>
                  Nationality country
                </label>
                <select
                  id="add-advisor-nationality-country"
                  name="nationalityCountryCode"
                  required
                  defaultValue=""
                  className={`${inputClassName} cursor-pointer`}
                >
                  <option value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="add-advisor-experience-years" className={labelClassName}>
                  Experience (years)
                </label>
                <input
                  id="add-advisor-experience-years"
                  name="experienceYears"
                  type="number"
                  min={0}
                  max={80}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="add-advisor-payout-percentage" className={labelClassName}>
                  Payout percentage
                </label>
                <input
                  id="add-advisor-payout-percentage"
                  name="payoutPercentage"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={0}
                  className={inputClassName}
                />
              </div>
            </div>

            <CountryMultiSelectAutocomplete
              id="add-advisor-specializations"
              label="Specialization countries"
              options={countries}
              value={specializationCountryCodes}
              onChange={setSpecializationCountryCodes}
              inputClassName={inputClassName}
              labelClassName={labelClassName}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="add-advisor-title" className={labelClassName}>
                  Title
                </label>
                <input id="add-advisor-title" name="title" type="text" className={inputClassName} />
              </div>
              <div>
                <label htmlFor="add-advisor-languages" className={labelClassName}>
                  Languages
                </label>
                <input
                  id="add-advisor-languages"
                  name="languages"
                  type="text"
                  placeholder="Arabic, English, French"
                  className={inputClassName}
                />
              </div>
            </div>

            <div>
              <label htmlFor="add-advisor-avatar" className={labelClassName}>
                Profile photo
              </label>
              <input
                id="add-advisor-avatar"
                name="avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleAvatarChange}
                className={`${inputClassName} cursor-pointer file:mr-3 file:cursor-pointer file:rounded-[6px] file:border-0 file:bg-[#e8f5ee] file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-[#1B4332]`}
              />
              {avatarPreviewUrl ? (
                <img
                  src={avatarPreviewUrl}
                  alt="Avatar preview"
                  className="mt-3 h-20 w-20 rounded-full border border-[#e0deda] object-cover"
                />
              ) : null}
            </div>

            <div>
              <label htmlFor="add-advisor-description" className={labelClassName}>
                Description
              </label>
              <textarea
                id="add-advisor-description"
                name="description"
                rows={2}
                className={`${inputClassName} resize-y`}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="add-advisor-best-for" className={labelClassName}>
                  Best for
                </label>
                <input
                  id="add-advisor-best-for"
                  name="bestFor"
                  type="text"
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="add-advisor-session-for" className={labelClassName}>
                  Session for
                </label>
                <input
                  id="add-advisor-session-for"
                  name="sessionFor"
                  type="text"
                  className={inputClassName}
                />
              </div>
            </div>

            <div>
              <label htmlFor="add-advisor-session-coverage" className={labelClassName}>
                Session coverage (one topic per line)
              </label>
              <textarea
                id="add-advisor-session-coverage"
                name="sessionCoverage"
                rows={3}
                placeholder={"University shortlist\nEssay review\nScholarship strategy"}
                className={`${inputClassName} resize-y`}
              />
            </div>

            <div>
              <label htmlFor="add-advisor-about" className={labelClassName}>
                About
              </label>
              <textarea
                id="add-advisor-about"
                name="about"
                rows={3}
                className={`${inputClassName} resize-y`}
              />
            </div>

            <div>
              <label htmlFor="add-advisor-questions" className={labelClassName}>
                Questions (one per line)
              </label>
              <textarea
                id="add-advisor-questions"
                name="questions"
                rows={3}
                placeholder={"What countries are you considering?\nWhat is your current GPA?"}
                className={`${inputClassName} resize-y`}
              />
            </div>

            <div>
              <label htmlFor="add-advisor-tags" className={labelClassName}>
                Tags (comma-separated)
              </label>
              <input
                id="add-advisor-tags"
                name="tags"
                type="text"
                placeholder="Scholarships, Essays, Strategy"
                className={inputClassName}
              />
            </div>

            <label className="flex items-center gap-2 text-[13px] text-[#4a4a4a]">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked
                className="h-4 w-4 rounded border-[#e0deda]"
              />
              Active
            </label>

            {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-[#e0deda] px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a]"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingOptions}
              className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Creating…" : "Create Advisor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
