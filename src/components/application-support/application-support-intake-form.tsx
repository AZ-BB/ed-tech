"use client";

import type { ApplicationSupportPayload } from "@/lib/application-support-intake";
import {
  COUNTRY_OPTIONS,
  NATIONALITY_OPTIONS,
  VF_APPLY_TIMING_CHIPS,
  VF_DESTINATION_CHIPS,
  VF_GRADE_YEAR_OPTIONS,
} from "@/app/(protected)/student/application-support/_data/application-support-options";

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C] disabled:opacity-60";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

const selectClassName = `${inputClassName} cursor-pointer appearance-none bg-[length:10px_6px] bg-[position:right_10px_center] bg-no-repeat pr-9`;

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const chipClassName =
  "rounded-full border border-[#e0deda] bg-white px-3 py-1.5 text-[12px] font-medium text-[#4a4a4a] transition-colors hover:border-[#40916C]";

const chipSelectedClassName =
  "rounded-full border border-[#40916C] bg-[#E8F5EE] px-3 py-1.5 text-[12px] font-semibold text-[#2D6A4F]";

const sectionTitleClassName =
  "mb-3 border-b border-[#ece9e4] pb-2 text-[13px] font-bold uppercase tracking-wide text-[#2D6A4F]";

type ApplicationSupportIntakeFormProps = {
  value: ApplicationSupportPayload;
  onChange: (next: ApplicationSupportPayload) => void;
  disabled?: boolean;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className={sectionTitleClassName}>{children}</h3>;
}

function toggleChip(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function ApplicationSupportIntakeForm({
  value,
  onChange,
  disabled = false,
}: ApplicationSupportIntakeFormProps) {
  function patch(partial: Partial<ApplicationSupportPayload>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle>Basic information</SectionTitle>
        <div className="space-y-4">
          <div>
            <label htmlFor="intake-student-name" className={labelClassName}>
              Full name
            </label>
            <input
              id="intake-student-name"
              type="text"
              disabled={disabled}
              value={value.studentName}
              onChange={(event) => patch({ studentName: event.target.value })}
              className={inputClassName}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="intake-email" className={labelClassName}>
                Email
              </label>
              <input
                id="intake-email"
                type="email"
                disabled={disabled}
                value={value.email}
                onChange={(event) => patch({ email: event.target.value })}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="intake-phone" className={labelClassName}>
                Phone
              </label>
              <input
                id="intake-phone"
                type="tel"
                disabled={disabled}
                value={value.phone}
                onChange={(event) => patch({ phone: event.target.value })}
                className={inputClassName}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="intake-nationality" className={labelClassName}>
                Nationality
              </label>
              <select
                id="intake-nationality"
                disabled={disabled}
                value={value.nationality}
                onChange={(event) => patch({ nationality: event.target.value })}
                className={selectClassName}
                style={{ backgroundImage: SELECT_CHEVRON }}
              >
                <option value="">Select</option>
                {NATIONALITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="intake-country" className={labelClassName}>
                Country of residence
              </label>
              <select
                id="intake-country"
                disabled={disabled}
                value={value.countryOfResidence}
                onChange={(event) => patch({ countryOfResidence: event.target.value })}
                className={selectClassName}
                style={{ backgroundImage: SELECT_CHEVRON }}
              >
                <option value="">Select</option>
                {COUNTRY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="intake-school" className={labelClassName}>
                School name
              </label>
              <input
                id="intake-school"
                type="text"
                disabled={disabled}
                value={value.schoolName}
                onChange={(event) => patch({ schoolName: event.target.value })}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="intake-grade" className={labelClassName}>
                Current grade / year
              </label>
              <select
                id="intake-grade"
                disabled={disabled}
                value={value.currentGradeYear}
                onChange={(event) => patch({ currentGradeYear: event.target.value })}
                className={selectClassName}
                style={{ backgroundImage: SELECT_CHEVRON }}
              >
                <option value="">Select</option>
                {VF_GRADE_YEAR_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>Direction</SectionTitle>
        <div className="space-y-4">
          <div>
            <div className={labelClassName}>Where do you want to study?</div>
            <div className="flex flex-wrap gap-2">
              {VF_DESTINATION_CHIPS.map((chip) => {
                const selected = value.destinations.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      patch({ destinations: toggleChip(value.destinations, chip) })
                    }
                    className={selected ? chipSelectedClassName : chipClassName}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label htmlFor="intake-field" className={labelClassName}>
              Field of study
            </label>
            <input
              id="intake-field"
              type="text"
              disabled={disabled}
              value={value.fieldOfStudy}
              onChange={(event) => patch({ fieldOfStudy: event.target.value })}
              className={inputClassName}
              placeholder="e.g. Computer Science, Medicine"
            />
          </div>
          <div>
            <div className={labelClassName}>When are you applying?</div>
            <div className="flex flex-wrap gap-2">
              {VF_APPLY_TIMING_CHIPS.map((chip) => {
                const selected = value.applyTiming === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    disabled={disabled}
                    onClick={() => patch({ applyTiming: chip })}
                    className={selected ? chipSelectedClassName : chipClassName}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className={labelClassName}>How clear is your plan?</div>
            <div className="space-y-2">
              {(
                [
                  { key: "clear" as const, title: "I have a clear plan" },
                  { key: "some" as const, title: "I have some ideas" },
                  { key: "help" as const, title: "I need help figuring it out" },
                ] as const
              ).map(({ key, title }) => {
                const selected = value.planClarity === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => patch({ planClarity: key })}
                    className={`flex w-full items-center gap-2 rounded-[8px] border px-3 py-2.5 text-left text-[13px] transition-colors ${
                      selected
                        ? "border-[#40916C] bg-[#E8F5EE] font-semibold text-[#2D6A4F]"
                        : "border-[#e0deda] bg-white text-[#4a4a4a] hover:border-[#40916C]"
                    }`}
                  >
                    <span
                      className={`h-3.5 w-3.5 shrink-0 rounded-full border ${
                        selected ? "border-[#40916C] bg-[#40916C]" : "border-[#c8c4bc]"
                      }`}
                      aria-hidden
                    />
                    {title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>University preferences</SectionTitle>
        <div className="space-y-4">
          <div>
            <label htmlFor="intake-universities" className={labelClassName}>
              Target universities (one per line)
            </label>
            <textarea
              id="intake-universities"
              disabled={disabled}
              rows={3}
              value={value.universities.join("\n")}
              onChange={(event) =>
                patch({
                  universities: event.target.value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean),
                })
              }
              className={`${inputClassName} resize-y`}
              placeholder="University of Toronto&#10;UCL"
            />
          </div>
          <div>
            <label htmlFor="intake-uni-notes" className={labelClassName}>
              Notes
            </label>
            <textarea
              id="intake-uni-notes"
              disabled={disabled}
              rows={3}
              value={value.uniNotes}
              onChange={(event) => patch({ uniNotes: event.target.value })}
              className={`${inputClassName} resize-y`}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
