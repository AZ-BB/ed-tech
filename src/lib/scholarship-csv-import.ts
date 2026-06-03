import type { Database, Json } from "@/database.types";
import { displayImportName, normalizeImportNameKey } from "@/lib/admin-import-name-key";
import { buildImportProgress, type ImportProgressPayload } from "@/lib/admin-import-progress";
import {
  diffImportRecords,
  normalizeCompareBoolean,
  normalizeCompareDecimal,
  normalizeCompareInteger,
  normalizeCompareString,
  pushUpdatedRow,
  type ImportRowAddition,
  type ImportRowUpdate,
} from "@/lib/admin-import-report";
import { csvToRecords } from "@/lib/university-csv-import";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export { csvToRecords };

const IMPORT_LOG = "[scholarship-csv-import]";

type ScholarshipType = Database["public"]["Enums"]["scholarship_type"];
type ScholarshipCompetition = Database["public"]["Enums"]["scholarship_competition_type"];
type TuitionType = Database["public"]["Enums"]["tuition_type"];

type SupabaseSecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

const SCHOLARSHIP_DIFF_FIELDS = [
  "name",
  "nationality_country_code",
  "destination_country_codes",
  "type",
  "description",
  "target_students",
  "level",
  "fields",
  "is_renewable",
  "is_active",
  "is_priority",
  "coverage",
  "competition",
  "tuition_type",
  "tuition",
  "travel",
  "living_stipend",
  "other_benefits",
  "city",
  "academic_eligibility",
  "ielts_min",
  "toefl_min",
  "sat_policy",
  "documents",
  "deadline_date",
  "deadline",
  "application_fee",
  "intakes",
  "method",
  "other",
  "tooltip",
  "discovery_slug",
] as const;

type DestinationRow = {
  country_code: string;
};

type ScholarshipDbRow = {
  id: string;
  name: string;
  nationality_country_code: string;
  type: string | null;
  description: string | null;
  target_students: string | null;
  level: string | null;
  fields: Json | null;
  is_renewable: boolean;
  is_active: boolean;
  is_priority: boolean;
  coverage: string | null;
  competition: string | null;
  tuition_type: string | null;
  tuition: string | null;
  travel: string | null;
  living_stipend: string | null;
  other_benefits: string | null;
  city: string | null;
  academic_eligibility: string | null;
  ielts_min_score: number | null;
  toefl_min_score: number | null;
  sat_policy: string | null;
  documents: Json | null;
  deadline_date: string | null;
  deadline: string | null;
  application_fee: number | null;
  intakes: string | null;
  method: string | null;
  other: string | null;
  tooltip: string | null;
  discovery_slug: string | null;
  scholarship_destinations: DestinationRow[] | null;
};

const PAGE_SIZE = 1000;

