import {
  buildMultiSheetAdminWorkbook,
  ensureExcelFilename,
  triggerExcelDownload,
  type AdminExcelColumnDef,
} from "@/lib/admin-excel-utils";
import {
  programsDiscoveryRowToExportSheets,
} from "@/lib/programs-discovery-excel-import";
import type { ProgramsDiscoveryRow } from "@/lib/programs-discovery-types";

import type { AdminProgramDiscoveryExportRow } from "./fetch-admin-programs-discovery-export";

export const PROGRAM_DISCOVERY_SHEET_COLUMNS: Record<string, AdminExcelColumnDef[]> =
  {
    programs: [
      { key: "program_id", header: "program_id", width: 18 },
      { key: "title", header: "title", width: 24 },
      { key: "category", header: "category", width: 16 },
      { key: "short_description", header: "short_description", width: 36 },
      { key: "description", header: "description", width: 40 },
      {
        key: "characteristic_ids (| separated)",
        header: "characteristic_ids (| separated)",
        width: 28,
      },
      { key: "tags (| separated)", header: "tags (| separated)", width: 28 },
      { key: "salary_potential", header: "salary_potential", width: 14 },
      { key: "demand_level", header: "demand_level", width: 14 },
      { key: "math_intensity", header: "math_intensity", width: 14 },
      { key: "ai_resilience", header: "ai_resilience", width: 14 },
      { key: "featured", header: "featured", width: 10 },
      { key: "active", header: "active", width: 10 },
    ],
    career_paths: [
      { key: "program_id", header: "program_id", width: 18 },
      { key: "title", header: "title", width: 24 },
      { key: "tag", header: "tag", width: 16 },
      { key: "description", header: "description", width: 36 },
      { key: "salary_entry", header: "salary_entry", width: 16 },
      { key: "salary_mid", header: "salary_mid", width: 16 },
      { key: "salary_senior", header: "salary_senior", width: 16 },
      { key: "competitiveness", header: "competitiveness", width: 16 },
      {
        key: "common_employers (| separated)",
        header: "common_employers (| separated)",
        width: 28,
      },
    ],
    core_skills: [
      { key: "program_id", header: "program_id", width: 18 },
      { key: "skill", header: "skill", width: 24 },
      { key: "level", header: "level", width: 14 },
      { key: "description", header: "description", width: 36 },
    ],
    study_plan: [
      { key: "program_id", header: "program_id", width: 18 },
      { key: "year", header: "year", width: 8 },
      { key: "title", header: "title", width: 24 },
      { key: "topics (| separated)", header: "topics (| separated)", width: 36 },
    ],
    day_in_life: [
      { key: "program_id", header: "program_id", width: 18 },
      { key: "time", header: "time", width: 14 },
      {
        key: "activities (| separated)",
        header: "activities (| separated)",
        width: 36,
      },
      { key: "notes", header: "notes", width: 24 },
    ],
    salary_regions: [
      { key: "program_id", header: "program_id", width: 18 },
      { key: "subfield", header: "subfield", width: 18 },
      { key: "region", header: "region", width: 16 },
      { key: "entry_salary", header: "entry_salary", width: 16 },
      { key: "mid_salary", header: "mid_salary", width: 16 },
      { key: "senior_salary", header: "senior_salary", width: 16 },
      { key: "demand", header: "demand", width: 12 },
    ],
    career_examples: [
      { key: "program_id", header: "program_id", width: 18 },
      { key: "name", header: "name", width: 24 },
      { key: "role", header: "role", width: 24 },
      { key: "region", header: "region", width: 16 },
      { key: "years", header: "years", width: 12 },
      {
        key: "path_steps (| separated)",
        header: "path_steps (| separated)",
        width: 28,
      },
      { key: "tag", header: "tag", width: 16 },
    ],
    employers: [
      { key: "program_id", header: "program_id", width: 18 },
      { key: "name", header: "name", width: 24 },
      { key: "meta", header: "meta", width: 20 },
      { key: "region", header: "region", width: 16 },
    ],
    videos: [
      { key: "program_id", header: "program_id", width: 18 },
      { key: "category", header: "category", width: 18 },
      { key: "title", header: "title", width: 28 },
      { key: "youtube_id", header: "youtube_id", width: 16 },
      { key: "channel", header: "channel", width: 20 },
    ],
  };

