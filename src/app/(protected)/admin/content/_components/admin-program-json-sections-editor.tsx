"use client";

import { useMemo, useState, type ReactNode } from "react";

import {
  arrayFromPipeList,
  emptyCareerExampleItem,
  emptyCareerPathItem,
  emptyCoreSkillItem,
  emptyDayInLifeItem,
  emptyEmployerItem,
  emptySalaryRegionItem,
  emptyStudyPlanItem,
  emptyVideoItem,
  pipeListFromArray,
  type ProgramJsonSections,
  serializeProgramJsonSections,
} from "../_lib/admin-program-form-json";
import type {
  ProgramCareerExample,
  ProgramCareerPath,
  ProgramCoreSkill,
  ProgramDayInLife,
  ProgramEmployer,
  ProgramSalaryRegion,
  ProgramStudyPlanYear,
  ProgramVideo,
} from "@/lib/programs-discovery-types";

export const adminProgramInputClass =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";
export const adminProgramLabelClass =
  "mb-1 block text-[12px] font-semibold text-[#4a4a4a]";

type SectionKey = keyof ProgramJsonSections;

const SECTION_LABELS: Record<SectionKey, string> = {
  career_paths: "Career paths",
  core_skills: "Core skills",
  study_plan: "Study plan",
  day_in_life: "Day in life",
  salary_regions: "Salary regions",
  career_examples: "Career examples",
  employers: "Employers",
  videos: "Videos",
};

type AdminProgramJsonSectionsEditorProps = {
  initialValues: ProgramJsonSections;
};

export function AdminProgramJsonSectionsEditor({
  initialValues,
}: AdminProgramJsonSectionsEditorProps) {
  const [sections, setSections] = useState<ProgramJsonSections>(initialValues);
  const [openSection, setOpenSection] = useState<SectionKey | null>("career_paths");

  const serialized = useMemo(
    () => serializeProgramJsonSections(sections),
    [sections],
  );

  function updateSection<K extends SectionKey>(
    key: K,
    updater: (items: ProgramJsonSections[K]) => ProgramJsonSections[K],
  ) {
    setSections((prev) => ({
      ...prev,
      [key]: updater(prev[key]),
    }));
  }

  return (
    <div className="space-y-3 border-t border-[#ece9e4] pt-4">
      <p className="text-[12px] font-semibold text-[#666]">
        Program content sections. Use import/export for bulk editing.
      </p>

      {(Object.keys(SECTION_LABELS) as SectionKey[]).map((key) => (
        <CollapsibleSection
          key={key}
          title={SECTION_LABELS[key]}
          count={sections[key].length}
          open={openSection === key}
          onToggle={() => setOpenSection((current) => (current === key ? null : key))}
          onAdd={() => addItem(key, updateSection)}
        >
          {sections[key].length === 0 ? (
            <p className="text-[12px] text-[#a0a0a0]">No items yet.</p>
          ) : (
            (sections[key] as ProgramJsonSections[typeof key]).map((item, index) => (
              <ItemCard
                key={`${key}-${index}`}
                index={index}
                onRemove={() =>
                  updateSection(key, (items) =>
                    items.filter((_, itemIndex) => itemIndex !== index) as ProgramJsonSections[typeof key],
                  )
                }
              >
                {renderItemFields(key, item, index, updateSection)}
              </ItemCard>
            ))
          )}
        </CollapsibleSection>
      ))}

      <input type="hidden" name="career_paths_json" value={serialized.career_paths_json} />
      <input type="hidden" name="core_skills_json" value={serialized.core_skills_json} />
      <input type="hidden" name="study_plan_json" value={serialized.study_plan_json} />
      <input type="hidden" name="day_in_life_json" value={serialized.day_in_life_json} />
      <input
        type="hidden"
        name="salary_regions_json"
        value={serialized.salary_regions_json}
      />
      <input
        type="hidden"
        name="career_examples_json"
        value={serialized.career_examples_json}
      />
      <input type="hidden" name="employers_json" value={serialized.employers_json} />
      <input type="hidden" name="videos_json" value={serialized.videos_json} />
    </div>
  );
}

function addItem<K extends SectionKey>(
  key: K,
  updateSection: <T extends SectionKey>(
    sectionKey: T,
    updater: (items: ProgramJsonSections[T]) => ProgramJsonSections[T],
  ) => void,
) {
  const factories: Record<SectionKey, () => ProgramJsonSections[SectionKey][number]> = {
    career_paths: emptyCareerPathItem,
    core_skills: emptyCoreSkillItem,
    study_plan: emptyStudyPlanItem,
    day_in_life: emptyDayInLifeItem,
    salary_regions: emptySalaryRegionItem,
    career_examples: emptyCareerExampleItem,
    employers: emptyEmployerItem,
    videos: emptyVideoItem,
  };

  updateSection(key, (items) => [...items, factories[key]()] as ProgramJsonSections[K]);
}

