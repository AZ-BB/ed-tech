"use client";

import type {
  AdminProgramDiscoveryOption,
  AdminUniversityOption,
} from "../_lib/fetch-admin-university-programs-page";

export type AdminUniversityProgramNoteValues = {
  rankingNote: string;
  tuitionNote: string;
  shortDescription: string;
  programSchoolNote: string;
  featured: boolean;
};

export type AdminUniversityProgramFormValues = AdminUniversityProgramNoteValues & {
  universityId: string;
  programId: string;
};

type AdminUniversityProgramFormFieldsProps = {
  universityOptions: AdminUniversityOption[];
  programOptions: AdminProgramDiscoveryOption[];
  values?: Partial<AdminUniversityProgramFormValues>;
  disabled?: boolean;
};

type AdminUniversityProgramNoteFieldsProps = {
  values?: Partial<AdminUniversityProgramNoteValues>;
  disabled?: boolean;
};

const inputClass =
  "w-full rounded-[8px] border border-[#e0deda] px-3 py-2 text-[13px] text-[#1a1a1a] outline-none focus:border-[#40916C]";

const labelClass = "mb-1 block text-[12px] font-semibold text-[#4a4a4a]";

function UniversityProgramNoteFields({
  values,
  disabled = false,
}: {
  values?: Partial<AdminUniversityProgramNoteValues>;
  disabled?: boolean;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ranking_note" className={labelClass}>
            Ranking note
          </label>
          <input
            id="ranking_note"
            name="ranking_note"
            type="text"
            disabled={disabled}
            defaultValue={values?.rankingNote ?? ""}
            className={inputClass}
            placeholder="#3 QS World Ranking (Business)"
          />
        </div>

        <div>
          <label htmlFor="tuition_note" className={labelClass}>
            Tuition note
          </label>
          <input
            id="tuition_note"
            name="tuition_note"
            type="text"
            disabled={disabled}
            defaultValue={values?.tuitionNote ?? ""}
            className={inputClass}
            placeholder="USD 62,000/year"
          />
        </div>
      </div>

      <div>
        <label htmlFor="short_description" className={labelClass}>
          Short description
        </label>
        <textarea
          id="short_description"
          name="short_description"
          rows={3}
          disabled={disabled}
          defaultValue={values?.shortDescription ?? ""}
          className={inputClass}
          placeholder="Brief summary for this university's offering of the program."
        />
      </div>

      <div>
        <label htmlFor="program_school_note" className={labelClass}>
          Program / school note
        </label>
        <input
          id="program_school_note"
          name="program_school_note"
          type="text"
          disabled={disabled}
          defaultValue={values?.programSchoolNote ?? ""}
          className={inputClass}
          placeholder="Graduate School of Business"
        />
      </div>

      <label className="flex items-center gap-2 text-[13px] text-[#4a4a4a]">
        <input
          type="checkbox"
          name="featured"
          value="true"
          disabled={disabled}
          defaultChecked={values?.featured ?? false}
          className="h-4 w-4 rounded border-[#e0deda] text-[#2D6A4F] focus:ring-[#40916C]"
        />
        Featured on program page
      </label>
    </>
  );
}

export function AdminUniversityProgramNoteFields({
  values,
  disabled = false,
}: AdminUniversityProgramNoteFieldsProps) {
  return (
    <div className="space-y-4">
      <UniversityProgramNoteFields values={values} disabled={disabled} />
    </div>
  );
}

export function AdminUniversityProgramFormFields({
  universityOptions,
  programOptions,
  values,
  disabled = false,
}: AdminUniversityProgramFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="university_id" className={labelClass}>
            University
          </label>
          <select
            id="university_id"
            name="university_id"
            required
            disabled={disabled}
            defaultValue={values?.universityId ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Select university…
            </option>
            {universityOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
                {option.city ? ` · ${option.city}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="program_id" className={labelClass}>
            Program
          </label>
          <select
            id="program_id"
            name="program_id"
            required
            disabled={disabled}
            defaultValue={values?.programId ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Select program…
            </option>
            {programOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title} ({option.slug})
              </option>
            ))}
          </select>
        </div>
      </div>

      <UniversityProgramNoteFields values={values} disabled={disabled} />
    </div>
  );
}
