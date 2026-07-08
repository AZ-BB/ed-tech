import type { Database } from "@/database.types";
import { formatImportError } from "@/lib/admin-import-error";
import { displayImportName } from "@/lib/admin-import-name-key";
import {
  buildImportProgress,
  type ImportProgressPayload,
} from "@/lib/admin-import-progress";
import type {
  ImportRowAddition,
  ImportRowUpdate,
} from "@/lib/admin-import-report";
import { normalizeInternshipBulletList } from "@/lib/internship-bullet-list";
import {
  assignUniqueInternshipSlug,
  loadInternshipSlugState,
  slugifyInternshipName,
  type InternshipSlugState,
} from "@/lib/internship-slug";
import { csvToRecords } from "@/lib/university-csv-import";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export { csvToRecords };

const IMPORT_LOG = "[internship-csv-import]";
const UPSERT_BATCH_SIZE = 5;

type InternshipSection = Database["public"]["Enums"]["internship_section"];
type InternshipFormat = Database["public"]["Enums"]["internship_format"];
type InternshipPayTier = Database["public"]["Enums"]["internship_pay_tier"];
type InternshipUrlStatus = Database["public"]["Enums"]["internship_url_status"];

type SupabaseSecretClient = Awaited<
  ReturnType<typeof createSupabaseSecretClient>
>;

