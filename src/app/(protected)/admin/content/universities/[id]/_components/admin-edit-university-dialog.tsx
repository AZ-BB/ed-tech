"use client";

import { updateAdminUniversity } from "@/actions/admin-universities";
import { uploadAdminUniversityImages } from "@/lib/admin-university-image-upload-client";
import type { AdminUniversityDetailPayload } from "../_lib/fetch-admin-university-detail";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminEditUniversityDialogProps = {
  open: boolean;
  onClose: () => void;
  university: AdminUniversityDetailPayload["university"];
  countries: AdminUniversityDetailPayload["countries"];
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

export function AdminEditUniversityDialog({
  open,
  onClose,
  university,
  countries,
}: AdminEditUniversityDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    university.logoUrl,
  );
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(
    university.coverImageUrl,
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setLogoPreviewUrl(university.logoUrl);
      setCoverPreviewUrl(university.coverImageUrl);
      setLogoFile(null);
      setCoverFile(null);
    }
  }, [open, university.logoUrl, university.coverImageUrl]);

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
      setLogoPreviewUrl(university.logoUrl);
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
      setCoverPreviewUrl(university.coverImageUrl);
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

    const uploadResult = await uploadAdminUniversityImages(university.id, {
      logo: logoFile,
      cover: coverFile,
    });
    if (!uploadResult.ok) {
      setError(uploadResult.error);
      setIsSubmitting(false);
      return;
    }
    if (uploadResult.logoUrl) {
      formData.set("logoUrl", uploadResult.logoUrl);
    }
    if (uploadResult.coverImageUrl) {
      formData.set("coverImageUrl", uploadResult.coverImageUrl);
    }

    const result = await updateAdminUniversity(formData);

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    router.refresh();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-edit-university-title"
        className="flex max-h-[90vh] min-h-0 w-full max-w-3xl flex-col overflow-hidden rounded-[12px] border border-[#e0deda] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 px-6 pt-6">
          <h2
            id="admin-edit-university-title"
            className="text-[18px] font-semibold text-[#1a1a1a]"
          >
            Edit University
          </h2>
          <p className="mt-2 text-[13px] text-[#666]">
            Update catalog profile, admissions, and visibility settings.
          </p>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
            <fieldset
              disabled={isSubmitting}
              className="m-0 space-y-6 border-0 p-0 disabled:pointer-events-none disabled:opacity-60"
            >
            <input type="hidden" name="universityId" value={university.id} />

          <div>
            <SectionTitle>Profile</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="edit-uni-name" className={labelClassName}>
                  University name
                </label>
                <input
                  id="edit-uni-name"
                  name="name"
                  type="text"
                  required
                  defaultValue={university.name}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-uni-city" className={labelClassName}>
                  City
                </label>
                <input
                  id="edit-uni-city"
                  name="city"
                  type="text"
                  required
                  defaultValue={university.city}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-uni-state" className={labelClassName}>
                  State / region
                </label>
                <input
                  id="edit-uni-state"
                  name="state"
                  type="text"
                  defaultValue={university.state ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-uni-country" className={labelClassName}>
                  Country
                </label>
                <select
                  id="edit-uni-country"
                  name="countryCode"
                  required
                  defaultValue={university.countryCode}
                  className={inputClassName}
                >
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
                    id="edit-uni-type"
                    type="checkbox"
                    name="isPublic"
                    defaultChecked={university.isPublic}
                    className="h-4 w-4 rounded border-[#e0deda]"
                  />
                  Public institution
                </label>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="edit-uni-description" className={labelClassName}>
                  Description
                </label>
                <textarea
                  id="edit-uni-description"
                  name="description"
                  rows={4}
                  defaultValue={university.description ?? ""}
                  className={`${inputClassName} resize-y`}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="edit-uni-logo-file" className={labelClassName}>
                  University logo
                </label>
                <div className="flex flex-wrap items-start gap-4">
                  {logoPreviewUrl ? (
                    <img
                      src={logoPreviewUrl}
                      alt={`${university.name} logo preview`}
                      className="h-20 w-20 shrink-0 rounded-full border border-[#e0deda] bg-[#fafaf8] object-contain p-1"
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-dashed border-[#e0deda] bg-[#fafaf8] text-[10px] font-medium text-[#a0a0a0]">
                      No logo
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-3">
                    <input
                      id="edit-uni-logo-file"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      onChange={handleLogoChange}
                      className={`${inputClassName} cursor-pointer file:mr-3 file:cursor-pointer file:rounded-[6px] file:border-0 file:bg-[#e8f5ee] file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-[#1B4332]`}
                    />
                    <p className="text-[11px] text-[#a0a0a0]">
                      Upload PNG, JPEG, WebP, GIF, or SVG (max 5 MB). Uploading replaces
                      the current logo.
                    </p>
                    <div>
                      <label htmlFor="edit-uni-logo-url" className={labelClassName}>
                        Or paste logo URL
                      </label>
                      <input
                        id="edit-uni-logo-url"
                        name="logoUrl"
                        type="url"
                        key={university.logoUrl ?? "no-logo"}
                        defaultValue={university.logoUrl ?? ""}
                        placeholder="https://…"
                        className={inputClassName}
                      />
                      <p className="mt-1 text-[11px] text-[#a0a0a0]">
                        Used only if you do not upload a new file.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="edit-uni-cover-file" className={labelClassName}>
                  Cover image
                </label>
                <div className="space-y-3">
                  {coverPreviewUrl ? (
                    <img
                      src={coverPreviewUrl}
                      alt={`${university.name} cover preview`}
                      className="h-[100px] w-full max-w-md rounded-[8px] border border-[#e0deda] object-cover"
                    />
                  ) : (
                    <div className="flex h-[100px] w-full max-w-md items-center justify-center rounded-[8px] border border-dashed border-[#e0deda] bg-[#fafaf8] text-[10px] font-medium text-[#a0a0a0]">
                      No cover image
                    </div>
                  )}
                  <input
                    id="edit-uni-cover-file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleCoverChange}
                    className={`${inputClassName} cursor-pointer file:mr-3 file:cursor-pointer file:rounded-[6px] file:border-0 file:bg-[#e8f5ee] file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-[#1B4332]`}
                  />
                  <p className="text-[11px] text-[#a0a0a0]">
                    Banner shown on the university page (PNG, JPEG, WebP, or GIF, max 5 MB).
                    Uploading replaces the current cover.
                  </p>
                  <div>
                    <label htmlFor="edit-uni-cover-url" className={labelClassName}>
                      Or paste cover image URL
                    </label>
                    <input
                      id="edit-uni-cover-url"
                      name="coverImageUrl"
                      type="url"
                      key={university.coverImageUrl ?? "no-cover"}
                      defaultValue={university.coverImageUrl ?? ""}
                      placeholder="https://…"
                      className={inputClassName}
                    />
                    <p className="mt-1 text-[11px] text-[#a0a0a0]">
                      Used only if you do not upload a new file.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="edit-uni-ranking" className={labelClassName}>
                  Ranking
                </label>
                <input
                  id="edit-uni-ranking"
                  name="ranking"
                  type="number"
                  min={0}
                  defaultValue={university.ranking ?? ""}
                  className={inputClassName}
                />
              </div>
            </div>
          </div>

          <div>
            <SectionTitle>Contact &amp; links</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-uni-website" className={labelClassName}>
                  Website
                </label>
                <input
                  id="edit-uni-website"
                  name="websiteUrl"
                  type="url"
                  defaultValue={university.websiteUrl ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-uni-admissions" className={labelClassName}>
                  Admissions page
                </label>
                <input
                  id="edit-uni-admissions"
                  name="admissionPageUrl"
                  type="url"
                  defaultValue={university.admissionPageUrl ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-uni-email" className={labelClassName}>
                  Email
                </label>
                <input
                  id="edit-uni-email"
                  name="email"
                  type="email"
                  defaultValue={university.email ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-uni-phone" className={labelClassName}>
                  Phone
                </label>
                <input
                  id="edit-uni-phone"
                  name="phone"
                  type="text"
                  defaultValue={university.phone ?? ""}
                  className={inputClassName}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="edit-uni-address" className={labelClassName}>
                  Address
                </label>
                <input
                  id="edit-uni-address"
                  name="address"
                  type="text"
                  defaultValue={university.address ?? ""}
                  className={inputClassName}
                />
              </div>
            </div>
          </div>

          <div>
            <SectionTitle>Admissions &amp; costs</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-uni-tuition" className={labelClassName}>
                  Tuition per year
                </label>
                <input
                  id="edit-uni-tuition"
                  name="tuitionPerYear"
                  type="number"
                  min={0}
                  step="any"
                  defaultValue={university.tuitionPerYear ?? ""}
                  className={inputClassName}
                />
              </div>
                <div>
                  <label htmlFor="edit-uni-living" className={labelClassName}>
                    Est. living cost / year
                  </label>
                  <input
                    id="edit-uni-living"
                    name="estimatedLivingCostPerYear"
                    type="number"
                    min={0}
                    step="any"
                    defaultValue={university.estimatedLivingCostPerYear ?? ""}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="edit-uni-tuition-display" className={labelClassName}>
                    Tuition display (student-facing)
                  </label>
                  <input
                    id="edit-uni-tuition-display"
                    name="tuitionDisplay"
                    type="text"
                    defaultValue={university.tuitionDisplay ?? ""}
                    placeholder="e.g. 52,000 per year"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="edit-uni-living-display" className={labelClassName}>
                    Living cost display (student-facing)
                  </label>
                  <input
                    id="edit-uni-living-display"
                    name="livingDisplay"
                    type="text"
                    defaultValue={university.livingDisplay ?? ""}
                    placeholder="e.g. 18,000 per year"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="edit-uni-fee" className={labelClassName}>
                    Application fee (USD)
                  </label>
                <input
                  id="edit-uni-fee"
                  name="applicationFee"
                  type="number"
                  min={0}
                  step="any"
                  defaultValue={university.applicationFee ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-uni-deadline" className={labelClassName}>
                  Primary deadline
                </label>
                <input
                  id="edit-uni-deadline"
                  name="deadlineDate"
                  type="date"
                  defaultValue={university.deadlineDate ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-uni-method" className={labelClassName}>
                  Application method
                </label>
                <input
                  id="edit-uni-method"
                  name="method"
                  type="text"
                  defaultValue={university.method ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-uni-intakes" className={labelClassName}>
                  Intakes
                </label>
                <input
                  id="edit-uni-intakes"
                  name="intakes"
                  type="text"
                  defaultValue={university.intakes ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-uni-acceptance" className={labelClassName}>
                  Acceptance rate (%)
                </label>
                <input
                  id="edit-uni-acceptance"
                  name="acceptanceRate"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={university.acceptanceRate ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-uni-intl" className={labelClassName}>
                  Intl. students (%)
                </label>
                <input
                  id="edit-uni-intl"
                  name="intlStudents"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={university.intlStudents ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-uni-ielts" className={labelClassName}>
                  IELTS minimum
                </label>
                <input
                  id="edit-uni-ielts"
                  name="ieltsMinScore"
                  type="number"
                  min={0}
                  max={9}
                  step="0.5"
                  defaultValue={university.ieltsMinScore ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-uni-toefl" className={labelClassName}>
                  TOEFL minimum
                </label>
                <input
                  id="edit-uni-toefl"
                  name="toeflMinScore"
                  type="number"
                  min={0}
                  defaultValue={university.toeflMinScore ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-uni-sat" className={labelClassName}>
                  SAT policy
                </label>
                <input
                  id="edit-uni-sat"
                  name="satPolicy"
                  type="text"
                  defaultValue={university.satPolicy ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-uni-difficulty" className={labelClassName}>
                  Difficulty
                </label>
                <select
                  id="edit-uni-difficulty"
                  name="difficulty"
                  defaultValue={university.difficulty ?? ""}
                  className={inputClassName}
                >
                  <option value="">Not set</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="edit-uni-documents" className={labelClassName}>
                  Required documents (one per line)
                </label>
                <textarea
                  id="edit-uni-documents"
                  name="documents"
                  rows={5}
                  defaultValue={university.documentsText}
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
                  defaultChecked={university.isActive}
                  className="h-4 w-4 rounded border-[#e0deda]"
                />
                Active in catalog
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#4a4a4a]">
                <input
                  type="checkbox"
                  name="isPriority"
                  defaultChecked={university.isPriority}
                  className="h-4 w-4 rounded border-[#e0deda]"
                />
                Priority deadline
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#4a4a4a]">
                <input
                  type="checkbox"
                  name="isScholarshipAvailable"
                  defaultChecked={university.isScholarshipAvailable}
                  className="h-4 w-4 rounded border-[#e0deda]"
                />
                Scholarships available
              </label>
            </div>
          </div>

            </fieldset>
          </div>

          <div className="shrink-0 border-t border-[#ece9e4] bg-white px-6 py-4">
            {error ? (
              <p className="mb-3 text-[13px] text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#1B4332] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
