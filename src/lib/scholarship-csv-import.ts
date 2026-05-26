import type { Database, Json } from "@/database.types";
import { csvToRecords } from "@/lib/university-csv-import";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export { csvToRecords };

const IMPORT_LOG = "[scholarship-csv-import]";

type ScholarshipType = Database["public"]["Enums"]["scholarship_type"];
type ScholarshipCompetition = Database["public"]["Enums"]["scholarship_competition_type"];
type TuitionType = Database["public"]["Enums"]["tuition_type"];

type SupabaseSecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

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

function parseFieldsCsv(s: string): Json | null {
  const items = s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return items.length ? items : null;
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
  ];
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
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

  constructor(
    supabase: SupabaseSecretClient,
    seed?: {
      countries?: { id: string }[];
      scholarships?: { id: string; name: string }[];
    },
  ) {
    this.supabase = supabase;
    for (const country of seed?.countries ?? []) {
      this.countryIds.add(country.id);
    }
    for (const scholarship of seed?.scholarships ?? []) {
      const key = scholarship.name.trim();
      if (key) this.scholarships.set(key, scholarship.id);
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

  getScholarshipId(name: string): string | undefined {
    return this.scholarships.get(name.trim());
  }

  setScholarshipId(name: string, id: string): void {
    this.scholarships.set(name.trim(), id);
  }
}

async function createImportCache(supabase: SupabaseSecretClient): Promise<ScholarshipImportCache> {
  const cacheStartedAt = Date.now();
  console.log(`${IMPORT_LOG} cache preload start`);

  const [countries, scholarships] = await Promise.all([
    supabase.from("countries").select("id"),
    fetchAllRows<{ id: string; name: string }>(async (from, to) =>
      supabase.from("scholarships").select("id, name").range(from, to),
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
  errors: { rowNumber: number; message: string }[];
};

function rowToScholarshipPayload(row: Record<string, string>, defaultYear: number) {
  const name = cell(row, "name");
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

  const nameKey = name.trim();
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
    destinationCodes: parseCountryCodes(cell(row, "destination_country_codes")),
  };
}

async function upsertScholarshipRow(
  supabase: SupabaseSecretClient,
  cache: ScholarshipImportCache,
  parsed: ParsedImportRow,
  defaultYear: number,
): Promise<string> {
  const nationalityCode = cell(parsed.row, "nationality_country_code").toUpperCase().slice(0, 2);
  if (nationalityCode.length !== 2) {
    throw new Error("nationality_country_code must be a 2-letter code");
  }

  await cache.ensureCountry(nationalityCode);
  for (const code of parsed.destinationCodes) {
    await cache.ensureCountry(code);
  }

  const payload = rowToScholarshipPayload(parsed.row, defaultYear);
  const existingId = cache.getScholarshipId(parsed.nameKey);

  if (existingId) {
    const { error: upErr } = await supabase
      .from("scholarships")
      .update(payload)
      .eq("id", existingId);
    if (upErr) throw upErr;
    return existingId;
  }

  const { data: inserted, error: insErr } = await supabase
    .from("scholarships")
    .insert(payload)
    .select("id")
    .single();
  if (insErr) throw insErr;

  const scholarshipId = inserted!.id;
  cache.setScholarshipId(parsed.nameKey, scholarshipId);
  return scholarshipId;
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
  options?: { defaultYear?: number },
): Promise<ScholarshipImportSummary> {
  const startedAt = Date.now();
  const defaultYear = options?.defaultYear ?? new Date().getFullYear();
  const summary: ScholarshipImportSummary = {
    processed: 0,
    scholarshipsUpserted: 0,
    errors: [],
  };
  const seenNames = new Set<string>();

  console.log(`${IMPORT_LOG} start`, { recordCount: records.length, defaultYear });

  const cache = await createImportCache(supabase);

  const parsedRows: ParsedImportRow[] = [];
  for (let i = 0; i < records.length; i++) {
    const parsed = parseImportRow(records[i]!, i + 2, seenNames, summary);
    if (parsed) parsedRows.push(parsed);
  }

  console.log(`${IMPORT_LOG} phase 1: scholarships start`, {
    rows: parsedRows.length,
    elapsedMs: Date.now() - startedAt,
  });

  const scholarshipIds = new Map<string, string>();

  for (let i = 0; i < parsedRows.length; i++) {
    const parsed = parsedRows[i]!;
    const rowStartedAt = Date.now();

    try {
      const scholarshipId = await upsertScholarshipRow(supabase, cache, parsed, defaultYear);
      scholarshipIds.set(parsed.nameKey, scholarshipId);
      summary.scholarshipsUpserted++;

      if (i < 3 || i % 25 === 0 || i === parsedRows.length - 1) {
        console.log(`${IMPORT_LOG} phase 1 row done`, {
          rowIndex: i + 1,
          total: parsedRows.length,
          name: parsed.nameKey,
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

  for (let i = 0; i < parsedRows.length; i++) {
    const parsed = parsedRows[i]!;
    const scholarshipId = scholarshipIds.get(parsed.nameKey);
    const rowStartedAt = Date.now();

    if (!scholarshipId) {
      summary.processed++;
      continue;
    }

    try {
      await syncDestinationsForRow(supabase, scholarshipId, parsed.destinationCodes);
      summary.processed++;

      if (i < 3 || i % 25 === 0 || i === parsedRows.length - 1) {
        console.log(`${IMPORT_LOG} phase 2 row done`, {
          rowIndex: i + 1,
          total: parsedRows.length,
          name: parsed.nameKey,
          rowMs: Date.now() - rowStartedAt,
          elapsedMs: Date.now() - startedAt,
        });
      }
    } catch (e) {
      summary.processed++;
      summary.errors.push({
        rowNumber: parsed.rowNumber,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  console.log(`${IMPORT_LOG} complete`, {
    elapsedMs: Date.now() - startedAt,
    processed: summary.processed,
    scholarshipsUpserted: summary.scholarshipsUpserted,
    errorCount: summary.errors.length,
  });

  return summary;
}
