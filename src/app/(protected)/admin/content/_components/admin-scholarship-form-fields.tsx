"use client";

import { useEffect, useState } from "react";

import type { AdminCountryOption } from "@/actions/admin-scholarships";
import { CountryMultiSelectAutocomplete } from "@/app/(protected)/admin/users/_components/country-multi-select-autocomplete";
import type { AdminScholarshipDetailScholarship } from "../scholarships/[id]/_lib/fetch-admin-scholarship-detail";

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

function parseDestinationCodesCsv(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((c) => c.trim().toUpperCase().slice(0, 2))
        .filter((c) => c.length === 2),
    ),
  ];
}

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

export type AdminScholarshipFormFieldsProps = {
  countries: AdminCountryOption[];
  initial?: Partial<AdminScholarshipDetailScholarship>;
  scholarshipId?: string;
  disabled?: boolean;
};

export function AdminScholarshipFormFields({
  countries,
  initial,
  scholarshipId,
  disabled = false,
}: AdminScholarshipFormFieldsProps) {
  const s = initial;
  const [destinationCountryCodes, setDestinationCountryCodes] = useState<string[]>(() =>
    parseDestinationCodesCsv(s?.destinationCountryCodes),
  );

  useEffect(() => {
    setDestinationCountryCodes(parseDestinationCodesCsv(initial?.destinationCountryCodes));
  }, [initial?.destinationCountryCodes]);

  const countryOptions = countries.map((c) => ({ id: c.id, name: c.name }));

  return (
    <fieldset
      disabled={disabled}
      className="m-0 min-w-0 space-y-6 border-0 p-0 disabled:pointer-events-none disabled:opacity-60"
    >
      {scholarshipId ? <input type="hidden" name="scholarshipId" value={scholarshipId} /> : null}

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
            <label className={labelClassName}>Eligible nationality *</label>
            <select
              name="nationalityCountryCode"
              required
              defaultValue={s?.nationalityCountryCode ?? ""}
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
            <label className={labelClassName}>Type</label>
            <select name="type" defaultValue={s?.type ?? ""} className={inputClassName}>
              <option value="">—</option>
              <option value="government">Government</option>
              <option value="university">University</option>
              <option value="corporate">Corporate</option>
              <option value="foundation">Foundation</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <CountryMultiSelectAutocomplete
              id="scholarship-destination-countries"
              label="Destination countries"
              options={countryOptions}
              value={destinationCountryCodes}
              onChange={setDestinationCountryCodes}
              hiddenInputName="destinationCountryCodes"
              placeholder="Search by country name or code, press Enter to add…"
              hint="Type to search, then press Enter or click a suggestion to add a destination."
              inputClassName={inputClassName}
              labelClassName={labelClassName}
              disabled={disabled}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClassName}>Description</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={s?.description ?? ""}
              className={inputClassName}
            />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>Eligibility &amp; benefits</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClassName}>Target students</label>
            <input
              name="targetStudents"
              defaultValue={s?.targetStudents ?? ""}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Level</label>
            <input name="level" defaultValue={s?.level ?? ""} className={inputClassName} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClassName}>Fields (comma-separated)</label>
            <input
              name="fields"
              defaultValue={s?.fieldsText ?? ""}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Coverage</label>
            <input name="coverage" defaultValue={s?.coverage ?? ""} className={inputClassName} />
          </div>
          <div>
            <label className={labelClassName}>Competition</label>
            <select
              name="competition"
              defaultValue={s?.competition ?? ""}
              className={inputClassName}
            >
              <option value="">—</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="very_high">Very high</option>
            </select>
          </div>
          <div>
            <label className={labelClassName}>Tuition type</label>
            <select
              name="tuitionType"
              defaultValue={s?.tuitionType ?? ""}
              className={inputClassName}
            >
              <option value="">—</option>
              <option value="full">Full</option>
              <option value="partial">Partial</option>
            </select>
          </div>
          <div>
            <label className={labelClassName}>Tuition</label>
            <input name="tuition" defaultValue={s?.tuition ?? ""} className={inputClassName} />
          </div>
          <div>
            <label className={labelClassName}>Travel</label>
            <input name="travel" defaultValue={s?.travel ?? ""} className={inputClassName} />
          </div>
          <div>
            <label className={labelClassName}>Living stipend</label>
            <input
              name="livingStipend"
              defaultValue={s?.livingStipend ?? ""}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Other benefits</label>
            <input
              name="otherBenefits"
              defaultValue={s?.otherBenefits ?? ""}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-wrap gap-4 sm:col-span-2">
            <CheckboxField name="isRenewable" label="Renewable" defaultChecked={s?.isRenewable} />
            <CheckboxField name="isActive" label="Active" defaultChecked={s?.isActive ?? true} />
            <CheckboxField name="isPriority" label="Priority" defaultChecked={s?.isPriority} />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>Requirements &amp; application</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClassName}>City</label>
            <input name="city" defaultValue={s?.city ?? ""} className={inputClassName} />
          </div>
          <div>
            <label className={labelClassName}>Academic eligibility</label>
            <input
              name="academicEligibility"
              defaultValue={s?.academicEligibility ?? ""}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>IELTS min</label>
            <input
              name="ieltsMinScore"
              type="number"
              step="0.5"
              defaultValue={s?.ieltsMinScore ?? ""}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>TOEFL min</label>
            <input
              name="toeflMinScore"
              type="number"
              defaultValue={s?.toeflMinScore ?? ""}
              className={inputClassName}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClassName}>SAT policy</label>
            <input name="satPolicy" defaultValue={s?.satPolicy ?? ""} className={inputClassName} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClassName}>Required documents (one per line)</label>
            <textarea
              name="documents"
              rows={4}
              defaultValue={s?.documentsText ?? ""}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Deadline date</label>
            <input
              name="deadlineDate"
              type="date"
              defaultValue={s?.deadlineDate ?? ""}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Deadline (display)</label>
            <input name="deadline" defaultValue={s?.deadline ?? ""} className={inputClassName} />
          </div>
          <div>
            <label className={labelClassName}>Application fee</label>
            <input
              name="applicationFee"
              type="number"
              step="0.01"
              defaultValue={s?.applicationFee ?? ""}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Intakes</label>
            <input name="intakes" defaultValue={s?.intakes ?? ""} className={inputClassName} />
          </div>
          <div>
            <label className={labelClassName}>Application method</label>
            <input name="method" defaultValue={s?.method ?? ""} className={inputClassName} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClassName}>Application website URL</label>
            <input
              name="applicationUrl"
              type="url"
              inputMode="url"
              placeholder="https://example.edu/apply"
              defaultValue={s?.applicationUrl ?? ""}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Discovery slug</label>
            <input
              name="discoverySlug"
              defaultValue={s?.discoverySlug ?? ""}
              className={inputClassName}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClassName}>Other notes</label>
            <textarea name="other" rows={2} defaultValue={s?.other ?? ""} className={inputClassName} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClassName}>Coverage note (green box on student detail)</label>
            <input name="tooltip" defaultValue={s?.tooltip ?? ""} className={inputClassName} />
          </div>
        </div>
      </section>
    </fieldset>
  );
}