function renderItemFields<K extends SectionKey>(
  key: K,
  item: ProgramJsonSections[K][number],
  index: number,
  updateSection: <T extends SectionKey>(
    sectionKey: T,
    updater: (items: ProgramJsonSections[T]) => ProgramJsonSections[T],
  ) => void,
) {
  switch (key) {
    case "career_paths": {
      const row = item as ProgramCareerPath;
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Title" value={row.title} onChange={(v) => updateCareerPath(updateSection, index, { title: v })} />
          <Field label="Tag" value={row.tag ?? ""} onChange={(v) => updateCareerPath(updateSection, index, { tag: v })} />
          <div className="md:col-span-2">
            <Field label="Description" value={row.description ?? ""} multiline onChange={(v) => updateCareerPath(updateSection, index, { description: v })} />
          </div>
          <Field label="Salary entry" value={row.salary_entry ?? ""} onChange={(v) => updateCareerPath(updateSection, index, { salary_entry: v })} />
          <Field label="Salary mid" value={row.salary_mid ?? ""} onChange={(v) => updateCareerPath(updateSection, index, { salary_mid: v })} />
          <Field label="Salary senior" value={row.salary_senior ?? ""} onChange={(v) => updateCareerPath(updateSection, index, { salary_senior: v })} />
          <Field label="Competitiveness" value={row.competitiveness ?? ""} onChange={(v) => updateCareerPath(updateSection, index, { competitiveness: v })} />
          <div className="md:col-span-2">
            <Field label="Common employers (pipe-separated)" value={pipeListFromArray(row.common_employers)} onChange={(v) => updateCareerPath(updateSection, index, { common_employers: arrayFromPipeList(v) })} />
          </div>
        </div>
      );
    }
    case "core_skills": {
      const row = item as ProgramCoreSkill;
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Skill" value={row.skill} onChange={(v) => updateCoreSkill(updateSection, index, { skill: v })} />
          <Field label="Level" value={row.level ?? ""} onChange={(v) => updateCoreSkill(updateSection, index, { level: v })} />
          <div className="md:col-span-2">
            <Field label="Description" value={row.description ?? ""} multiline onChange={(v) => updateCoreSkill(updateSection, index, { description: v })} />
          </div>
        </div>
      );
    }
    case "study_plan": {
      const row = item as ProgramStudyPlanYear;
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Year" value={row.year} onChange={(v) => updateStudyPlan(updateSection, index, { year: v })} />
          <Field label="Title" value={row.title} onChange={(v) => updateStudyPlan(updateSection, index, { title: v })} />
          <div className="md:col-span-2">
            <Field label="Topics (pipe-separated)" value={pipeListFromArray(row.topics)} onChange={(v) => updateStudyPlan(updateSection, index, { topics: arrayFromPipeList(v) })} />
          </div>
        </div>
      );
    }
    case "day_in_life": {
      const row = item as ProgramDayInLife;
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Time" value={row.time} onChange={(v) => updateDayInLife(updateSection, index, { time: v })} />
          <Field label="Notes" value={row.notes ?? ""} onChange={(v) => updateDayInLife(updateSection, index, { notes: v })} />
          <div className="md:col-span-2">
            <Field label="Activities (pipe-separated)" value={pipeListFromArray(row.activities)} onChange={(v) => updateDayInLife(updateSection, index, { activities: arrayFromPipeList(v) })} />
          </div>
        </div>
      );
    }
    case "salary_regions": {
      const row = item as ProgramSalaryRegion;
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Subfield" value={row.subfield ?? ""} onChange={(v) => updateSalaryRegion(updateSection, index, { subfield: v })} />
          <Field label="Region" value={row.region} onChange={(v) => updateSalaryRegion(updateSection, index, { region: v })} />
          <Field label="Entry salary" value={row.entry_salary ?? ""} onChange={(v) => updateSalaryRegion(updateSection, index, { entry_salary: v })} />
          <Field label="Mid salary" value={row.mid_salary ?? ""} onChange={(v) => updateSalaryRegion(updateSection, index, { mid_salary: v })} />
          <Field label="Senior salary" value={row.senior_salary ?? ""} onChange={(v) => updateSalaryRegion(updateSection, index, { senior_salary: v })} />
          <Field label="Demand" value={row.demand ?? ""} onChange={(v) => updateSalaryRegion(updateSection, index, { demand: v })} />
        </div>
      );
    }
    case "career_examples": {
      const row = item as ProgramCareerExample;
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Name" value={row.name} onChange={(v) => updateCareerExample(updateSection, index, { name: v })} />
          <Field label="Role" value={row.role ?? ""} onChange={(v) => updateCareerExample(updateSection, index, { role: v })} />
          <Field label="Region" value={row.region ?? ""} onChange={(v) => updateCareerExample(updateSection, index, { region: v })} />
          <Field label="Years" value={row.years ?? ""} onChange={(v) => updateCareerExample(updateSection, index, { years: v })} />
          <Field label="Tag" value={row.tag ?? ""} onChange={(v) => updateCareerExample(updateSection, index, { tag: v })} />
          <div className="md:col-span-2">
            <Field label="Path steps (pipe-separated)" value={pipeListFromArray(row.path_steps)} onChange={(v) => updateCareerExample(updateSection, index, { path_steps: arrayFromPipeList(v) })} />
          </div>
        </div>
      );
    }
    case "employers": {
      const row = item as ProgramEmployer;
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Name" value={row.name} onChange={(v) => updateEmployer(updateSection, index, { name: v })} />
          <Field label="Meta" value={row.meta ?? ""} onChange={(v) => updateEmployer(updateSection, index, { meta: v })} />
          <Field label="Region" value={row.region ?? ""} onChange={(v) => updateEmployer(updateSection, index, { region: v })} />
        </div>
      );
    }
    case "videos": {
      const row = item as ProgramVideo;
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Category" value={row.category ?? ""} onChange={(v) => updateVideo(updateSection, index, { category: v })} />
          <Field label="Title" value={row.title} onChange={(v) => updateVideo(updateSection, index, { title: v })} />
          <Field label="YouTube ID" value={row.youtube_id} onChange={(v) => updateVideo(updateSection, index, { youtube_id: v })} />
          <Field label="Channel" value={row.channel ?? ""} onChange={(v) => updateVideo(updateSection, index, { channel: v })} />
        </div>
      );
    }
    default:
      return null;
  }
}