function cell(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function parseBool(s: string, defaultValue: boolean): boolean {
  const t = s.trim().toLowerCase();
  if (!t) return defaultValue;
  if (t === "true" || t === "1" || t === "yes" || t === "y") return true;
  if (t === "false" || t === "0" || t === "no" || t === "n") return false;
  return defaultValue;
}

function parsePipeArray(s: string): string[] {
  return normalizeInternshipBulletList(s);
}

function parseSection(s: string): InternshipSection | null {
  const t = s.trim().toLowerCase();
  if (t === "live" || t === "global" || t === "competition" || t === "find")
    return t;
  return null;
}

function parseFormat(s: string): InternshipFormat | null {
  const t = s
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (
    t === "in_person" ||
    t === "remote" ||
    t === "hybrid" ||
    t === "directory"
  )
    return t;
  return null;
}

function parsePayTier(s: string): InternshipPayTier | null {
  const t = s.trim().toLowerCase();
  if (t === "paid" || t === "free" || t === "unpaid") return t;
  return null;
}

function parseUrlStatus(s: string): InternshipUrlStatus | null {
  const t = s
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (
    t === "deep_link" ||
    t === "hub_link" ||
    t === "news_driven" ||
    t === "directory" ||
    t === "homepage"
  ) {
    return t;
  }
  return null;
}

function logImportRow(rowNumber: number, name: string, rowMs: number): void {
  console.log(`${IMPORT_LOG} row`, { rowNumber, name, rowMs });
}

async function loadCountryIds(
  supabase: SupabaseSecretClient,
): Promise<Set<string>> {
  const { data, error } = await supabase.from("countries").select("id");
  if (error) throw error;
  return new Set((data ?? []).map((country) => country.id));
}

async function ensureCountry(
  supabase: SupabaseSecretClient,
  countryIds: Set<string>,
  code: string,
): Promise<void> {
  const cc = code.trim().toUpperCase().slice(0, 2);
  if (cc.length !== 2) throw new Error(`Invalid country code: ${code}`);
  if (countryIds.has(cc)) return;

  const { error } = await supabase
    .from("countries")
    .insert({ id: cc, name: cc });
  if (error) throw error;
  countryIds.add(cc);
}

export type InternshipImportSummary = {
  processed: number;
  internshipsUpserted: number;
  created: number;
  updated: number;
  unchangedCount: number;
  added: ImportRowAddition[];
  updatedRows: ImportRowUpdate[];
  errors: { rowNumber: number; message: string }[];
};

function rowToInternshipPayload(row: Record<string, string>) {
  const name = displayImportName(cell(row, "name"));
  const slugRaw = cell(row, "slug");
  const slug = slugRaw || slugifyInternshipName(name);
  const section = parseSection(cell(row, "section"));
  const format = parseFormat(cell(row, "format"));
  const payTier = parsePayTier(cell(row, "pay_tier"));
  const urlStatus = parseUrlStatus(cell(row, "url_status")) ?? "homepage";
  const countryCode = cell(row, "country_code").toUpperCase().slice(0, 2);

  if (!section)
    throw new Error("section must be live, global, competition, or find");
  if (!format)
    throw new Error("format must be in_person, remote, hybrid, or directory");
  if (!payTier) throw new Error("pay_tier must be paid, free, or unpaid");
  if (countryCode.length !== 2)
    throw new Error("country_code must be a 2-letter code");

  const provider = cell(row, "provider");
  const locationLabel = cell(row, "location_label");
  const field = cell(row, "field");
  const payLabel = cell(row, "pay_label");
  const duration = cell(row, "duration");
  const officialUrl = cell(row, "official_url");
  const summary = cell(row, "summary");
  const eligibility = cell(row, "eligibility");
  const howToApply = cell(row, "how_to_apply");

  if (!provider) throw new Error("provider is required");
  if (!locationLabel) throw new Error("location_label is required");
  if (!field) throw new Error("field is required");
  if (!payLabel) throw new Error("pay_label is required");
  if (!duration) throw new Error("duration is required");
  if (!officialUrl) throw new Error("official_url is required");
  if (!summary) throw new Error("summary is required");
  if (!eligibility) throw new Error("eligibility is required");
  if (!howToApply) throw new Error("how_to_apply is required");

  return {
    slug,
    name,
    provider,
    section,
    country_code: countryCode,
    location_label: locationLabel,
    format,
    field,
    pay_tier: payTier,
    pay_label: payLabel,
    duration,
    phone: cell(row, "phone") || null,
    nationals_only: parseBool(cell(row, "nationals_only"), false),
    official_url: officialUrl,
    url_status: urlStatus,
    needs_review: parseBool(cell(row, "needs_review"), false),
    is_active: parseBool(cell(row, "is_active"), true),
    summary,
    what_youll_do: parsePipeArray(cell(row, "what_youll_do")),
    what_youll_gain: parsePipeArray(cell(row, "what_youll_gain")),
    eligibility,
    how_to_apply: howToApply,
    updated_at: new Date().toISOString(),
  };
}

type ParsedImportRow = {
  rowNumber: number;
  row: Record<string, string>;
  slugKey: string;
  displayName: string;
};

function parseImportRow(
  row: Record<string, string>,
  rowNumber: number,
  seenSlugs: Set<string>,
  summary: InternshipImportSummary,
): ParsedImportRow | null {
  const name = cell(row, "name");
  if (!name) {
    summary.processed++;
    return null;
  }

  const displayName = displayImportName(name);
  const slugKey = (
    cell(row, "slug") || slugifyInternshipName(displayName)
  ).trim();
  if (!slugKey) {
    summary.processed++;
    summary.errors.push({ rowNumber, message: "Could not derive a slug" });
    return null;
  }

  if (seenSlugs.has(slugKey)) {
    summary.processed++;
    summary.errors.push({
      rowNumber,
      message: "Duplicate internship slug in file",
    });
    return null;
  }

  seenSlugs.add(slugKey);
  return {
    rowNumber,
    row,
    slugKey,
    displayName,
  };
}

type QueuedImportRow = {
  parsed: ParsedImportRow;
  recordIndex: number;
};

async function upsertInternshipPayload(
  supabase: SupabaseSecretClient,
  payload: ReturnType<typeof rowToInternshipPayload>,
): Promise<string> {
  const { data, error } = await supabase
    .from("internships")
    .upsert(payload, { onConflict: "slug" })
    .select("id")
    .single();

  if (error) throw error;
  return data!.id;
}

function recordImportRowError(
  summary: InternshipImportSummary,
  parsed: ParsedImportRow,
  error: unknown,
): void {
  summary.processed++;
  summary.errors.push({
    rowNumber: parsed.rowNumber,
    message: formatImportError(error),
  });
}

function recordImportRowSuccess(
  summary: InternshipImportSummary,
  parsed: ParsedImportRow,
  rowMs: number,
): void {
  summary.internshipsUpserted++;
  summary.processed++;
  logImportRow(parsed.rowNumber, parsed.displayName, rowMs);
}

type PreparedImportRow = {
  item: QueuedImportRow;
  payload: ReturnType<typeof rowToInternshipPayload>;
};

async function processImportBatch(
  supabase: SupabaseSecretClient,
  countryIds: Set<string>,
  slugState: InternshipSlugState,
  batch: QueuedImportRow[],
  summary: InternshipImportSummary,
): Promise<void> {
  const upsertReady: QueuedImportRow[] = [];

  for (const item of batch) {
    try {
      const countryCode = cell(item.parsed.row, "country_code")
        .toUpperCase()
        .slice(0, 2);
      if (countryCode.length !== 2) {
        throw new Error("country_code must be a 2-letter code");
      }
      await ensureCountry(supabase, countryIds, countryCode);
      upsertReady.push(item);
    } catch (error) {
      recordImportRowError(summary, item.parsed, error);
    }
  }

  if (upsertReady.length === 0) return;

  const prepared: PreparedImportRow[] = [];

  for (const item of upsertReady) {
    try {
      const payload = rowToInternshipPayload(item.parsed.row);
      payload.slug = assignUniqueInternshipSlug(
        payload.slug,
        payload.name,
        slugState,
      );
      prepared.push({ item, payload });
    } catch (error) {
      recordImportRowError(summary, item.parsed, error);
    }
  }

  if (prepared.length === 0) return;

  const results = await Promise.allSettled(
    prepared.map(async ({ item, payload }) => {
      const rowStartedAt = Date.now();
      await upsertInternshipPayload(supabase, payload);
      return { item, rowMs: Date.now() - rowStartedAt };
    }),
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i]!;
    const item = prepared[i]!.item;
    if (result.status === "fulfilled") {
      recordImportRowSuccess(summary, item.parsed, result.value.rowMs);
      continue;
    }
    recordImportRowError(summary, item.parsed, result.reason);
  }
}

