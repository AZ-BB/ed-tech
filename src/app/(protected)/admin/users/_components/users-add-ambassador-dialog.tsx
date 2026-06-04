"use client";

import { runAdminFormSubmit } from "@/app/(protected)/admin/users/_lib/run-admin-form-submit";
import {
  createAmbassador,
  fetchAmbassadorFormOptions,
  type AdminCountryOption,
  type AdminUniversityOption,
} from "@/actions/admin-ambassadors";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type UsersAddAmbassadorDialogProps = {
  open: boolean;
  onClose: () => void;
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

export function UsersAddAmbassadorDialog({ open, onClose }: UsersAddAmbassadorDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [countries, setCountries] = useState<AdminCountryOption[]>([]);
  const [universities, setUniversities] = useState<AdminUniversityOption[]>([]);
  const [destinationCountryCode, setDestinationCountryCode] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredUniversities = useMemo(() => {
    if (!destinationCountryCode) return universities;
    return universities.filter((university) => university.country_code === destinationCountryCode);
  }, [destinationCountryCode, universities]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsLoadingOptions(true);
    setError(null);

    void fetchAmbassadorFormOptions().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setCountries([]);
        setUniversities([]);
      } else {
        setCountries(result.countries);
        setUniversities(result.universities);
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
      () => createAmbassador(new FormData(form)),
      () => {
        form.reset();
        router.refresh();
        handleClose();
      },
    );
  }

  function handleClose() {
    setError(null);
    setDestinationCountryCode("");
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
        aria-labelledby="users-add-ambassador-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-[12px] border border-[#e0deda] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[#e0deda] px-6 py-5">
          <h2 id="users-add-ambassador-title" className="text-[18px] font-semibold text-[#1a1a1a]">
            Add Ambassador
          </h2>
          <p className="mt-2 text-[13px] text-[#666]">
            Create a new ambassador profile. Upload a profile photo instead of pasting an image URL.
          </p>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {isLoadingOptions ? (
              <p className="text-[13px] text-[#666]">Loading form options…</p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="add-ambassador-first-name" className={labelClassName}>
                  First name
                </label>
                <input
                  id="add-ambassador-first-name"
                  name="firstName"
                  type="text"
                  required
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="add-ambassador-last-name" className={labelClassName}>
                  Last name
                </label>
                <input
                  id="add-ambassador-last-name"
                  name="lastName"
                  type="text"
                  required
                  className={inputClassName}
                />
              </div>
            </div>

            <div>
              <label htmlFor="add-ambassador-email" className={labelClassName}>
                Email
              </label>
              <input
                id="add-ambassador-email"
                name="email"
                type="email"
                required
                className={inputClassName}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="add-ambassador-destination-country" className={labelClassName}>
                  Destination country
                </label>
                <select
                  id="add-ambassador-destination-country"
                  name="destinationCountryCode"
                  required
                  value={destinationCountryCode}
                  onChange={(event) => setDestinationCountryCode(event.target.value)}
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
                <label htmlFor="add-ambassador-nationality-country" className={labelClassName}>
                  Nationality country
                </label>
                <select
                  id="add-ambassador-nationality-country"
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="add-ambassador-university" className={labelClassName}>
                  University
                </label>
                <select
                  id="add-ambassador-university"
                  name="universityId"
                  defaultValue=""
                  className={`${inputClassName} cursor-pointer`}
                >
                  <option value="">None</option>
                  {filteredUniversities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="add-ambassador-university-name" className={labelClassName}>
                  University name (if not listed)
                </label>
                <input
                  id="add-ambassador-university-name"
                  name="universityName"
                  type="text"
                  className={inputClassName}
                />
              </div>
            </div>

            <div>
              <label htmlFor="add-ambassador-avatar" className={labelClassName}>
                Profile photo
              </label>
              <input
                id="add-ambassador-avatar"
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="add-ambassador-major" className={labelClassName}>
                  Major
                </label>
                <input id="add-ambassador-major" name="major" type="text" className={inputClassName} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-ambassador-start-year" className={labelClassName}>
                    Start year
                  </label>
                  <input
                    id="add-ambassador-start-year"
                    name="startYear"
                    type="number"
                    min={1950}
                    max={2100}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="add-ambassador-graduation-year" className={labelClassName}>
                    Graduation year
                  </label>
                  <input
                    id="add-ambassador-graduation-year"
                    name="graduationYear"
                    type="number"
                    min={1950}
                    max={2100}
                    className={inputClassName}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-[13px] text-[#4a4a4a]">
                <input
                  type="checkbox"
                  name="isCurrentStudent"
                  defaultChecked
                  className="h-4 w-4 rounded border-[#e0deda]"
                />
                Current student
              </label>
              <label className="flex items-center gap-2 text-[13px] text-[#4a4a4a]">
                <input type="checkbox" name="hasMsc" className="h-4 w-4 rounded border-[#e0deda]" />
                Has MSc
              </label>
              <label className="flex items-center gap-2 text-[13px] text-[#4a4a4a]">
                <input type="checkbox" name="hasPhd" className="h-4 w-4 rounded border-[#e0deda]" />
                Has PhD
              </label>
              <label className="flex items-center gap-2 text-[13px] text-[#4a4a4a]">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked
                  className="h-4 w-4 rounded border-[#e0deda]"
                />
                Active
              </label>
            </div>

            <div>
              <label htmlFor="add-ambassador-about" className={labelClassName}>
                About
              </label>
              <textarea
                id="add-ambassador-about"
                name="about"
                rows={3}
                className={`${inputClassName} resize-y`}
              />
            </div>

            <div>
              <label htmlFor="add-ambassador-help-in" className={labelClassName}>
                Help in (one topic per line)
              </label>
              <textarea
                id="add-ambassador-help-in"
                name="helpIn"
                rows={3}
                placeholder={"Applications\nCampus life\nHousing"}
                className={`${inputClassName} resize-y`}
              />
            </div>

            <div>
              <label htmlFor="add-ambassador-tags" className={labelClassName}>
                Tags (one per line)
              </label>
              <textarea
                id="add-ambassador-tags"
                name="tags"
                rows={3}
                placeholder={"STEM\nFirst year\nInternational student"}
                className={`${inputClassName} resize-y`}
              />
            </div>

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
              {isSubmitting ? "Creating…" : "Create Ambassador"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
