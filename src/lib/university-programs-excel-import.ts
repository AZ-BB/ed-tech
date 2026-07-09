import { formatImportError } from "@/lib/admin-import-error";
import {
  displayImportName,
  normalizeImportNameKey,
} from "@/lib/admin-import-name-key";
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
import type { UniversityProgramExportRow } from "@/lib/university-programs-types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

const IMPORT_LOG = "[university-programs-import]";
const LOOKUP_PAGE_SIZE = 1000;
const UPSERT_BATCH_SIZE = 25;

type SupabaseSecretClient = Awaited<
  ReturnType<typeof createSupabaseSecretClient>
>;

export type UniversityProgramsImportSummary = ImportResultSummaryCore & {
  linksUpserted: number;
};

type QueuedUniversityProgramRow = {
  rowNumber: number;
  displayName: string;
  payload: {
    university_id: string;
    program_id: string;
    ranking_note: string | null;
    tuition_note: string | null;
    short_description: string | null;
    program_school_note: string | null;
    featured: boolean;
    updated_at: string;
  };
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

function stripParenthetical(name: string): string {
  return displayImportName(name.replace(/\s*\([^)]*\)/g, " "));
}

function parentheticalAliases(name: string): string[] {
  const aliases: string[] = [];
  for (const match of name.matchAll(/\(([^)]+)\)/g)) {
    const alias = displayImportName(match[1] ?? "");
    if (alias) aliases.push(alias);
  }
  return aliases;
}

function universityLookupKeys(name: string): string[] {
  const display = displayImportName(name);
  const keys = new Set<string>([
    normalizeImportNameKey(display),
    normalizeImportNameKey(stripParenthetical(display)),
    ...parentheticalAliases(display).map(normalizeImportNameKey),
  ]);
  return [...keys].filter(Boolean);
}

function registerUniversityLookup(
  map: Map<string, string>,
  key: string,
  id: string,
): void {
  if (!key) return;
  const existing = map.get(key);
  if (existing && existing !== id) return;
  map.set(key, id);
}

function buildUniversityLookupMap(
  universities: { id: string; name: string }[],
): Map<string, string> {
  const map = new Map<string, string>();

  for (const uni of universities) {
    for (const key of universityLookupKeys(uni.name)) {
      registerUniversityLookup(map, key, uni.id);
    }
  }

  return map;
}

function resolveUniversityId(
  map: Map<string, string>,
  rawName: string,
): string | undefined {
  for (const key of universityLookupKeys(rawName)) {
    const id = map.get(key);
    if (id) return id;
  }
  return undefined;
}

async function loadAllUniversities(
  service: SupabaseSecretClient,
): Promise<{ id: string; name: string }[]> {
  const rows: { id: string; name: string }[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await service
      .from("universities")
      .select("id, name")
      .order("name", { ascending: true })
      .range(from, from + LOOKUP_PAGE_SIZE - 1);

    if (error) throw error;

    const page = data ?? [];
    rows.push(...page);

    if (page.length < LOOKUP_PAGE_SIZE) break;
    from += LOOKUP_PAGE_SIZE;
  }

  return rows;
}

async function loadAllPrograms(
  service: SupabaseSecretClient,
): Promise<{ id: string; slug: string }[]> {
  const rows: { id: string; slug: string }[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await service
      .from("programs_discovery")
      .select("id, slug")
      .order("slug", { ascending: true })
      .range(from, from + LOOKUP_PAGE_SIZE - 1);

    if (error) throw error;

    const page = data ?? [];
    rows.push(...page);

    if (page.length < LOOKUP_PAGE_SIZE) break;
    from += LOOKUP_PAGE_SIZE;
  }

  return rows;
}

async function upsertUniversityProgramLink(
  service: SupabaseSecretClient,
  item: QueuedUniversityProgramRow,
): Promise<"added" | "updated"> {
  const { data: existing, error: existingError } = await service
    .from("university_programs")
    .select("id")
    .eq("university_id", item.payload.university_id)
    .eq("program_id", item.payload.program_id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.id) {
    const { error: updateError } = await service
      .from("university_programs")
      .update(item.payload)
      .eq("id", existing.id);
    if (updateError) throw updateError;
    return "updated";
  }

  const { error: insertError } = await service
    .from("university_programs")
    .insert(item.payload);
  if (insertError) throw insertError;
  return "added";
}

