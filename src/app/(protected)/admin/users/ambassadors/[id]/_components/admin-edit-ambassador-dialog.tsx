"use client";

import { runAdminFormSubmit } from "@/app/(protected)/admin/users/_lib/run-admin-form-submit";
import {
  fetchAmbassadorFormOptions,
  updateAdminAmbassadorProfile,
  type AdminCountryOption,
  type AdminUniversityOption,
} from "@/actions/admin-ambassadors";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type AdminEditAmbassadorDialogProps = {
  open: boolean;
  ambassadorId: string;
  defaults: {
    firstName: string;
    lastName: string;
    email: string;
    destinationCountryCode: string;
    nationalityCountryCode: string;
    universityId: string;
    universityName: string;
    major: string;
    startYear: string;
    graduationYear: string;
    isCurrentStudent: boolean;
    hasMsc: boolean;
    hasPhd: boolean;
    about: string;
    helpIn: string;
    tags: string;
    avatarUrl: string | null;
    isActive: boolean;
  };
  onClose: () => void;
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

export function AdminEditAmbassadorDialog({
  open,
  ambassadorId,
  defaults,
  onClose,
}: AdminEditAmbassadorDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [countries, setCountries] = useState<AdminCountryOption[]>([]);
  const [universities, setUniversities] = useState<AdminUniversityOption[]>([]);
  const [destinationCountryCode, setDestinationCountryCode] = useState(
    defaults.destinationCountryCode,
  );
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const filteredUniversities = useMemo(() => {
    if (!destinationCountryCode) return universities;
    return universities.filter(
      (university) => university.country_code === destinationCountryCode,
    );
  }, [destinationCountryCode, universities]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsLoadingOptions(true);
    setError(null);
    setSuccess(false);
    setDestinationCountryCode(defaults.destinationCountryCode);
    setAvatarPreviewUrl(null);

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
        onBeforeSubmit: () => setSuccess(false),
      },
      () => updateAdminAmbassadorProfile(ambassadorId, new FormData(form)),
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
        aria-labelledby="admin-edit-ambassador-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="admin-edit-ambassador-title"
          className="text-[18px] font-semibold text-[#1a1a1a]"
        >
          Edit ambassador
        </h2>
        <p className="mt-1 text-[12.5px] text-[#7a7a7a]">
          Update profile information. Email cannot be changed here.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-ambassador-first-name" className={labelClassName}>
                First name
              </label>
              <input
                id="edit-ambassador-first-name"
                name="firstName"
                required
                defaultValue={defaults.firstName}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="edit-ambassador-last-name" className={labelClassName}>
                Last name
              </label>
              <input
                id="edit-ambassador-last-name"
                name="lastName"
                required
                defaultValue={defaults.lastName}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-ambassador-email" className={labelClassName}>
              Email
            </label>
            <input
              id="edit-ambassador-email"
              type="email"
              readOnly
              value={defaults.email}
              className={`${inputClassName} cursor-not-allowed bg-[#faf9f4] text-[#7a7a7a]`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-ambassador-destination" className={labelClassName}>
                Destination country
              </label>
              <select
                id="edit-ambassador-destination"
                name="destinationCountryCode"
                required
                disabled={isLoadingOptions || isSubmitting}
                value={destinationCountryCode}
                onChange={(event) => setDestinationCountryCode(event.target.value)}
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
            <div>
              <label htmlFor="edit-ambassador-nationality" className={labelClassName}>
                Nationality country
              </label>
              <select
                id="edit-ambassador-nationality"
                name="nationalityCountryCode"
                required
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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-ambassador-university" className={labelClassName}>
                University
              </label>
              <select
                id="edit-ambassador-university"
                name="universityId"
                disabled={isLoadingOptions || isSubmitting}
                defaultValue={defaults.universityId}
                className={`${inputClassName} cursor-pointer disabled:opacity-60`}
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
              <label htmlFor="edit-ambassador-university-name" className={labelClassName}>
                University name (if not listed)
              </label>
              <input
                id="edit-ambassador-university-name"
                name="universityName"
                defaultValue={defaults.universityName}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-ambassador-avatar" className={labelClassName}>
              Profile photo
            </label>
            <input
              id="edit-ambassador-avatar"
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-ambassador-major" className={labelClassName}>
                Major
              </label>
              <input
                id="edit-ambassador-major"
                name="major"
                defaultValue={defaults.major}
                className={inputClassName}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-ambassador-start-year" className={labelClassName}>
                  Start year
                </label>
                <input
                  id="edit-ambassador-start-year"
                  name="startYear"
                  type="number"
                  min={1950}
                  max={2100}
                  defaultValue={defaults.startYear}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-ambassador-graduation-year" className={labelClassName}>
                  Graduation year
                </label>
                <input
                  id="edit-ambassador-graduation-year"
                  name="graduationYear"
                  type="number"
                  min={1950}
                  max={2100}
                  defaultValue={defaults.graduationYear}
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
                defaultChecked={defaults.isCurrentStudent}
                className="h-4 w-4 rounded border-[#e0deda]"
              />
              Current student
            </label>
            <label className="flex items-center gap-2 text-[13px] text-[#4a4a4a]">
              <input
                type="checkbox"
                name="hasMsc"
                defaultChecked={defaults.hasMsc}
                className="h-4 w-4 rounded border-[#e0deda]"
              />
              Has MSc
            </label>
            <label className="flex items-center gap-2 text-[13px] text-[#4a4a4a]">
              <input
                type="checkbox"
                name="hasPhd"
                defaultChecked={defaults.hasPhd}
                className="h-4 w-4 rounded border-[#e0deda]"
              />
              Has PhD
            </label>
            <label className="flex items-center gap-2 text-[13px] text-[#4a4a4a]">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={defaults.isActive}
                className="h-4 w-4 rounded border-[#e0deda]"
              />
              Active
            </label>
          </div>

          <div>
            <label htmlFor="edit-ambassador-about" className={labelClassName}>
              About
            </label>
            <textarea
              id="edit-ambassador-about"
              name="about"
              rows={3}
              defaultValue={defaults.about}
              className={`${inputClassName} resize-y`}
            />
          </div>

          <div>
            <label htmlFor="edit-ambassador-help-in" className={labelClassName}>
              Help in (one topic per line)
            </label>
            <textarea
              id="edit-ambassador-help-in"
              name="helpIn"
              rows={3}
              defaultValue={defaults.helpIn}
              placeholder={"Applications\nCampus life\nHousing"}
              className={`${inputClassName} resize-y`}
            />
          </div>

          <div>
            <label htmlFor="edit-ambassador-tags" className={labelClassName}>
              Tags (one per line)
            </label>
            <textarea
              id="edit-ambassador-tags"
              name="tags"
              rows={3}
              defaultValue={defaults.tags}
              className={`${inputClassName} resize-y`}
            />
          </div>

          {error ? (
            <p className="text-[12px] text-[#c0392b]" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-[12px] text-[#2D6A4F]" role="status">
              Ambassador updated.
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