export const PROGRAM_DISCOVERY_EXCEL_SAMPLE_ROW: Record<string, string> = {
  program_id: "finance",
  title: "Finance",
  category: "BUSINESS",
  short_description:
    "Learn how money moves, how investments work, and how financial decisions get made.",
  description: "Finance is the discipline of understanding how money is raised, invested, and managed.",
  "characteristic_ids (| separated)": "numbers-and-money | high-income-path",
  "tags (| separated)": "Money | Markets | Business | Analysis",
  salary_potential: "High",
  demand_level: "Strong",
  math_intensity: "Medium-High",
  ai_resilience: "High",
  featured: "TRUE",
  active: "TRUE",
};

export const PROGRAM_DISCOVERY_EXCEL_SAMPLE_FILENAME =
  "admin-import-programs-discovery-template.xlsx";

function mergeExportSheets(
  rows: AdminProgramDiscoveryExportRow[],
): Record<string, Record<string, string>[]> {
  const merged: Record<string, Record<string, string>[]> = {};

  for (const sheetName of Object.keys(PROGRAM_DISCOVERY_SHEET_COLUMNS)) {
    merged[sheetName] = [];
  }

  for (const row of rows) {
    const sheets = programsDiscoveryRowToExportSheets(row);
    for (const [sheetName, sheetRows] of Object.entries(sheets)) {
      merged[sheetName] = [...(merged[sheetName] ?? []), ...sheetRows];
    }
  }

  return merged;
}

async function buildProgramsDiscoveryWorkbook(
  sheetData: Record<string, Record<string, string>[]>,
  sampleProgramRow = false,
) {
  const sheetOrder = Object.keys(PROGRAM_DISCOVERY_SHEET_COLUMNS);

  return buildMultiSheetAdminWorkbook(
    sheetOrder.map((sheetName) => ({
      sheetName,
      columns: PROGRAM_DISCOVERY_SHEET_COLUMNS[sheetName]!,
      rows: sheetData[sheetName] ?? [],
      sampleRowIndexes:
        sampleProgramRow && sheetName === "programs" ? [0] : undefined,
    })),
  );
}

export async function buildProgramsDiscoverySampleExcelBuffer(): Promise<ArrayBuffer> {
  return buildProgramsDiscoveryWorkbook(
    {
      programs: [PROGRAM_DISCOVERY_EXCEL_SAMPLE_ROW],
      career_paths: [
        {
          program_id: "finance",
          title: "Financial Analyst",
          tag: "Most common",
          description: "Analyze company performance and build financial models.",
          salary_entry: "USD 60K-110K",
          salary_mid: "USD 100K-150K",
          salary_senior: "USD 150K-250K",
          competitiveness: "Moderate",
          "common_employers (| separated)": "PwC | Deloitte | Banks",
        },
      ],
    },
    true,
  );
}

export async function triggerProgramsDiscoverySampleExcelDownload() {
  const buffer = await buildProgramsDiscoverySampleExcelBuffer();
  triggerExcelDownload(buffer, PROGRAM_DISCOVERY_EXCEL_SAMPLE_FILENAME);
}

export async function buildAdminProgramsDiscoveryExcelBuffer(
  rows: AdminProgramDiscoveryExportRow[],
): Promise<ArrayBuffer> {
  return buildProgramsDiscoveryWorkbook(mergeExportSheets(rows));
}

export async function triggerAdminProgramsDiscoveryExcelDownload(
  rows: AdminProgramDiscoveryExportRow[],
  filename: string,
) {
  const buffer = await buildAdminProgramsDiscoveryExcelBuffer(rows);
  triggerExcelDownload(buffer, ensureExcelFilename(filename));
}

export function mapProgramDiscoveryRowToExport(
  row: ProgramsDiscoveryRow,
): AdminProgramDiscoveryExportRow {
  return {
    slug: row.slug,
    title: row.title,
    category: row.category,
    short_description: row.short_description,
    description: row.description,
    characteristic_ids: row.characteristic_ids,
    tags: row.tags,
    salary_potential: row.salary_potential,
    demand_level: row.demand_level,
    math_intensity: row.math_intensity,
    ai_resilience: row.ai_resilience,
    featured: row.featured ?? false,
    active: row.active ?? true,
    career_paths: row.career_paths,
    core_skills: row.core_skills,
    study_plan: row.study_plan,
    day_in_life: row.day_in_life,
    salary_regions: row.salary_regions,
    career_examples: row.career_examples,
    employers: row.employers,
    videos: row.videos,
  };
}