function cell(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function parseOptionalInt(s: string): number | null {
  if (!s) return null;
  const n = Number.parseInt(s.replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalFloat(s: string): number | null {
  if (!s) return null;
  const n = Number.parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseBool(s: string, defaultValue: boolean): boolean {
  const t = s.trim().toLowerCase();
  if (!t) return defaultValue;
  if (t === "true" || t === "1" || t === "yes" || t === "y") return true;
  if (t === "false" || t === "0" || t === "no" || t === "n") return false;
  return defaultValue;
}

function parseDeadline(s: string, defaultYear: number): string | null {
  const t = s.trim();
  if (!t) return null;
  const tryIso = Date.parse(t);
  if (!Number.isNaN(tryIso)) {
    return new Date(tryIso).toISOString().split("T")[0]!;
  }
  const withYear = Date.parse(`${t} ${defaultYear}`);
  if (!Number.isNaN(withYear)) {
    return new Date(withYear).toISOString().split("T")[0]!;
  }
  return null;
}

function parseScholarshipType(s: string): ScholarshipType | null {
  const t = s.trim().toLowerCase();
  if (
    t === "government" ||
    t === "university" ||
    t === "corporate" ||
    t === "foundation" ||
    t === "other"
  ) {
    return t;
  }
  return null;
}

function parseCompetition(s: string): ScholarshipCompetition | null {
  const t = s.trim().toLowerCase();
  if (t === "low" || t === "medium" || t === "high" || t === "very_high") return t;
  return null;
}

function parseTuitionType(s: string): TuitionType | null {
  const t = s.trim().toLowerCase();
  if (t === "full" || t === "partial") return t;
  return null;
}

function buildDocuments(row: Record<string, string>): Json | null {
  const docs = [1, 2, 3, 4, 5]
    .map((i) => cell(row, `doc_${i}`))
    .filter(Boolean);
  return docs.length ? docs : null;
}

function documentsToString(doc: Json | null): string {
  if (doc == null) return "";
  if (Array.isArray(doc)) {
    return doc.filter((x): x is string => typeof x === "string").join(", ");
  }
  return "";
}

function documentsFromRow(row: Record<string, string>): string {
  return [1, 2, 3, 4, 5]
    .map((i) => cell(row, `doc_${i}`))
    .filter(Boolean)
    .join(", ");
}

function parseFieldsCsv(s: string): Json | null {
  const items = s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return items.length ? items : null;
}

function fieldsToCsv(fields: Json | null): string {
  if (fields == null) return "";
  if (Array.isArray(fields)) {
    return fields.filter((x): x is string => typeof x === "string").join(",");
  }
  return "";
}

function parseCountryCodes(raw: string): string[] {
  if (!raw.trim()) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((c) => c.trim().toUpperCase().slice(0, 2))
        .filter((c) => c.length === 2),
    ),
  ].sort();
}

function destinationCodesToString(codes: string[]): string {
  return [...codes].sort().join(",");
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function str(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

function scholarshipDbToExportFlatRow(row: ScholarshipDbRow): Record<string, string> {
  const docs = documentsToArray(row.documents);
  const destinationCodes =
    row.scholarship_destinations
      ?.map((d) => d.country_code?.trim().toUpperCase().slice(0, 2))
      .filter((c): c is string => Boolean(c)) ?? [];

  return {
    name: row.name,
    nationality_country_code: row.nationality_country_code,
    destination_country_codes: destinationCodes.join(","),
    type: row.type?.trim() ?? "",
    description: row.description?.trim() ?? "",
    target_students: row.target_students?.trim() ?? "",
    level: row.level?.trim() ?? "",
    fields: fieldsToCsv(row.fields),
    is_renewable: row.is_renewable ? "true" : "false",
    is_active: row.is_active ? "true" : "false",
    is_priority: row.is_priority ? "true" : "false",
    coverage: row.coverage?.trim() ?? "",
    competition: row.competition?.trim() ?? "",
    tuition_type: row.tuition_type?.trim() ?? "",
    tuition: row.tuition?.trim() ?? "",
    travel: row.travel?.trim() ?? "",
    living_stipend: row.living_stipend?.trim() ?? "",
    other_benefits: row.other_benefits?.trim() ?? "",
    city: row.city?.trim() ?? "",
    academic_eligibility: row.academic_eligibility?.trim() ?? "",
    ielts_min: str(row.ielts_min_score),
    toefl_min: str(row.toefl_min_score),
    sat_policy: row.sat_policy?.trim() ?? "",
    doc_1: docs[0] ?? "",
    doc_2: docs[1] ?? "",
    doc_3: docs[2] ?? "",
    doc_4: docs[3] ?? "",
    doc_5: docs[4] ?? "",
    deadline_date: row.deadline_date?.trim() ?? "",
    deadline: row.deadline?.trim() ?? "",
    application_fee: str(row.application_fee),
    intakes: row.intakes?.trim() ?? "",
    method: row.method?.trim() ?? "",
    other: row.other?.trim() ?? "",
    tooltip: row.tooltip?.trim() ?? "",
    discovery_slug: row.discovery_slug?.trim() ?? "",
  };
}

function documentsToArray(doc: Json | null): string[] {
  if (doc == null) return [];
  if (Array.isArray(doc)) {
    return doc.filter((x): x is string => typeof x === "string");
  }
  return [];
}

function normalizeScholarshipDeadline(raw: string, defaultYear: number): string {
  const t = raw.trim();
  if (!t) return "";
  const parsed = parseDeadline(t, defaultYear);
  if (parsed) return parsed;
  const iso = t.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso?.[1] ?? t;
}

function canonicalScholarshipSnapshot(
  flat: Record<string, string>,
  defaultYear: number,
): Record<string, string> {
  return {
    name: displayImportName(cell(flat, "name")),
    nationality_country_code: cell(flat, "nationality_country_code").toUpperCase().slice(0, 2),
    destination_country_codes: destinationCodesToString(
      parseCountryCodes(cell(flat, "destination_country_codes")),
    ),
    type: normalizeCompareString(cell(flat, "type")).toLowerCase(),
    description: normalizeCompareString(cell(flat, "description")),
    target_students: normalizeCompareString(cell(flat, "target_students")),
    level: normalizeCompareString(cell(flat, "level")),
    fields: normalizeCompareString(cell(flat, "fields")),
    is_renewable: normalizeCompareBoolean(cell(flat, "is_renewable"), false),
    is_active: normalizeCompareBoolean(cell(flat, "is_active"), true),
    is_priority: normalizeCompareBoolean(cell(flat, "is_priority"), false),
    coverage: normalizeCompareString(cell(flat, "coverage")),
    competition: normalizeCompareString(cell(flat, "competition")).toLowerCase(),
    tuition_type: normalizeCompareString(cell(flat, "tuition_type")).toLowerCase(),
    tuition: normalizeCompareString(cell(flat, "tuition")),
    travel: normalizeCompareString(cell(flat, "travel")),
    living_stipend: normalizeCompareString(cell(flat, "living_stipend")),
    other_benefits: normalizeCompareString(cell(flat, "other_benefits")),
    city: normalizeCompareString(cell(flat, "city")),
    academic_eligibility: normalizeCompareString(cell(flat, "academic_eligibility")),
    ielts_min: normalizeCompareDecimal(cell(flat, "ielts_min")),
    toefl_min: normalizeCompareInteger(cell(flat, "toefl_min")),
    sat_policy: normalizeCompareString(cell(flat, "sat_policy")),
    documents: documentsFromRow(flat),
    deadline_date: normalizeScholarshipDeadline(cell(flat, "deadline_date"), defaultYear),
    deadline: normalizeCompareString(cell(flat, "deadline")),
    application_fee: normalizeCompareDecimal(cell(flat, "application_fee")),
    intakes: normalizeCompareString(cell(flat, "intakes")),
    method: normalizeCompareString(cell(flat, "method")),
    other: normalizeCompareString(cell(flat, "other")),
    tooltip: normalizeCompareString(cell(flat, "tooltip")),
    discovery_slug: normalizeCompareString(cell(flat, "discovery_slug")),
  };
}

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

class ScholarshipImportCache {
  private readonly supabase: SupabaseSecretClient;
  private readonly countryIds = new Set<string>();
  private readonly scholarships = new Map<string, string>();
  private readonly snapshots = new Map<string, Record<string, string>>();

  constructor(
    supabase: SupabaseSecretClient,
    seed?: {
      countries?: { id: string }[];
      scholarships?: ScholarshipDbRow[];
    },
  ) {
    this.supabase = supabase;
    for (const country of seed?.countries ?? []) {
      this.countryIds.add(country.id);
    }
    const defaultYear = new Date().getFullYear();
    for (const scholarship of seed?.scholarships ?? []) {
      const key = normalizeImportNameKey(scholarship.name);
      if (!key) continue;
      this.scholarships.set(key, scholarship.id);
      this.snapshots.set(
        key,
        canonicalScholarshipSnapshot(scholarshipDbToExportFlatRow(scholarship), defaultYear),
      );
    }
  }

  async ensureCountry(code: string): Promise<void> {
    const cc = code.trim().toUpperCase().slice(0, 2);
    if (cc.length !== 2) throw new Error(`Invalid country code: ${code}`);
    if (this.countryIds.has(cc)) return;

    const { error } = await this.supabase.from("countries").insert({ id: cc, name: cc });
    if (error) throw error;
    this.countryIds.add(cc);
  }

  getScholarshipId(nameKey: string): string | undefined {
    return this.scholarships.get(nameKey);
  }

  getSnapshot(nameKey: string): Record<string, string> | undefined {
    return this.snapshots.get(nameKey);
  }

  setScholarshipId(nameKey: string, id: string, snapshot: Record<string, string>): void {
    this.scholarships.set(nameKey, id);
    this.snapshots.set(nameKey, snapshot);
  }
}

const SCHOLARSHIP_SELECT = `
  id,
  name,
  nationality_country_code,
  type,
  description,
  target_students,
  level,
  fields,
  is_renewable,
  is_active,
  is_priority,
  coverage,
  competition,
  tuition_type,
  tuition,
  travel,
  living_stipend,
  other_benefits,
  city,
  academic_eligibility,
  ielts_min_score,
  toefl_min_score,
  sat_policy,
  documents,
  deadline_date,
  deadline,
  application_fee,
  intakes,
  method,
  other,
  tooltip,
  discovery_slug,
  scholarship_destinations ( country_code )
`;

async function createImportCache(supabase: SupabaseSecretClient): Promise<ScholarshipImportCache> {
  const cacheStartedAt = Date.now();
  console.log(`${IMPORT_LOG} cache preload start`);

  const [countries, scholarships] = await Promise.all([
    supabase.from("countries").select("id"),
    fetchAllRows<ScholarshipDbRow>(async (from, to) =>
      supabase.from("scholarships").select(SCHOLARSHIP_SELECT).range(from, to),
    ),
  ]);

  if (countries.error) throw countries.error;

  const cache = new ScholarshipImportCache(supabase, {
    countries: countries.data ?? [],
    scholarships,
  });

  console.log(`${IMPORT_LOG} cache preload done`, {
    elapsedMs: Date.now() - cacheStartedAt,
    countries: countries.data?.length ?? 0,
    scholarships: scholarships.length,
  });

  return cache;
}

export type ScholarshipImportSummary = {
  processed: number;
  scholarshipsUpserted: number;
  created: number;
  updated: number;
  unchangedCount: number;
  added: ImportRowAddition[];
  updatedRows: ImportRowUpdate[];
  errors: { rowNumber: number; message: string }[];
};

function rowToScholarshipPayload(row: Record<string, string>, defaultYear: number) {
  const name = displayImportName(cell(row, "name"));
  const discoverySlugRaw = cell(row, "discovery_slug");

  return {
    name,
    nationality_country_code: cell(row, "nationality_country_code").toUpperCase().slice(0, 2),
    type: parseScholarshipType(cell(row, "type")),
    description: cell(row, "description") || null,
    target_students: cell(row, "target_students") || null,
    level: cell(row, "level") || null,
    fields: parseFieldsCsv(cell(row, "fields")),
    is_renewable: parseBool(cell(row, "is_renewable"), false),
    is_active: parseBool(cell(row, "is_active"), true),
    is_priority: parseBool(cell(row, "is_priority"), false),
    coverage: cell(row, "coverage") || null,
    competition: parseCompetition(cell(row, "competition")),
    tuition_type: parseTuitionType(cell(row, "tuition_type")),
    tuition: cell(row, "tuition") || null,
    travel: cell(row, "travel") || null,
    living_stipend: cell(row, "living_stipend") || null,
    other_benefits: cell(row, "other_benefits") || null,
    city: cell(row, "city") || null,
    academic_eligibility: cell(row, "academic_eligibility") || null,
    ielts_min_score: parseOptionalFloat(cell(row, "ielts_min")),
    toefl_min_score: parseOptionalInt(cell(row, "toefl_min")),
    sat_policy: cell(row, "sat_policy") || null,
    documents: buildDocuments(row),
    deadline_date: parseDeadline(cell(row, "deadline_date"), defaultYear),
    deadline: cell(row, "deadline") || null,
    application_fee: parseOptionalFloat(cell(row, "application_fee")),
    intakes: cell(row, "intakes") || null,
    method: cell(row, "method") || null,
    other: cell(row, "other") || null,
    tooltip: cell(row, "tooltip") || null,
    discovery_slug: discoverySlugRaw || slugifyName(name),
    updated_at: new Date().toISOString(),
  };
}

type ParsedImportRow = {
  rowNumber: number;
  row: Record<string, string>;
  nameKey: string;
  displayName: string;
  destinationCodes: string[];
};

function parseImportRow(
  row: Record<string, string>,
  rowNumber: number,
  seenNames: Set<string>,
  summary: ScholarshipImportSummary,
): ParsedImportRow | null {
  const name = cell(row, "name");
  if (!name) {
    summary.processed++;
    return null;
  }

  const nameKey = normalizeImportNameKey(name);
  if (seenNames.has(nameKey)) {
    summary.processed++;
    summary.errors.push({
      rowNumber,
      message: "Duplicate scholarship name in file",
    });
    return null;
  }

  seenNames.add(nameKey);
  return {
    rowNumber,
    row,
    nameKey,
    displayName: displayImportName(name),
    destinationCodes: parseCountryCodes(cell(row, "destination_country_codes")),
  };
}

type UpsertResult = {
  scholarshipId: string;
  isNew: boolean;
};

async function upsertScholarshipRow(
  supabase: SupabaseSecretClient,
  cache: ScholarshipImportCache,
  parsed: ParsedImportRow,
  defaultYear: number,
): Promise<UpsertResult> {
  const nationalityCode = cell(parsed.row, "nationality_country_code").toUpperCase().slice(0, 2);
  if (nationalityCode.length !== 2) {
    throw new Error("nationality_country_code must be a 2-letter code");
  }

  await cache.ensureCountry(nationalityCode);
  for (const code of parsed.destinationCodes) {
    await cache.ensureCountry(code);
  }

  const payload = rowToScholarshipPayload(parsed.row, defaultYear);
  const afterSnapshot = canonicalScholarshipSnapshot(parsed.row, defaultYear);
  const existingId = cache.getScholarshipId(parsed.nameKey);

  if (existingId) {
    const { error: upErr } = await supabase
      .from("scholarships")
      .update(payload)
      .eq("id", existingId);
    if (upErr) throw upErr;
    return { scholarshipId: existingId, isNew: false };
  }

  const { data: inserted, error: insErr } = await supabase
    .from("scholarships")
    .insert(payload)
    .select("id")
    .single();
  if (insErr) throw insErr;

  const scholarshipId = inserted!.id;
  cache.setScholarshipId(parsed.nameKey, scholarshipId, afterSnapshot);
  return { scholarshipId, isNew: true };
}

async function syncDestinationsForRow(
  supabase: SupabaseSecretClient,
  scholarshipId: string,
  destinationCodes: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("scholarship_destinations")
    .delete()
    .eq("scholarship_id", scholarshipId);

  if (deleteError) throw deleteError;

  if (destinationCodes.length === 0) return;

  const { error: insertError } = await supabase.from("scholarship_destinations").insert(
    destinationCodes.map((country_code) => ({
      scholarship_id: scholarshipId,
      country_code,
    })),
  );

  if (insertError) throw insertError;
}

export async function importScholarshipsFromCsvRecords(
  supabase: SupabaseSecretClient,
  records: Record<string, string>[],
  options?: { defaultYear?: number; onProgress?: (progress: ImportProgressPayload) => void },
): Promise<ScholarshipImportSummary> {
  const startedAt = Date.now();
  const defaultYear = options?.defaultYear ?? new Date().getFullYear();
  const summary: ScholarshipImportSummary = {
    processed: 0,
    scholarshipsUpserted: 0,
    created: 0,
    updated: 0,
    unchangedCount: 0,
    added: [],
    updatedRows: [],
    errors: [],
  };
  const seenNames = new Set<string>();
  const totalUpdatedCount = { value: 0 };

  console.log(`${IMPORT_LOG} start`, { recordCount: records.length, defaultYear });

  const cache = await createImportCache(supabase);

  const parsedRows: ParsedImportRow[] = [];
  for (let i = 0; i < records.length; i++) {
    const parsed = parseImportRow(records[i]!, i + 2, seenNames, summary);
    if (parsed) parsedRows.push(parsed);
  }

  const reportProgress = (phase: "scholarships" | "destinations", index: number) => {
    options?.onProgress?.(buildImportProgress(phase, index, parsedRows.length));
  };

  if (parsedRows.length > 0) {
    reportProgress("scholarships", 0);
  }

  console.log(`${IMPORT_LOG} phase 1: scholarships start`, {
    rows: parsedRows.length,
    elapsedMs: Date.now() - startedAt,
  });

  const rowMeta = new Map<
    string,
    {
      scholarshipId: string;
      isNew: boolean;
      row: Record<string, string>;
      rowNumber: number;
      displayName: string;
      destinationCodes: string[];
    }
  >();

  for (let i = 0; i < parsedRows.length; i++) {
    const parsed = parsedRows[i]!;
    const rowStartedAt = Date.now();

    try {
      const { scholarshipId, isNew } = await upsertScholarshipRow(
        supabase,
        cache,
        parsed,
        defaultYear,
      );

      rowMeta.set(parsed.nameKey, {
        scholarshipId,
        isNew,
        row: parsed.row,
        rowNumber: parsed.rowNumber,
        displayName: parsed.displayName,
        destinationCodes: parsed.destinationCodes,
      });
      summary.scholarshipsUpserted++;

      if (isNew) {
        summary.created++;
        summary.added.push({ rowNumber: parsed.rowNumber, name: parsed.displayName });
      }

      if (i < 3 || i % 25 === 0 || i === parsedRows.length - 1) {
        console.log(`${IMPORT_LOG} phase 1 row done`, {
          rowIndex: i + 1,
          total: parsedRows.length,
          name: parsed.displayName,
          rowMs: Date.now() - rowStartedAt,
          elapsedMs: Date.now() - startedAt,
        });
      }
    } catch (e) {
      summary.errors.push({
        rowNumber: parsed.rowNumber,
        message: e instanceof Error ? e.message : String(e),
      });
    }

    reportProgress("scholarships", i + 1);
  }

  console.log(`${IMPORT_LOG} phase 1: scholarships done`, {
    upserted: summary.scholarshipsUpserted,
    errors: summary.errors.length,
    elapsedMs: Date.now() - startedAt,
  });

  console.log(`${IMPORT_LOG} phase 2: destinations start`, {
    rows: parsedRows.length,
    elapsedMs: Date.now() - startedAt,
  });

  if (parsedRows.length > 0) {
    reportProgress("destinations", 0);
  }

  for (let i = 0; i < parsedRows.length; i++) {
    const parsed = parsedRows[i]!;
    const meta = rowMeta.get(parsed.nameKey);
    const rowStartedAt = Date.now();

    if (!meta) {
      summary.processed++;
      reportProgress("destinations", i + 1);
      continue;
    }

    try {
      const afterSnapshot = canonicalScholarshipSnapshot(meta.row, defaultYear);

      if (!meta.isNew) {
        const beforeSnapshot = cache.getSnapshot(parsed.nameKey);
        const destinationsChanged =
          beforeSnapshot != null &&
          beforeSnapshot.destination_country_codes !== afterSnapshot.destination_country_codes

        if (destinationsChanged) {
          await syncDestinationsForRow(supabase, meta.scholarshipId, meta.destinationCodes)
        }

        if (beforeSnapshot) {
          const changes = diffImportRecords(
            beforeSnapshot,
            afterSnapshot,
            [...SCHOLARSHIP_DIFF_FIELDS],
          )
          if (changes.length > 0) {
            summary.updated++
            pushUpdatedRow(
              summary.updatedRows,
              {
                rowNumber: meta.rowNumber,
                name: meta.displayName,
                changes,
              },
              totalUpdatedCount,
            )
          } else {
            summary.unchangedCount++
          }
        }
        cache.setScholarshipId(parsed.nameKey, meta.scholarshipId, afterSnapshot);
      } else {
        await syncDestinationsForRow(supabase, meta.scholarshipId, meta.destinationCodes)
      }

      summary.processed++

      if (i < 3 || i % 25 === 0 || i === parsedRows.length - 1) {
        console.log(`${IMPORT_LOG} phase 2 row done`, {
          rowIndex: i + 1,
          total: parsedRows.length,
          name: parsed.displayName,
          rowMs: Date.now() - rowStartedAt,
          elapsedMs: Date.now() - startedAt,
        })
      }
    } catch (e) {
      summary.processed++
      summary.errors.push({
        rowNumber: parsed.rowNumber,
        message: e instanceof Error ? e.message : String(e),
      });
    }

    reportProgress("destinations", i + 1);
  }

  if (parsedRows.length > 0) {
    reportProgress("destinations", parsedRows.length);
  }

  if (totalUpdatedCount.value > summary.updatedRows.length) {
    console.log(`${IMPORT_LOG} updated list truncated`, {
      total: totalUpdatedCount.value,
      returned: summary.updatedRows.length,
    });
  }

  console.log(`${IMPORT_LOG} complete`, {
    elapsedMs: Date.now() - startedAt,
    processed: summary.processed,
    scholarshipsUpserted: summary.scholarshipsUpserted,
    created: summary.created,
    updated: summary.updated,
    unchangedCount: summary.unchangedCount,
    errorCount: summary.errors.length,
  });

  return summary;
}
