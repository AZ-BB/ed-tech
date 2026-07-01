import type { Database, Json } from "@/database.types";
import { formatImportError } from "@/lib/admin-import-error";
import { displayImportName } from "@/lib/admin-import-name-key";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { flagFromCountryCode } from "@/lib/country-flag-emoji";
import {
  assignUniqueDiscoverySlug,
  loadScholarshipSlugState,
  slugifyScholarshipName,
  type ScholarshipSlugState,
} from "@/lib/scholarship-discovery-slug";
import { buildImportProgress, type ImportProgressPayload } from "@/lib/admin-import-progress";
import type { ImportRowAddition, ImportRowUpdate } from "@/lib/admin-import-report";
import {
  mergeApplicationUrlIntoDiscoveryPayload,
  normalizeScholarshipApplicationUrl,
  scholarshipLinkFieldsFromApplicationUrl,
} from "@/lib/scholarship-application-url";
import { buildEnglishReqFromMinScores } from "@/lib/scholarship-requirement-fields";
import { csvToRecords } from "@/lib/university-csv-import";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export { csvToRecords };

const IMPORT_LOG = "[scholarship-csv-import]";
const UPSERT_BATCH_SIZE = 5;

type ScholarshipType = Database["public"]["Enums"]["scholarship_type"];
type ScholarshipCompetition = Database["public"]["Enums"]["scholarship_competition_type"];
type TuitionType = Database["public"]["Enums"]["tuition_type"];

type SupabaseSecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

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
  ].sort();
}

function logImportRow(rowNumber: number, name: string, rowMs: number): void {
  console.log(`${IMPORT_LOG} row`, { rowNumber, name, rowMs });
}

