"use client";

import {
  createAdminUniversity,
  fetchAdminUniversityFormCountries,
  type AdminCountryOption,
} from "@/actions/admin-universities";
import { uploadAdminUniversityImages } from "@/lib/admin-university-image-upload-client";
import { getAdminUniversityDetailHref } from "../_lib/admin-university-detail-href";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminAddUniversityDialogProps = {
  open: boolean;
  onClose: () => void;
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="mb-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#a0a0a0]">
      {children}
    </h3>
  );
}

export function AdminAddUniversityDialog({ open, onClose }: AdminAddUniversityDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [countries, setCountries] = useState<AdminCountryOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsLoadingCountries(true);
    setError(null);

    void fetchAdminUniversityFormCountries().then((result) => {
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
    setLogoPreviewUrl(null);
    setCoverPreviewUrl(null);
    setLogoFile(null);
    setCoverFile(null);
    setFormKey((k) => k + 1);
  }, [open]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
      if (coverPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [logoPreviewUrl, coverPreviewUrl]);

  if (!open) return null;

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (logoPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    if (!file) {
      setLogoFile(null);
      setLogoPreviewUrl(null);
      return;
    }

    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  }

  function handleCoverChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (coverPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreviewUrl);
    }

    if (!file) {
      setCoverFile(null);
      setCoverPreviewUrl(null);
      return;
    }

    setCoverFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await createAdminUniversity(formData);

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    const uploadResult = await uploadAdminUniversityImages(result.universityId, {
      logo: logoFile,
      cover: coverFile,
    });
    if (!uploadResult.ok) {
      setError(
        `University was created, but image upload failed: ${uploadResult.error}`,
      );
      setIsSubmitting(false);
      router.refresh();
      router.push(getAdminUniversityDetailHref(result.universityId));
      return;
    }

    setIsSubmitting(false);
    onClose();
    router.refresh();
    router.push(getAdminUniversityDetailHref(result.universityId));
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={isSubmitting ? undefined : handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-add-university-title"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[12px] border border-[#e0deda] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 px-6 pt-6">
          <h2
            id="admin-add-university-title"
            className="text-[18px] font-semibold text-[#1a1a1a]"
          >
            Add University
          </h2>
          <p className="mt-2 text-[13px] text-[#666]">
            Create a new catalog entry with profile, admissions, and visibility settings.
          </p>
        </div>

        {isLoadingCountries ? (
          <p className="px-6 py-6 text-[13px] text-[#666]">Loading countries…</p>
        ) : (
          <form key={formKey} className="flex min-h-0 flex-1 flex-col px-6" onSubmit={handleSubmit}>
            <fieldset
              disabled={isSubmitting}
              className="m-0 min-h-0 min-w-0 flex-1 space-y-6 overflow-y-auto border-0 p-0 pb-4 disabled:pointer-events-none disabled:opacity-60"
            >
            <div>
              <SectionTitle>Profile</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="add-uni-name" className={labelClassName}>
                    University name
                  </label>
                  <input
                    id="add-uni-name"
                    name="name"
                    type="text"
                    required
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="add-uni-city" className={labelClassName}>
                    City
                  </label>
                  <input
                    id="add-uni-city"
                    name="city"
                    type="text"
                    required
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="add-uni-state" className={labelClassName}>
                    State / region
                  </label>
                  <input id="add-uni-state" name="state" type="text" className={inputClassName} />
                </div>
                <div>
                  <label htmlFor="add-uni-country" className={labelClassName}>
                    Country
                  </label>
                  <select
                    id="add-uni-country"
                    name="countryCode"
                    required
                    disabled={countries.length === 0}
                    className={inputClassName}
                  >
                    <option value="">Select country</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex cursor-pointer items-center gap-2 pb-2 text-[13px] text-[#4a4a4a]">
                    <input
                      id="add-uni-type"
                      type="checkbox"
                      name="isPublic"
                      className="h-4 w-4 rounded border-[#e0deda]"
                    />
                    Public institution
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="add-uni-description" className={labelClassName}>
                    Description
                  </label>
                  <textarea
                    id="add-uni-description"
                    name="description"
                    rows={4}
                    className={`${inputClassName} resize-y`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="add-uni-logo-file" className={labelClassName}>
                    University logo
                  </label>
                  <div className="flex flex-wrap items-start gap-4">
                    {logoPreviewUrl ? (
                      <img
                        src={logoPreviewUrl}
                        alt="Logo preview"
                        className="h-20 w-20 shrink-0 rounded-full border border-[#e0deda] bg-[#fafaf8] object-contain p-1"
                      />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-dashed border-[#e0deda] bg-[#fafaf8] text-[10px] font-medium text-[#a0a0a0]">
                        No logo
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-3">
                      <input
                        id="add-uni-logo-file"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                        onChange={handleLogoChange}
                        className={`${inputClassName} cursor-pointer file:mr-3 file:cursor-pointer file:rounded-[6px] file:border-0 file:bg-[#e8f5ee] file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-[#1B4332]`}
                      />
                      <p className="text-[11px] text-[#a0a0a0]">
                        Upload PNG, JPEG, WebP, GIF, or SVG (max 5 MB).
                      </p>
                      <div>
                        <label htmlFor="add-uni-logo-url" className={labelClassName}>
                          Or paste logo URL
                        </label>
                        <input
                          id="add-uni-logo-url"
                          name="logoUrl"
                          type="url"
                          placeholder="https://…"
                          className={inputClassName}
                        />
                        <p className="mt-1 text-[11px] text-[#a0a0a0]">
                          Used only if you do not upload a file.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="add-uni-cover-file" className={labelClassName}>
                    Cover image
                  </label>
                  <div className="space-y-3">
                    {coverPreviewUrl ? (
                      <img
                        src={coverPreviewUrl}
                        alt="Cover preview"
                        className="h-[100px] w-full max-w-md rounded-[8px] border border-[#e0deda] object-cover"
                      />
                    ) : (
                      <div className="flex h-[100px] w-full max-w-md items-center justify-center rounded-[8px] border border-dashed border-[#e0deda] bg-[#fafaf8] text-[10px] font-medium text-[#a0a0a0]">
                        No cover image
                      </div>
                    )}
                    <input
                      id="add-uni-cover-file"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleCoverChange}
                      className={`${inputClassName} cursor-pointer file:mr-3 file:cursor-pointer file:rounded-[6px] file:border-0 file:bg-[#e8f5ee] file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-[#1B4332]`}
                    />
                    <p className="text-[11px] text-[#a0a0a0]">
                      Banner shown on the university page (PNG, JPEG, WebP, or GIF, max 5 MB).
                    </p>
                    <div>
                      <label htmlFor="add-uni-cover-url" className={labelClassName}>
                        Or paste cover image URL
                      </label>
                      <input
                        id="add-uni-cover-url"
                        name="coverImageUrl"
                        type="url"
                        placeholder="https://…"
                        className={inputClassName}
                      />
                      <p className="mt-1 text-[11px] text-[#a0a0a0]">
                        Used only if you do not upload a file.
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <label htmlFor="add-uni-ranking" className={labelClassName}>
                    Ranking
                  </label>
                  <input
                    id="add-uni-ranking"
                    name="ranking"
                    type="number"
                    min={0}
                    className={inputClassName}
                  />
                </div>
              </div>
            </div>

            <div>
              <SectionTitle>Contact &amp; links</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="add-uni-website" className={labelClassName}>
                    Website
                  </label>
                  <input
                    id="add-uni-website"
                    name="websiteUrl"
                    type="url"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="add-uni-admissions" className={labelClassName}>
                    Admissions page
                  </label>
                  <input
                    id="add-uni-admissions"
                    name="admissionPageUrl"
                    type="url"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="add-uni-email" className={labelClassName}>
                    Email
                  </label>
                  <input id="add-uni-email" name="email" type="email" className={inputClassName} />
                </div>
                <div>
                  <label htmlFor="add-uni-phone" className={labelClassName}>
                    Phone
                  </label>
                  <input id="add-uni-phone" name="phone" type="text" className={inputClassName} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="add-uni-address" className={labelClassName}>
                    Address
                  </label>
                  <input id="add-uni-address" name="address" type="text" className={inputClassName} />
                </div>
              </div>
            </div>

            <div>
              <SectionTitle>Admissions &amp; costs</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="add-uni-tuition" className={labelClassName}>
                    Tuition per year
                  </label>
                  <input
                    id="add-uni-tuition"
                    name="tuitionPerYear"
                    type="number"
                    min={0}
                    step="any"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="add-uni-living" className={labelClassName}>
                    Est. living cost / year
                  </label>
                  <input
                    id="add-uni-living"
                    name="estimatedLivingCostPerYear"
                    type="number"
                    min={0}
                    step="any"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="add-uni-tuition-display" className={labelClassName}>
                    Tuition display (student-facing)
                  </label>
                  <input
                    id="add-uni-tuition-display"
                    name="tuitionDisplay"
                    type="text"
                    placeholder="e.g. 52,000 per year"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="add-uni-living-display" className={labelClassName}>
                    Living cost display (student-facing)
                  </label>
                  <input
                    id="add-uni-living-display"
                    name="livingDisplay"
                    type="text"
                    placeholder="e.g. 18,000 per year"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="add-uni-fee" className={labelClassName}>
                    Application fee (USD)
                  </label>
                  <input
                    id="add-uni-fee"
                    name="applicationFee"
                    type="number"
                    min={0}
                    step="any"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="add-uni-deadline" className={labelClassName}>
                    Primary deadline
                  </label>
                  <input
                    id="add-uni-deadline"
                    name="deadlineDate"
                    type="date"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="add-uni-method" className={labelClassName}>
                    Application method
                  </label>
                  <input id="add-uni-method" name="method" type="text" className={inputClassName} />
                </div>
                <div>
                  <label htmlFor="add-uni-intakes" className={labelClassName}>
                    Intakes
                  </label>
                  <input id="add-uni-intakes" name="intakes" type="text" className={inputClassName} />
                </div>
                <div>
                  <label htmlFor="add-uni-acceptance" className={labelClassName}>
                    Acceptance rate (%)
                  </label>
                  <input
                    id="add-uni-acceptance"
                    name="acceptanceRate"
                    type="number"
                    min={0}
                    max={100}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="add-uni-intl" className={labelClassName}>
                    Intl. students (%)
                  </label>
                  <input
                    id="add-uni-intl"
                    name="intlStudents"
                    type="number"
                    min={0}
                    max={100}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="add-uni-ielts" className={labelClassName}>
                    IELTS minimum
                  </label>
                  <input
                    id="add-uni-ielts"
                    name="ieltsMinScore"
                    type="number"
                    min={0}
                    max={9}
                    step="0.5"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="add-uni-toefl" className={labelClassName}>
                    TOEFL minimum
                  </label>
                  <input
                    id="add-uni-toefl"
                    name="toeflMinScore"
                    type="number"
                    min={0}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="add-uni-sat" className={labelClassName}>
                    SAT policy
                  </label>
                  <input id="add-uni-sat" name="satPolicy" type="text" className={inputClassName} />
                </div>
                <div>
                  <label htmlFor="add-uni-difficulty" className={labelClassName}>
                    Difficulty
                  </label>
                  <select id="add-uni-difficulty" name="difficulty" className={inputClassName}>
                    <option value="">Not set</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="add-uni-documents" className={labelClassName}>
                    Required documents (one per line)
                  </label>
                  <textarea
                    id="add-uni-documents"
                    name="documents"
                    rows={5}
                    className={`${inputClassName} resize-y`}
                  />
                </div>
              </div>
            </div>

            <div>
              <SectionTitle>Visibility</SectionTitle>
              <div className="flex flex-wrap gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#4a4a4a]">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked
                    className="h-4 w-4 rounded border-[#e0deda]"
                  />
                  Active in catalog
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#4a4a4a]">
                  <input
                    type="checkbox"
                    name="isPriority"
                    className="h-4 w-4 rounded border-[#e0deda]"
                  />
                  Priority deadline
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#4a4a4a]">
                  <input
                    type="checkbox"
                    name="isScholarshipAvailable"
                    className="h-4 w-4 rounded border-[#e0deda]"
                  />
                  Scholarships available
                </label>
              </div>
            </div>

            </fieldset>

            <div className="shrink-0 border-t border-[#ece9e4] bg-white py-4">
              {error ? (
                <p className="mb-3 text-[13px] text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || countries.length === 0}
                  className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#1B4332] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Creating…" : "Add university"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
