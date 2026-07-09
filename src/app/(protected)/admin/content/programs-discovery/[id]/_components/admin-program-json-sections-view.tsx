import type { ReactNode } from "react";

import type {
  ProgramCareerExample,
  ProgramCareerPath,
  ProgramCoreSkill,
  ProgramDayInLife,
  ProgramEmployer,
  ProgramSalaryRegion,
  ProgramStudyPlanYear,
  ProgramVideo,
  ProgramsDiscoveryRow,
} from "@/lib/programs-discovery-types";

import { parseProgramJsonSectionsFromRow } from "../../../_lib/admin-program-form-json";

type AdminProgramJsonSectionsViewProps = {
  program: Pick<
    ProgramsDiscoveryRow,
    | "career_paths"
    | "core_skills"
    | "study_plan"
    | "day_in_life"
    | "salary_regions"
    | "career_examples"
    | "employers"
    | "videos"
  >;
};

export function AdminProgramJsonSectionsView({
  program,
}: AdminProgramJsonSectionsViewProps) {
  const sections = parseProgramJsonSectionsFromRow(program);

  return (
    <div className="space-y-4">
      <SectionPanel title="Career paths" items={sections.career_paths}>
        {(item) => <CareerPathView item={item} />}
      </SectionPanel>
      <SectionPanel title="Core skills" items={sections.core_skills}>
        {(item) => <CoreSkillView item={item} />}
      </SectionPanel>
      <SectionPanel title="Study plan" items={sections.study_plan}>
        {(item) => <StudyPlanView item={item} />}
      </SectionPanel>
      <SectionPanel title="Day in life" items={sections.day_in_life}>
        {(item) => <DayInLifeView item={item} />}
      </SectionPanel>
      <SectionPanel title="Salary regions" items={sections.salary_regions}>
        {(item) => <SalaryRegionView item={item} />}
      </SectionPanel>
      <SectionPanel title="Career examples" items={sections.career_examples}>
        {(item) => <CareerExampleView item={item} />}
      </SectionPanel>
      <SectionPanel title="Employers" items={sections.employers}>
        {(item) => <EmployerView item={item} />}
      </SectionPanel>
      <SectionPanel title="Videos" items={sections.videos}>
        {(item) => <VideoView item={item} />}
      </SectionPanel>
    </div>
  );
}

function SectionPanel<T>({
  title,
  items,
  children,
}: {
  title: string;
  items: T[];
  children: (item: T, index: number) => ReactNode;
}) {
  return (
    <section className="rounded-[12px] border border-[#ece9e4] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-bold text-[#1a1a1a]">{title}</h2>
        <span className="text-[11px] text-[#a0a0a0]">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-[13px] text-[#a0a0a0]">No data yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <div
              key={`${title}-${index}`}
              className="rounded-[8px] border border-[#ece9e4] bg-[#faf9f7] p-4"
            >
              {children(item, index)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
        {label}
      </div>
      <div className="mt-1 text-[13px] text-[#4a4a4a]">{value}</div>
    </div>
  );
}

function ListRow({
  label,
  values,
}: {
  label: string;
  values: string[] | null | undefined;
}) {
  const items = values?.filter(Boolean) ?? [];
  if (!items.length) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
        {label}
      </div>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-[#4a4a4a]">
        {items.map((item, index) => (
          <li key={`${label}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function CareerPathView({ item }: { item: ProgramCareerPath }) {
  return (
    <div className="space-y-3">
      <div className="text-[14px] font-semibold text-[#1a1a1a]">{item.title}</div>
      <div className="grid gap-3 md:grid-cols-2">
        <InfoRow label="Tag" value={item.tag} />
        <InfoRow label="Competitiveness" value={item.competitiveness} />
        <InfoRow label="Salary entry" value={item.salary_entry} />
        <InfoRow label="Salary mid" value={item.salary_mid} />
        <InfoRow label="Salary senior" value={item.salary_senior} />
      </div>
      <InfoRow label="Description" value={item.description} />
      <ListRow label="Common employers" values={item.common_employers} />
    </div>
  );
}

function CoreSkillView({ item }: { item: ProgramCoreSkill }) {
  return (
    <div className="space-y-3">
      <div className="text-[14px] font-semibold text-[#1a1a1a]">{item.skill}</div>
      <div className="grid gap-3 md:grid-cols-2">
        <InfoRow label="Level" value={item.level} />
      </div>
      <InfoRow label="Description" value={item.description} />
    </div>
  );
}

function StudyPlanView({ item }: { item: ProgramStudyPlanYear }) {
  return (
    <div className="space-y-3">
      <div className="text-[14px] font-semibold text-[#1a1a1a]">
        {item.year ? `Year ${item.year}` : "Year"} — {item.title}
      </div>
      <ListRow label="Topics" values={item.topics} />
    </div>
  );
}

function DayInLifeView({ item }: { item: ProgramDayInLife }) {
  return (
    <div className="space-y-3">
      <div className="text-[14px] font-semibold text-[#1a1a1a]">{item.time}</div>
      <ListRow label="Activities" values={item.activities} />
      <InfoRow label="Notes" value={item.notes} />
    </div>
  );
}

function SalaryRegionView({ item }: { item: ProgramSalaryRegion }) {
  return (
    <div className="space-y-3">
      <div className="text-[14px] font-semibold text-[#1a1a1a]">
        {item.subfield ? `${item.subfield} · ` : ""}
        {item.region}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <InfoRow label="Entry salary" value={item.entry_salary} />
        <InfoRow label="Mid salary" value={item.mid_salary} />
        <InfoRow label="Senior salary" value={item.senior_salary} />
        <InfoRow label="Demand" value={item.demand} />
      </div>
    </div>
  );
}

function CareerExampleView({ item }: { item: ProgramCareerExample }) {
  return (
    <div className="space-y-3">
      <div className="text-[14px] font-semibold text-[#1a1a1a]">{item.name}</div>
      <div className="grid gap-3 md:grid-cols-2">
        <InfoRow label="Role" value={item.role} />
        <InfoRow label="Region" value={item.region} />
        <InfoRow label="Years" value={item.years} />
        <InfoRow label="Tag" value={item.tag} />
      </div>
      <ListRow label="Path steps" values={item.path_steps} />
    </div>
  );
}

function EmployerView({ item }: { item: ProgramEmployer }) {
  return (
    <div className="space-y-3">
      <div className="text-[14px] font-semibold text-[#1a1a1a]">{item.name}</div>
      <div className="grid gap-3 md:grid-cols-2">
        <InfoRow label="Meta" value={item.meta} />
        <InfoRow label="Region" value={item.region} />
      </div>
    </div>
  );
}

function VideoView({ item }: { item: ProgramVideo }) {
  return (
    <div className="space-y-3">
      <div className="text-[14px] font-semibold text-[#1a1a1a]">{item.title}</div>
      <div className="grid gap-3 md:grid-cols-2">
        <InfoRow label="Category" value={item.category} />
        <InfoRow label="YouTube ID" value={item.youtube_id} />
        <InfoRow label="Channel" value={item.channel} />
      </div>
    </div>
  );
}