function updateCareerPath(
  updateSection: <T extends SectionKey>(
    sectionKey: T,
    updater: (items: ProgramJsonSections[T]) => ProgramJsonSections[T],
  ) => void,
  index: number,
  patch: Partial<ProgramCareerPath>,
) {
  updateSection("career_paths", (items) =>
    items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
  );
}

function updateCoreSkill(
  updateSection: <T extends SectionKey>(
    sectionKey: T,
    updater: (items: ProgramJsonSections[T]) => ProgramJsonSections[T],
  ) => void,
  index: number,
  patch: Partial<ProgramCoreSkill>,
) {
  updateSection("core_skills", (items) =>
    items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
  );
}

function updateStudyPlan(
  updateSection: <T extends SectionKey>(
    sectionKey: T,
    updater: (items: ProgramJsonSections[T]) => ProgramJsonSections[T],
  ) => void,
  index: number,
  patch: Partial<ProgramStudyPlanYear>,
) {
  updateSection("study_plan", (items) =>
    items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
  );
}

function updateDayInLife(
  updateSection: <T extends SectionKey>(
    sectionKey: T,
    updater: (items: ProgramJsonSections[T]) => ProgramJsonSections[T],
  ) => void,
  index: number,
  patch: Partial<ProgramDayInLife>,
) {
  updateSection("day_in_life", (items) =>
    items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
  );
}

function updateSalaryRegion(
  updateSection: <T extends SectionKey>(
    sectionKey: T,
    updater: (items: ProgramJsonSections[T]) => ProgramJsonSections[T],
  ) => void,
  index: number,
  patch: Partial<ProgramSalaryRegion>,
) {
  updateSection("salary_regions", (items) =>
    items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
  );
}

function updateCareerExample(
  updateSection: <T extends SectionKey>(
    sectionKey: T,
    updater: (items: ProgramJsonSections[T]) => ProgramJsonSections[T],
  ) => void,
  index: number,
  patch: Partial<ProgramCareerExample>,
) {
  updateSection("career_examples", (items) =>
    items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
  );
}

function updateEmployer(
  updateSection: <T extends SectionKey>(
    sectionKey: T,
    updater: (items: ProgramJsonSections[T]) => ProgramJsonSections[T],
  ) => void,
  index: number,
  patch: Partial<ProgramEmployer>,
) {
  updateSection("employers", (items) =>
    items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
  );
}

function updateVideo(
  updateSection: <T extends SectionKey>(
    sectionKey: T,
    updater: (items: ProgramJsonSections[T]) => ProgramJsonSections[T],
  ) => void,
  index: number,
  patch: Partial<ProgramVideo>,
) {
  updateSection("videos", (items) =>
    items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
  );
}

function CollapsibleSection({
  title,
  count,
  open,
  onToggle,
  onAdd,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[10px] border border-[#ece9e4] bg-[#faf9f7]">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="text-[13px] text-[#a0a0a0]">{open ? "▾" : "▸"}</span>
          <span className="text-[13px] font-semibold text-[#1a1a1a]">{title}</span>
          <span className="text-[11px] text-[#a0a0a0]">
            {count} {count === 1 ? "item" : "items"}
          </span>
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 text-[12px] font-semibold text-[#2D6A4F] hover:text-[#1B4332]"
        >
          + Add item
        </button>
      </div>
      {open ? <div className="space-y-3 border-t border-[#ece9e4] px-4 py-3">{children}</div> : null}
    </section>
  );
}

function ItemCard({
  index,
  onRemove,
  children,
}: {
  index: number;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[8px] border border-[#e0deda] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold text-[#666]">Item {index + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-[6px] border border-[#fecaca] px-2.5 py-1 text-[11px] font-semibold text-[#b91c1c]"
        >
          Remove
        </button>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className={adminProgramLabelClass}>{label}</label>
      {multiline ? (
        <textarea
          value={value}
          rows={2}
          onChange={(event) => onChange(event.target.value)}
          className={adminProgramInputClass}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={adminProgramInputClass}
        />
      )}
    </div>
  );
}
