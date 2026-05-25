"use client";

import { updateAdminSchool } from "@/actions/admin-schools";
import type { AdminSchoolDetailPayload } from "../_lib/fetch-admin-school-detail";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminEditSchoolDialogProps = {
  open: boolean;
  onClose: () => void;
  school: AdminSchoolDetailPayload["school"];
  credits: AdminSchoolDetailPayload["credits"];
  countries: AdminSchoolDetailPayload["countries"];
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

export function AdminEditSchoolDialog({
  open,
  onClose,
  school,
  credits,
  countries,
}: AdminEditSchoolDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(form);
    const result = await updateAdminSchool(formData);

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
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-edit-school-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="admin-edit-school-title" className="text-[18px] font-semibold text-[#1a1a1a]">
          Edit School
        </h2>
        <p className="mt-2 text-[13px] text-[#666]">
          Update school profile, billing, and credit settings.
        </p>

        <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
          <input type="hidden" name="schoolId" value={school.id} />

          <div>
            <h3 className="mb-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#a0a0a0]">
              Profile
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="edit-school-name" className={labelClassName}>
                  School name
                </label>
                <input
                  id="edit-school-name"
                  name="name"
                  type="text"
                  required
                  defaultValue={school.name}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-school-code" className={labelClassName}>
                  Code
                </label>
                <input
                  id="edit-school-code"
                  name="code"
                  type="text"
                  required
                  defaultValue={school.code}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-school-email" className={labelClassName}>
                  Contact email
                </label>
                <input
                  id="edit-school-email"
                  name="contactEmail"
                  type="email"
                  required
                  defaultValue={school.contactEmail}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-school-city" className={labelClassName}>
                  City
                </label>
                <input
                  id="edit-school-city"
                  name="city"
                  type="text"
                  defaultValue={school.city ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-school-country" className={labelClassName}>
                  Country
                </label>
                <select
                  id="edit-school-country"
                  name="countryCode"
                  required
                  defaultValue={school.countryCode}
                  className={`${inputClassName} cursor-pointer`}
                >
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-school-limit" className={labelClassName}>
                  Students limit
                </label>
                <input
                  id="edit-school-limit"
                  name="studentsLimit"
                  type="number"
                  min={0}
                  defaultValue={school.studentsLimit ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-school-subscription" className={labelClassName}>
                  Subscription
                </label>
                <select
                  id="edit-school-subscription"
                  name="subscriptionStatus"
                  defaultValue={school.subscriptionStatus}
                  className={`${inputClassName} cursor-pointer`}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#a0a0a0]">
              Credits & billing
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-school-pool" className={labelClassName}>
                  Credit pool
                </label>
                <input
                  id="edit-school-pool"
                  name="creditPool"
                  type="number"
                  min={0}
                  required
                  defaultValue={credits.creditPool ?? 0}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-school-yearly" className={labelClassName}>
                  Yearly credit plan
                </label>
                <input
                  id="edit-school-yearly"
                  name="yearlyCreditPlan"
                  type="number"
                  min={0}
                  defaultValue={credits.yearlyCreditPlan ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-school-advisor-limit" className={labelClassName}>
                  Default advisor limit
                </label>
                <input
                  id="edit-school-advisor-limit"
                  name="defaultAdvisorCreditLimit"
                  type="number"
                  min={0}
                  defaultValue={credits.defaultAdvisorLimit ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-school-ambassador-limit" className={labelClassName}>
                  Default ambassador limit
                </label>
                <input
                  id="edit-school-ambassador-limit"
                  name="defaultAmbassadorCreditLimit"
                  type="number"
                  min={0}
                  defaultValue={credits.defaultAmbassadorLimit ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edit-school-renewal" className={labelClassName}>
                  Renewal date
                </label>
                <input
                  id="edit-school-renewal"
                  name="renewalDate"
                  type="date"
                  defaultValue={credits.renewalDate?.slice(0, 10) ?? ""}
                  className={inputClassName}
                />
              </div>
            </div>
          </div>

          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
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
