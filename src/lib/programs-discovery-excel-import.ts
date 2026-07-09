import { formatImportError } from "@/lib/admin-import-error";
import { displayImportName } from "@/lib/admin-import-name-key";
import {
  buildImportProgress,
  type ImportProgressPayload,
} from "@/lib/admin-import-progress";
import {
  buildImportResultSummary,
  type ImportRowAddition,
  type ImportRowUpdate,
  type ImportResultSummaryCore,
} from "@/lib/admin-import-report";
import {
  asJson,
  joinPipeList,
  parsePipeList,
  type ProgramCareerExample,
  type ProgramCareerPath,
  type ProgramCoreSkill,
  type ProgramDayInLife,
  type ProgramEmployer,
  type ProgramSalaryRegion,
  type ProgramsDiscoveryInsert,
  type ProgramStudyPlanYear,
  type ProgramVideo,
} from "@/lib/programs-discovery-types";
import type { AdminProgramDiscoveryExportRow } from "@/app/(protected)/admin/content/_lib/fetch-admin-programs-discovery-export";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

const IMPORT_LOG = "[programs-discovery-import]";

type SupabaseSecretClient = Awaited<
  ReturnType<typeof createSupabaseSecretClient>
>;

export type ProgramsDiscoveryImportSummary = ImportResultSummaryCore & {
  programsUpserted: number;
};

function rowError(
  rowNumber: number,
  name: string,
  message: string,
): { rowNumber: number; message: string } {
  return { rowNumber, message: `${name}: ${message}` };
}