async function processImportBatch(
  service: SupabaseSecretClient,
  batch: QueuedUniversityProgramRow[],
  summary: {
    errors: { rowNumber: number; message: string }[];
    additions: ImportRowAddition[];
    updates: ImportRowUpdate[];
  },
): Promise<void> {
  const results = await Promise.allSettled(
    batch.map(async (item) => {
      const outcome = await upsertUniversityProgramLink(service, item);
      return { item, outcome };
    }),
  );

  for (let index = 0; index < results.length; index++) {
    const result = results[index]!;
    const item = batch[index]!;

    if (result.status === "fulfilled") {
      if (result.value.outcome === "updated") {
        summary.updates.push({
          rowNumber: item.rowNumber,
          name: item.displayName,
          changes: [],
        });
      } else {
        summary.additions.push({
          rowNumber: item.rowNumber,
          name: item.displayName,
        });
      }
      continue;
    }

    summary.errors.push(
      rowError(
        item.rowNumber,
        item.displayName,
        formatImportError(result.reason),
      ),
    );
  }
}

export async function importUniversityProgramsFromExcelRows(
  service: SupabaseSecretClient,
  rows: Record<string, string>[],
  options?: { onProgress?: (progress: ImportProgressPayload) => void },
): Promise<UniversityProgramsImportSummary> {
  const errors: { rowNumber: number; message: string }[] = [];
  const additions: ImportRowAddition[] = [];
  const updates: ImportRowUpdate[] = [];
  let linksUpserted = 0;

  let universities: { id: string; name: string }[];
  let programs: { id: string; slug: string }[];

  try {
    [universities, programs] = await Promise.all([
      loadAllUniversities(service),
      loadAllPrograms(service),
    ]);
  } catch (error) {
    console.error(IMPORT_LOG, error);
    throw new Error("Could not load universities or programs for import.");
  }

  console.log(`${IMPORT_LOG} lookup loaded`, {
    universities: universities.length,
    programs: programs.length,
    upsertBatchSize: UPSERT_BATCH_SIZE,
  });

  const universityByName = buildUniversityLookupMap(universities);

  const programBySlug = new Map<string, string>();
  for (const program of programs) {
    programBySlug.set(normalizeImportNameKey(program.slug), program.id);
  }

  const total = rows.length;
  let processed = 0;
  const queue: QueuedUniversityProgramRow[] = [];

  const reportProgress = () => {
    options?.onProgress?.(
      buildImportProgress("university_programs", processed, total),
    );
  };

  if (total > 0) {
    reportProgress();
  }

  for (let index = 0; index < rows.length; index++) {
    const rowNumber = index + 2;
    const row = rows[index]!;
    const programSlug = normalizeImportNameKey(cell(row, "program_id", "slug"));
    const universityName = cell(row, "university_name", "university");
    const displayName = displayImportName(
      universityName
        ? `${universityName} · ${programSlug || "?"}`
        : programSlug || `Row ${rowNumber}`,
    );

    if (!programSlug) {
      errors.push(rowError(rowNumber, displayName, "program_id is required."));
      processed++;
      reportProgress();
      continue;
    }
    if (!universityName) {
      errors.push(rowError(rowNumber, displayName, "university_name is required."));
      processed++;
      reportProgress();
      continue;
    }

    const universityId = resolveUniversityId(universityByName, universityName);
    if (!universityId) {
      errors.push(
        rowError(
          rowNumber,
          displayName,
          `University not found: "${universityName}".`,
        ),
      );
      processed++;
      reportProgress();
      continue;
    }

    const programId = programBySlug.get(programSlug);
    if (!programId) {
      errors.push(
        rowError(
          rowNumber,
          displayName,
          `Program not found for slug: "${programSlug}".`,
        ),
      );
      processed++;
      reportProgress();
      continue;
    }

    queue.push({
      rowNumber,
      displayName,
      payload: {
        university_id: universityId,
        program_id: programId,
        ranking_note: cell(row, "ranking_note") || null,
        tuition_note: cell(row, "tuition_note") || null,
        short_description: cell(row, "short_description") || null,
        program_school_note: cell(row, "program_school_note") || null,
        featured: parseBool(cell(row, "featured"), false),
        updated_at: new Date().toISOString(),
      },
    });
  }

  const validationErrorCount = errors.length;

  for (let batchStart = 0; batchStart < queue.length; batchStart += UPSERT_BATCH_SIZE) {
    const batch = queue.slice(batchStart, batchStart + UPSERT_BATCH_SIZE);
    await processImportBatch(service, batch, {
      errors,
      additions,
      updates,
    });
    processed = validationErrorCount + Math.min(batchStart + batch.length, queue.length);
    reportProgress();
  }

  linksUpserted = additions.length + updates.length;
  processed = total;
  reportProgress();

  return {
    ...buildImportResultSummary({
      processed,
      additions,
      updates,
      errors,
    }),
    linksUpserted,
  };
}

export function universityProgramRowToExport(
  row: UniversityProgramExportRow,
): Record<string, string> {
  return {
    program_id: row.program_id,
    university_name: row.university_name,
    ranking_note: row.ranking_note,
    tuition_note: row.tuition_note,
    short_description: row.short_description,
    program_school_note: row.program_school_note,
    featured: row.featured,
  };
}
