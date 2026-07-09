"use client";

import { joinPipeList } from "@/lib/programs-discovery-types";

import { parseProgramJsonSectionsFromStrings } from "../_lib/admin-program-form-json";
import { AdminProgramJsonSectionsEditor } from "./admin-program-json-sections-editor";

export type AdminProgramFormValues = {
  slug: string;
  title: string;
  category: string;
  short_description: string;
  description: string;
  characteristic_ids: string;
  tags: string;
  salary_potential: string;
  demand_level: string;
  math_intensity: string;
  ai_resilience: string;
  featured: boolean;
  active: boolean;
  career_paths_json: string;
  core_skills_json: string;
  study_plan_json: string;
  day_in_life_json: string;
  salary_regions_json: string;
  career_examples_json: string;
  employers_json: string;
  videos_json: string;
};

export const EMPTY_ADMIN_PROGRAM_FORM: AdminProgramFormValues = {
  slug: "",
  title: "",
  category: "",
  short_description: "",
  description: "",
  characteristic_ids: "",
  tags: "",
  salary_potential: "",
  demand_level: "",
  math_intensity: "",
  ai_resilience: "",
  featured: false,
  active: true,
  career_paths_json: "[]",
  core_skills_json: "[]",
  study_plan_json: "[]",
  day_in_life_json: "[]",
  salary_regions_json: "[]",
  career_examples_json: "[]",
  employers_json: "[]",
  videos_json: "[]",
};

const inputClass =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";
const labelClass = "mb-1 block text-[12px] font-semibold text-[#4a4a4a]";

type AdminProgramFormFieldsProps = {
  values?: Partial<AdminProgramFormValues>;
  showJsonSections?: boolean;
  slugReadOnly?: boolean;
};

export function AdminProgramFormFields({
  values,
  showJsonSections = false,
  slugReadOnly = false,
}: AdminProgramFormFieldsProps) {
  const form = { ...EMPTY_ADMIN_PROGRAM_FORM, ...values };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="slug">
            Slug / program_id
          </label>
          <input
            id="slug"
            name="slug"
            defaultValue={form.slug}
            readOnly={slugReadOnly}
            className={inputClass}
            placeholder="finance"
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="title">
            Title
          </label>
          <input
            id="title"
            name="title"
            defaultValue={form.title}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="category">
            Category
          </label>
          <input
            id="category"
            name="category"
            defaultValue={form.category}
            className={inputClass}
            placeholder="BUSINESS"
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="salary_potential">
            Salary potential
          </label>
          <input
            id="salary_potential"
            name="salary_potential"
            defaultValue={form.salary_potential}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="short_description">
          Short description
        </label>
        <textarea
          id="short_description"
          name="short_description"
          defaultValue={form.short_description}
          rows={2}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={form.description}
          rows={4}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="characteristic_ids">
            Characteristic IDs (pipe-separated)
          </label>
          <input
            id="characteristic_ids"
            name="characteristic_ids"
            defaultValue={form.characteristic_ids}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="tags">
            Tags (pipe-separated)
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={form.tags}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="demand_level">
            Demand level
          </label>
          <input
            id="demand_level"
            name="demand_level"
            defaultValue={form.demand_level}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="math_intensity">
            Math intensity
          </label>
          <input
            id="math_intensity"
            name="math_intensity"
            defaultValue={form.math_intensity}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="ai_resilience">
            AI resilience
          </label>
          <input
            id="ai_resilience"
            name="ai_resilience"
            defaultValue={form.ai_resilience}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-[13px] text-[#4a4a4a]">
          <input
            type="checkbox"
            name="featured"
            value="true"
            defaultChecked={form.featured}
          />
          Featured
        </label>
        <label className="flex items-center gap-2 text-[13px] text-[#4a4a4a]">
          <input
            type="checkbox"
            name="active"
            value="true"
            defaultChecked={form.active}
          />
          Active
        </label>
      </div>

      {showJsonSections ? (
        <AdminProgramJsonSectionsEditor
          key={form.slug || "program-json-sections"}
          initialValues={parseProgramJsonSectionsFromStrings({
            career_paths_json: form.career_paths_json,
            core_skills_json: form.core_skills_json,
            study_plan_json: form.study_plan_json,
            day_in_life_json: form.day_in_life_json,
            salary_regions_json: form.salary_regions_json,
            career_examples_json: form.career_examples_json,
            employers_json: form.employers_json,
            videos_json: form.videos_json,
          })}
        />
      ) : null}
    </div>
  );
}

export function programRowToFormValues(program: {
  slug: string;
  title: string;
  category: string;
  short_description: string | null;
  description: string | null;
  characteristic_ids: string[] | null;
  tags: string[] | null;
  salary_potential: string | null;
  demand_level: string | null;
  math_intensity: string | null;
  ai_resilience: string | null;
  featured: boolean | null;
  active: boolean | null;
  career_paths_json: string;
  core_skills_json: string;
  study_plan_json: string;
  day_in_life_json: string;
  salary_regions_json: string;
  career_examples_json: string;
  employers_json: string;
  videos_json: string;
}): AdminProgramFormValues {
  return {
    slug: program.slug,
    title: program.title,
    category: program.category,
    short_description: program.short_description ?? "",
    description: program.description ?? "",
    characteristic_ids: joinPipeList(program.characteristic_ids),
    tags: joinPipeList(program.tags),
    salary_potential: program.salary_potential ?? "",
    demand_level: program.demand_level ?? "",
    math_intensity: program.math_intensity ?? "",
    ai_resilience: program.ai_resilience ?? "",
    featured: program.featured ?? false,
    active: program.active ?? true,
    career_paths_json: program.career_paths_json,
    core_skills_json: program.core_skills_json,
    study_plan_json: program.study_plan_json,
    day_in_life_json: program.day_in_life_json,
    salary_regions_json: program.salary_regions_json,
    career_examples_json: program.career_examples_json,
    employers_json: program.employers_json,
    videos_json: program.videos_json,
  };
}