function cell(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

function parseBool(raw: string, defaultValue: boolean): boolean {
  const value = raw.trim().toLowerCase();
  if (!value) return defaultValue;
  if (value === "true" || value === "1" || value === "yes" || value === "y") {
    return true;
  }
  if (value === "false" || value === "0" || value === "no" || value === "n") {
    return false;
  }
  return defaultValue;
}

function slugFromRow(row: Record<string, string>): string {
  return cell(row, "program_id", "slug").toLowerCase();
}

function buildCareerPaths(
  rows: Record<string, string>[],
): ProgramCareerPath[] {
  return rows.map((row) => ({
    title: cell(row, "title"),
    tag: cell(row, "tag") || undefined,
    description: cell(row, "description") || undefined,
    salary_entry: cell(row, "salary_entry") || undefined,
    salary_mid: cell(row, "salary_mid") || undefined,
    salary_senior: cell(row, "salary_senior") || undefined,
    competitiveness: cell(row, "competitiveness") || undefined,
    common_employers:
      parsePipeList(cell(row, "common_employers (| separated)", "common_employers")) ||
      undefined,
  }));
}

function buildCoreSkills(rows: Record<string, string>[]): ProgramCoreSkill[] {
  return rows.map((row) => ({
    skill: cell(row, "skill"),
    level: cell(row, "level") || undefined,
    description: cell(row, "description") || undefined,
  }));
}

function buildStudyPlan(
  rows: Record<string, string>[],
): ProgramStudyPlanYear[] {
  return rows.map((row) => ({
    year: cell(row, "year"),
    title: cell(row, "title"),
    topics:
      parsePipeList(cell(row, "topics (| separated)", "topics")) || undefined,
  }));
}

function buildDayInLife(rows: Record<string, string>[]): ProgramDayInLife[] {
  return rows.map((row) => ({
    time: cell(row, "time"),
    activities:
      parsePipeList(cell(row, "activities (| separated)", "activities")) ||
      undefined,
    notes: cell(row, "notes") || undefined,
  }));
}

function buildSalaryRegions(
  rows: Record<string, string>[],
): ProgramSalaryRegion[] {
  return rows.map((row) => ({
    subfield: cell(row, "subfield") || undefined,
    region: cell(row, "region"),
    entry_salary: cell(row, "entry_salary") || undefined,
    mid_salary: cell(row, "mid_salary") || undefined,
    senior_salary: cell(row, "senior_salary") || undefined,
    demand: cell(row, "demand") || undefined,
  }));
}

function buildCareerExamples(
  rows: Record<string, string>[],
): ProgramCareerExample[] {
  return rows.map((row) => ({
    name: cell(row, "name"),
    role: cell(row, "role") || undefined,
    region: cell(row, "region") || undefined,
    years: cell(row, "years") || undefined,
    path_steps:
      parsePipeList(cell(row, "path_steps (| separated)", "path_steps")) ||
      undefined,
    tag: cell(row, "tag") || undefined,
  }));
}

function buildEmployers(rows: Record<string, string>[]): ProgramEmployer[] {
  return rows.map((row) => ({
    name: cell(row, "name"),
    meta: cell(row, "meta") || undefined,
    region: cell(row, "region") || undefined,
  }));
}

function buildVideos(rows: Record<string, string>[]): ProgramVideo[] {
  return rows.map((row) => ({
    category: cell(row, "category") || undefined,
    title: cell(row, "title"),
    youtube_id: cell(row, "youtube_id"),
    channel: cell(row, "channel") || undefined,
  }));
}

function groupRowsByProgramId(
  sheets: Record<string, Record<string, string>[]>,
): Map<string, Record<string, Record<string, string>[]>> {
  const grouped = new Map<string, Record<string, Record<string, string>[]>>();

  for (const [sheetName, rows] of Object.entries(sheets)) {
    if (sheetName.toLowerCase() === "programs") continue;

    for (const row of rows) {
      const programId = slugFromRow(row);
      if (!programId) continue;

      const programSheets = grouped.get(programId) ?? {};
      const sheetRows = programSheets[sheetName] ?? [];
      sheetRows.push(row);
      programSheets[sheetName] = sheetRows;
      grouped.set(programId, programSheets);
    }
  }

  return grouped;
}

function buildProgramInsert(
  row: Record<string, string>,
  childSheets: Record<string, Record<string, string>[]>,
): ProgramsDiscoveryInsert {
  const slug = slugFromRow(row);

  return {
    slug,
    title: cell(row, "title"),
    category: cell(row, "category"),
    short_description: cell(row, "short_description") || null,
    description: cell(row, "description") || null,
    characteristic_ids:
      parsePipeList(
        cell(row, "characteristic_ids (| separated)", "characteristic_ids"),
      ) || null,
    tags: parsePipeList(cell(row, "tags (| separated)", "tags")) || null,
    salary_potential: cell(row, "salary_potential") || null,
    demand_level: cell(row, "demand_level") || null,
    math_intensity: cell(row, "math_intensity") || null,
    ai_resilience: cell(row, "ai_resilience") || null,
    featured: parseBool(cell(row, "featured"), false),
    active: parseBool(cell(row, "active"), true),
    career_paths: asJson(buildCareerPaths(childSheets.career_paths ?? [])),
    core_skills: asJson(buildCoreSkills(childSheets.core_skills ?? [])),
    study_plan: asJson(buildStudyPlan(childSheets.study_plan ?? [])),
    day_in_life: asJson(buildDayInLife(childSheets.day_in_life ?? [])),
    salary_regions: asJson(buildSalaryRegions(childSheets.salary_regions ?? [])),
    career_examples: asJson(
      buildCareerExamples(childSheets.career_examples ?? []),
    ),
    employers: asJson(buildEmployers(childSheets.employers ?? [])),
    videos: asJson(buildVideos(childSheets.videos ?? [])),
  };
}

export async function importProgramsDiscoveryFromExcelSheets(
  supabase: SupabaseSecretClient,
  sheets: Record<string, Record<string, string>[]>,
  options?: {
    onProgress?: (progress: ImportProgressPayload) => void;
  },
): Promise<ProgramsDiscoveryImportSummary> {
  const programRows =
    sheets.programs ??
    sheets.Programs ??
    Object.values(sheets)[0] ??
    [];

  const childSheetsByProgram = groupRowsByProgramId(sheets);
  const errors: { rowNumber: number; message: string }[] = [];
  const additions: ImportRowAddition[] = [];
  const updates: ImportRowUpdate[] = [];
  let programsUpserted = 0;

  const { data: existingRows, error: existingError } = await supabase
    .from("programs_discovery")
    .select("id, slug");

  if (existingError) throw existingError;

  const slugToId = new Map(
    (existingRows ?? []).map((row) => [row.slug, row.id as string]),
  );

  const seenSlugs = new Set<string>();
  const total = programRows.length;

  for (let index = 0; index < programRows.length; index++) {
    const row = programRows[index]!;
    const rowNumber = index + 2;
    const slug = slugFromRow(row);
    const displayName =
      displayImportName(cell(row, "title")) ||
      slug ||
      `row ${rowNumber}`;

    options?.onProgress?.(
      buildImportProgress("programs", index + 1, total),
    );

    if (!slug) {
      errors.push(rowError(rowNumber, displayName, "program_id is required."));
      continue;
    }

    if (seenSlugs.has(slug)) {
      errors.push(
        rowError(rowNumber, displayName, `Duplicate program_id "${slug}" in file.`),
      );
      continue;
    }
    seenSlugs.add(slug);

    if (!cell(row, "title")) {
      errors.push(rowError(rowNumber, displayName, "title is required."));
      continue;
    }

    if (!cell(row, "category")) {
      errors.push(rowError(rowNumber, displayName, "category is required."));
      continue;
    }

    const childSheets = childSheetsByProgram.get(slug) ?? {};
    const payload = buildProgramInsert(row, childSheets);
    const now = new Date().toISOString();
    const existingId = slugToId.get(slug);

    if (existingId) {
      const { error } = await supabase
        .from("programs_discovery")
        .update({ ...payload, updated_at: now })
        .eq("id", existingId);

      if (error) {
        errors.push(rowError(rowNumber, displayName, formatImportError(error)));
        continue;
      }

      updates.push({ rowNumber, name: displayName, changes: [] });
    } else {
      const { data, error } = await supabase
        .from("programs_discovery")
        .insert({ ...payload, created_at: now, updated_at: now })
        .select("id")
        .single();

      if (error) {
        errors.push(rowError(rowNumber, displayName, formatImportError(error)));
        continue;
      }

      slugToId.set(slug, data.id as string);
      additions.push({ rowNumber, name: displayName });
    }

    programsUpserted += 1;
    console.log(`${IMPORT_LOG} row`, { rowNumber, slug, displayName });
  }

  options?.onProgress?.(buildImportProgress("programs", total, total));

  return {
    ...buildImportResultSummary({
      processed: programRows.length,
      additions,
      updates,
      errors,
    }),
    programsUpserted,
  };
}

export function programsDiscoveryRowToExportSheets(
  row: AdminProgramDiscoveryExportRow,
): Record<string, Record<string, string>[]> {
  const programId = row.slug;

  return {
    programs: [
      {
        program_id: programId,
        title: row.title,
        category: row.category,
        short_description: row.short_description ?? "",
        description: row.description ?? "",
        "characteristic_ids (| separated)": joinPipeList(row.characteristic_ids),
        "tags (| separated)": joinPipeList(row.tags),
        salary_potential: row.salary_potential ?? "",
        demand_level: row.demand_level ?? "",
        math_intensity: row.math_intensity ?? "",
        ai_resilience: row.ai_resilience ?? "",
        featured: row.featured ? "TRUE" : "FALSE",
        active: row.active === false ? "FALSE" : "TRUE",
      },
    ],
    career_paths: (row.career_paths as ProgramCareerPath[] | null)?.map((item) => ({
      program_id: programId,
      title: item.title,
      tag: item.tag ?? "",
      description: item.description ?? "",
      salary_entry: item.salary_entry ?? "",
      salary_mid: item.salary_mid ?? "",
      salary_senior: item.salary_senior ?? "",
      competitiveness: item.competitiveness ?? "",
      "common_employers (| separated)": joinPipeList(item.common_employers),
    })) ?? [],
    core_skills: (row.core_skills as ProgramCoreSkill[] | null)?.map((item) => ({
      program_id: programId,
      skill: item.skill,
      level: item.level ?? "",
      description: item.description ?? "",
    })) ?? [],
    study_plan: (row.study_plan as ProgramStudyPlanYear[] | null)?.map((item) => ({
      program_id: programId,
      year: item.year,
      title: item.title,
      "topics (| separated)": joinPipeList(item.topics),
    })) ?? [],
    day_in_life: (row.day_in_life as ProgramDayInLife[] | null)?.map((item) => ({
      program_id: programId,
      time: item.time,
      "activities (| separated)": joinPipeList(item.activities),
      notes: item.notes ?? "",
    })) ?? [],
    salary_regions: (row.salary_regions as ProgramSalaryRegion[] | null)?.map(
      (item) => ({
        program_id: programId,
        subfield: item.subfield ?? "",
        region: item.region,
        entry_salary: item.entry_salary ?? "",
        mid_salary: item.mid_salary ?? "",
        senior_salary: item.senior_salary ?? "",
        demand: item.demand ?? "",
      }),
    ) ?? [],
    career_examples: (row.career_examples as ProgramCareerExample[] | null)?.map(
      (item) => ({
        program_id: programId,
        name: item.name,
        role: item.role ?? "",
        region: item.region ?? "",
        years: item.years ?? "",
        "path_steps (| separated)": joinPipeList(item.path_steps),
        tag: item.tag ?? "",
      }),
    ) ?? [],
    employers: (row.employers as ProgramEmployer[] | null)?.map((item) => ({
      program_id: programId,
      name: item.name,
      meta: item.meta ?? "",
      region: item.region ?? "",
    })) ?? [],
    videos: (row.videos as ProgramVideo[] | null)?.map((item) => ({
      program_id: programId,
      category: item.category ?? "",
      title: item.title,
      youtube_id: item.youtube_id,
      channel: item.channel ?? "",
    })) ?? [],
  };
}