async function loadCountryIds(supabase: SupabaseSecretClient): Promise<Set<string>> {
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

  const { error } = await supabase.from("countries").insert({ id: cc, name: cc });
  if (error) throw error;
  countryIds.add(cc);
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

function scholarshipTypeBadgeClass(type: ScholarshipType | null): string {
  if (type === "government") return "badge-gov";
  if (type === "university") return "badge-uni";
  if (type === "foundation") return "badge-foundation";
  if (type === "corporate") return "badge-ext";
  return "badge-gov";
}

function formatScholarshipTypeLabel(type: ScholarshipType | null): string {
  if (!type) return "Other";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatCompetitionLabel(competition: ScholarshipCompetition | null): string {
  if (!competition) return "Medium";
  return competition
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildDiscoveryPayloadFromImportRow(
  row: Record<string, string>,
  defaultYear: number,
  discoverySlug: string,
  destinationCodes: string[],
): Json {
  const name = displayImportName(cell(row, "name"));
  const nationalityCode = cell(row, "nationality_country_code").toUpperCase().slice(0, 2);
  const type = parseScholarshipType(cell(row, "type"));
  const coverageRaw = cell(row, "coverage").trim().toLowerCase();
  const coverage = coverageRaw === "partial" ? "partial" : "full";
  const docs = [1, 2, 3, 4, 5]
    .map((i) => cell(row, `doc_${i}`))
    .filter(Boolean);
  const applicationUrlRaw = cell(row, "application_url");
  const linkFields = scholarshipLinkFieldsFromApplicationUrl(applicationUrlRaw);

  return {
    id: discoverySlug,
    name,
    provider: "",
    country: getCountryNameByAlpha2(nationalityCode) ?? "",
    flag: flagFromCountryCode(nationalityCode),
    type: formatScholarshipTypeLabel(type),
    badgeClass: scholarshipTypeBadgeClass(type),
    eligibleNationalities: nationalityCode.length === 2 ? [nationalityCode.toLowerCase()] : ["other"],
    destinations: destinationCodes.length > 0 ? destinationCodes : ["Global"],
    coverage,
    coverageLabel: coverage === "partial" ? "Partial" : "Full ride",
    deadline: cell(row, "deadline") || "",
    eligSummary: cell(row, "target_students") || "",
    shortSummary: cell(row, "description") || "",
    degreeLevels: cell(row, "level") || "",
    fieldsOfStudy: cell(row, "fields") || "",
    academicElig: cell(row, "academic_eligibility") || "",
    englishReq: buildEnglishReqFromMinScores(
      parseOptionalFloat(cell(row, "ielts_min")),
      parseOptionalInt(cell(row, "toefl_min")),
    ),
    otherElig: cell(row, "other") || "",
    requiredDocs: docs.length ? docs : ["—"],
    applicationMethod: cell(row, "method") || "",
    coverageDetails: {
      tuition: cell(row, "tuition") || "—",
      stipend: cell(row, "living_stipend") || "—",
      travel: cell(row, "travel") || "—",
      other: cell(row, "other_benefits") || "—",
    },
    competition: formatCompetitionLabel(parseCompetition(cell(row, "competition"))),
    renewable: parseBool(cell(row, "is_renewable"), false) ? "Yes" : "No",
    applicationUrl: linkFields.applicationUrl,
    applicationWebsiteName: "",
    applicationWebsiteDomain: linkFields.applicationWebsiteDomain,
    isOfficialSource: Boolean(linkFields.applicationUrl),
    linkStatus: linkFields.linkStatus,
    linkNotes: "",
    fallbackUrl: "",
    deadline_date: parseDeadline(cell(row, "deadline_date"), defaultYear),
  } as Json;
}

function rowToScholarshipPayload(
  row: Record<string, string>,
  defaultYear: number,
  destinationCodes: string[],
) {
  const name = displayImportName(cell(row, "name"));
  const discoverySlugRaw = cell(row, "discovery_slug");
  const discoverySlug = discoverySlugRaw || slugifyScholarshipName(name);
  const applicationUrl = normalizeScholarshipApplicationUrl(cell(row, "application_url")) || null;

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
    discovery_slug: discoverySlug,
    application_url: applicationUrl,
    discovery_payload: mergeApplicationUrlIntoDiscoveryPayload(
      buildDiscoveryPayloadFromImportRow(row, defaultYear, discoverySlug, destinationCodes),
      applicationUrl,
      { name, slug: discoverySlug },
    ),
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

  const nameKey = displayImportName(name);
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

type QueuedImportRow = {
  parsed: ParsedImportRow;
  recordIndex: number;
};

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

async function upsertScholarshipPayload(
  supabase: SupabaseSecretClient,
  payload: ReturnType<typeof rowToScholarshipPayload>,
): Promise<string> {
  const { data, error } = await supabase
    .from("scholarships")
    .upsert(payload, { onConflict: "name" })
    .select("id")
    .single();

  if (error) throw error;
  return data!.id;
}

function recordImportRowError(
  summary: ScholarshipImportSummary,
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
  summary: ScholarshipImportSummary,
  parsed: ParsedImportRow,
  rowMs: number,
): void {
  summary.scholarshipsUpserted++;
  summary.processed++;
  logImportRow(parsed.rowNumber, parsed.displayName, rowMs);
}

async function ensureCountriesForParsedRow(
  supabase: SupabaseSecretClient,
  countryIds: Set<string>,
  parsed: ParsedImportRow,
): Promise<void> {
  const nationalityCode = cell(parsed.row, "nationality_country_code").toUpperCase().slice(0, 2);
  if (nationalityCode.length !== 2) {
    throw new Error("nationality_country_code must be a 2-letter code");
  }

  await ensureCountry(supabase, countryIds, nationalityCode);
  for (const code of parsed.destinationCodes) {
    await ensureCountry(supabase, countryIds, code);
  }
}

type PreparedImportRow = {
  item: QueuedImportRow;
  payload: ReturnType<typeof rowToScholarshipPayload>;
};

async function processImportBatch(
  supabase: SupabaseSecretClient,
  countryIds: Set<string>,
  slugState: ScholarshipSlugState,
  batch: QueuedImportRow[],
  defaultYear: number,
  summary: ScholarshipImportSummary,
): Promise<void> {
  const upsertReady: QueuedImportRow[] = [];

  for (const item of batch) {
    try {
      await ensureCountriesForParsedRow(supabase, countryIds, item.parsed);
      upsertReady.push(item);
    } catch (error) {
      recordImportRowError(summary, item.parsed, error);
    }
  }

  if (upsertReady.length === 0) return;

  const prepared: PreparedImportRow[] = [];

  for (const item of upsertReady) {
    try {
      const payload = rowToScholarshipPayload(
        item.parsed.row,
        defaultYear,
        item.parsed.destinationCodes,
      );
      payload.discovery_slug = assignUniqueDiscoverySlug(
        payload.discovery_slug,
        payload.name,
        slugState,
      );
      if (
        payload.discovery_payload &&
        typeof payload.discovery_payload === "object" &&
        !Array.isArray(payload.discovery_payload)
      ) {
        (payload.discovery_payload as Record<string, unknown>).id = payload.discovery_slug;
      }
      prepared.push({ item, payload });
    } catch (error) {
      recordImportRowError(summary, item.parsed, error);
    }
  }

  if (prepared.length === 0) return;

  const results = await Promise.allSettled(
    prepared.map(async ({ item, payload }) => {
      const rowStartedAt = Date.now();
      const scholarshipId = await upsertScholarshipPayload(supabase, payload);
      await syncDestinationsForRow(supabase, scholarshipId, item.parsed.destinationCodes);
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

  console.log(`${IMPORT_LOG} start`, { recordCount: records.length, defaultYear });

  const [countryIds, slugState] = await Promise.all([
    loadCountryIds(supabase),
    loadScholarshipSlugState(supabase),
  ]);

  const reportProgress = (index: number) => {
    options?.onProgress?.(buildImportProgress("scholarships", index, records.length));
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
    const parsed = parseImportRow(records[i]!, i + 2, seenNames, summary);
    if (!parsed) {
      reportProgress(i + 1);
      continue;
    }

    queue.push({ parsed, recordIndex: i });
  }

  for (let batchStart = 0; batchStart < queue.length; batchStart += UPSERT_BATCH_SIZE) {
    const batch = queue.slice(batchStart, batchStart + UPSERT_BATCH_SIZE);
    const batchMaxIndex = batch[batch.length - 1]!.recordIndex;

    await processImportBatch(supabase, countryIds, slugState, batch, defaultYear, summary);
    reportProgress(batchMaxIndex + 1);
  }

  if (records.length > 0) {
    reportProgress(records.length);
  }

  console.log(`${IMPORT_LOG} complete`, {
    elapsedMs: Date.now() - startedAt,
    processed: summary.processed,
    scholarshipsUpserted: summary.scholarshipsUpserted,
    errorCount: summary.errors.length,
  });

  return summary;
}
