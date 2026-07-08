"use client";

import type { AdminCountryOption } from "@/actions/admin-internships";
import type { AdminInternshipDetailInternship } from "../internships/[id]/_lib/fetch-admin-internship-detail";

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

function CheckboxField({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#4a4a4a]">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-[#e0deda] text-[#2D6A4F]"
      />
      {label}
    </label>
  );
}

export type AdminInternshipFormFieldsProps = {
  countries: AdminCountryOption[];
  initial?: Partial<AdminInternshipDetailInternship>;
  internshipId?: string;
  disabled?: boolean;
};

export function AdminInternshipFormFields({
  countries,
  initial,
  internshipId,
  disabled = false,
}: AdminInternshipFormFieldsProps) {
  const s = initial;

  return (
    <fieldset
      disabled={disabled}
      className="m-0 min-w-0 space-y-6 border-0 p-0 disabled:pointer-events-none disabled:opacity-60"
    >
      {internshipId ? (
        <input type="hidden" name="internshipId" value={internshipId} />
      ) : null}

      <section>
        <SectionTitle>Basics</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClassName}>Name *</label>
            <input
              name="name"
              required
              defaultValue={s?.name ?? ""}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Provider *</label>
            <input
              name="provider"
              required
              defaultValue={s?.provider ?? ""}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Section *</label>
            <select
              name="section"
              required
              defaultValue={s?.section ?? ""}
              className={inputClassName}
            >
              <option value="">Select section</option>
              <option value="live">Live</option>
              <option value="global">Global</option>
              <option value="competition">Competition</option>
              <option value="find">Find</option>
            </select>
          </div>
          <div>
            <label className={labelClassName}>Country *</label>
            <select
              name="countryCode"
              required
              defaultValue={s?.countryCode ?? ""}
              className={inputClassName}
            >
              <option value="">Select country</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClassName}>Location label *</label>
            <input
              name="locationLabel"
              required
              defaultValue={s?.locationLabel ?? ""}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Format *</label>
            <select
              name="format"
              required
              defaultValue={s?.format ?? ""}
              className={inputClassName}
            >
              <option value="">Select format</option>
              <option value="in_person">In person</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="directory">Directory</option>
            </select>
          </div>
          <div>
            <label className={labelClassName}>Field *</label>
            <input
              name="field"
              required
              defaultValue={s?.field ?? ""}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Slug</label>
            <input
              name="slug"
              defaultValue={s?.slug ?? ""}
              placeholder="Auto-generated from name if blank"
              className={inputClassName}
            />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>Pay &amp; duration</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClassName}>Pay tier *</label>
            <select
              name="payTier"
              required
              defaultValue={s?.payTier ?? ""}
              className={inputClassName}
            >
              <option value="">Select pay tier</option>
              <option value="paid">Paid</option>
              <option value="free">Free</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <div>
            <label className={labelClassName}>Pay label *</label>
            <input
              name="payLabel"
              required
              defaultValue={s?.payLabel ?? ""}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Duration *</label>
            <input
              name="duration"
              required
              defaultValue={s?.duration ?? ""}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Phone</label>
            <input
              name="phone"
              defaultValue={s?.phone ?? ""}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-wrap gap-4 sm:col-span-2">
            <CheckboxField
              name="nationalsOnly"
              label="Nationals only"
              defaultChecked={s?.nationalsOnly}
            />
            <CheckboxField
              name="needsReview"
              label="Needs review"
              defaultChecked={s?.needsReview}
            />
            <CheckboxField
              name="isActive"
              label="Active"
              defaultChecked={s?.isActive ?? true}
            />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>Listing &amp; application</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClassName}>Official URL *</label>
            <input
              name="officialUrl"
              type="url"
              inputMode="url"
              required
              placeholder="https://example.com/apply"
              defaultValue={s?.officialUrl ?? ""}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>URL status *</label>
            <select
              name="urlStatus"
              required
              defaultValue={s?.urlStatus ?? "homepage"}
              className={inputClassName}
            >
              <option value="deep_link">Deep link</option>
              <option value="hub_link">Hub link</option>
              <option value="news_driven">News driven</option>
              <option value="directory">Directory</option>
              <option value="homepage">Homepage</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClassName}>Summary *</label>
            <textarea
              name="summary"
              required
              rows={3}
              defaultValue={s?.summary ?? ""}
              className={inputClassName}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClassName}>
              What you&apos;ll do * (one per line)
            </label>
            <textarea
              name="whatYoullDo"
              required
              rows={4}
              defaultValue={s?.whatYoullDoText ?? ""}
              className={inputClassName}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClassName}>
              What you&apos;ll gain * (one per line)
            </label>
            <textarea
              name="whatYoullGain"
              required
              rows={4}
              defaultValue={s?.whatYoullGainText ?? ""}
              className={inputClassName}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClassName}>Eligibility *</label>
            <textarea
              name="eligibility"
              required
              rows={3}
              defaultValue={s?.eligibility ?? ""}
              className={inputClassName}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClassName}>How to apply *</label>
            <textarea
              name="howToApply"
              required
              rows={3}
              defaultValue={s?.howToApply ?? ""}
              className={inputClassName}
            />
          </div>
        </div>
      </section>
    </fieldset>
  );
}