export async function importInternshipsFromCsvRecords(
  supabase: SupabaseSecretClient,
  records: Record<string, string>[],
  options?: { onProgress?: (progress: ImportProgressPayload) => void },
): Promise<InternshipImportSummary> {
  const startedAt = Date.now();
  const summary: InternshipImportSummary = {
    processed: 0,
    internshipsUpserted: 0,
    created: 0,
    updated: 0,
    unchangedCount: 0,
    added: [],
    updatedRows: [],
    errors: [],
  };
  const seenSlugs = new Set<string>();

  console.log(`${IMPORT_LOG} start`, { recordCount: records.length });

  const [countryIds, slugState] = await Promise.all([
    loadCountryIds(supabase),
    loadInternshipSlugState(supabase),
  ]);

  const reportProgress = (index: number) => {
    options?.onProgress?.(
      buildImportProgress("internships", index, records.length),
    );
  };

  if (records.length > 0) {
    reportProgress(0);
  }

  console.log(`${IMPORT_LOG} import start`, {
    rows: records.length,
    upsertBatchSize: UPSERT_BATCH_SIZE,
    elapsedMs: Date.now() - startedAt,
  });

  const queue: QueuedImportRow[] = [];

  for (let i = 0; i < records.length; i++) {
    const parsed = parseImportRow(records[i]!, i + 2, seenSlugs, summary);
    if (!parsed) {
      reportProgress(i + 1);
      continue;
    }

    queue.push({ parsed, recordIndex: i });
  }

  for (
    let batchStart = 0;
    batchStart < queue.length;
    batchStart += UPSERT_BATCH_SIZE
  ) {
    const batch = queue.slice(batchStart, batchStart + UPSERT_BATCH_SIZE);
    const batchMaxIndex = batch[batch.length - 1]!.recordIndex;

    await processImportBatch(supabase, countryIds, slugState, batch, summary);
    reportProgress(batchMaxIndex + 1);
  }

  if (records.length > 0) {
    reportProgress(records.length);
  }

  console.log(`${IMPORT_LOG} complete`, {
    elapsedMs: Date.now() - startedAt,
    processed: summary.processed,
    internshipsUpserted: summary.internshipsUpserted,
    errorCount: summary.errors.length,
  });

  return summary;
}
