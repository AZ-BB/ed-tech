import type { Database, Json } from "@/database.types"
import { formatImportError } from "@/lib/admin-import-error"
import { displayImportName } from "@/lib/admin-import-name-key"
import { buildImportProgress, type ImportProgressPayload } from "@/lib/admin-import-progress"
import type { ImportRowAddition, ImportRowUpdate } from "@/lib/admin-import-report"
import { createSupabaseSecretClient } from "@/utils/supabase-server"

const IMPORT_LOG = "[university-csv-import]"
const UPSERT_BATCH_SIZE = 5

type UniversityTempMetaData = {
  version: 1
  majors: { name: string; programs: string[] }[]
}

type UniversityDifficulty = Database["public"]["Enums"]["university_difficulty"]

type SupabaseSecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>

type Delimiter = "," | "\t"

type ProgramBlock = {
  majorName: string
  programs: string[]
}

function programBlocksToTempMeta(blocks: ProgramBlock[]): UniversityTempMetaData {
  return {
    version: 1,
    majors: blocks.map((block) => ({
      name: block.majorName.trim(),
      programs: block.programs.map((program) => program.trim()).filter(Boolean),
    })),
  }
}

function logImportRow(rowNumber: number, name: string, rowMs: number): void {
  console.log(`${IMPORT_LOG} row`, { rowNumber, name, rowMs })
}

/** Delimiter-aware parse (quoted fields, RFC 4180-style). */
export function parseDelimited(text: string, delimiter: Delimiter): string[][] {
  const result: string[][] = []
  let row: string[] = []
  let cur = ""
  let inQuotes = false

  const pushRow = () => {
    row.push(cur)
    cur = ""
    if (row.some((cell) => cell.length > 0)) {
      result.push(row)
    }
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delimiter) {
      row.push(cur)
      cur = ""
    } else if (c === "\n") {
      pushRow()
    } else if (c === "\r") {
      if (text[i + 1] === "\n") i++
      pushRow()
    } else {
      cur += c
    }
  }

  row.push(cur)
  if (row.some((cell) => cell.length > 0)) {
    result.push(row)
  }

  return result
}

function detectDelimiter(text: string): Delimiter {
  const sample = text.slice(0, Math.min(text.length, 8192))
  const firstNl = sample.search(/\r\n|\r|\n/)
  const firstLine = firstNl >= 0 ? sample.slice(0, firstNl) : sample
  const tabs = (firstLine.match(/\t/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  return tabs > commas ? "\t" : ","
}

export function csvToRecords(text: string): Record<string, string>[] {
  const delim = detectDelimiter(text)
  const grid = parseDelimited(text, delim)
  if (grid.length < 2) return []

  const headers = grid[0]!.map((h) => h.trim())
  const records: Record<string, string>[] = []

  for (let r = 1; r < grid.length; r++) {
    const values = grid[r]!
    const rec: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      rec[headers[j]!] = values[j] ?? ""
    }
    records.push(rec)
  }

  return records
}

function cell(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== "") return String(v).trim()
  }
  return ""
}

function parseOptionalInt(s: string): number | null {
  if (!s) return null
  const n = Number.parseInt(s.replace(/,/g, ""), 10)
  return Number.isFinite(n) ? n : null
}

function parseOptionalFloat(s: string): number | null {
  if (!s) return null
  const n = Number.parseFloat(s.replace(/,/g, ""))
  return Number.isFinite(n) ? n : null
}

function parseIsPublic(typeStr: string): boolean {
  const t = typeStr.toLowerCase()
  if (t.includes("private")) return false
  if (t.includes("public")) return true
  return false
}

function parseBool(s: string, defaultValue: boolean): boolean {
  const t = s.trim().toLowerCase()
  if (!t) return defaultValue
  if (t === "true" || t === "1" || t === "yes" || t === "y") return true
  if (t === "false" || t === "0" || t === "no" || t === "n") return false
  return defaultValue
}

function parseDifficulty(s: string): UniversityDifficulty | null {
  const t = s.trim().toLowerCase()
  if (t === "easy" || t === "medium" || t === "hard") return t
  return null
}

function parseDeadline(s: string, defaultYear: number): string | null {
  const t = s.trim()
  if (!t) return null
  const tryIso = Date.parse(t)
  if (!Number.isNaN(tryIso)) {
    return new Date(tryIso).toISOString().split("T")[0]!
  }
  const withYear = Date.parse(`${t} ${defaultYear}`)
  if (!Number.isNaN(withYear)) {
    return new Date(withYear).toISOString().split("T")[0]!
  }
  return null
}

function buildDocuments(row: Record<string, string>): Json | null {
  const docs = [1, 2, 3, 4, 5]
    .map((i) => cell(row, `doc_${i}`))
    .filter(Boolean)
  return docs.length ? docs : null
}

function tuitionFromRow(row: Record<string, string>): number | null {
  const amount = parseOptionalFloat(cell(row, "tuition_amount"))
  if (amount != null) return amount
  const display = cell(row, "tuition_display")
  const m = display.match(/[\d,]+(?:\.\d+)?/)
  if (m) return parseOptionalFloat(m[0])
  return null
}

function livingFromRow(row: Record<string, string>): number | null {
  const amount = parseOptionalFloat(cell(row, "living_cost_annual"))
  if (amount != null) return amount
  const display = cell(row, "living_display")
  const m = display.match(/[\d,]+(?:\.\d+)?/)
  if (m) return parseOptionalFloat(m[0])
  return null
}

function splitPrograms(items: string): string[] {
  if (!items.trim()) return []
  return items
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function programBlocksFromRow(row: Record<string, string>): ProgramBlock[] {
  const blocks: ProgramBlock[] = []
  for (let g = 1; g <= 4; g++) {
    const majorName = cell(row, `prog${g}_name`)
    const programs = splitPrograms(cell(row, `prog${g}_items`))
    if (majorName) blocks.push({ majorName, programs })
  }
  return blocks.sort((a, b) => a.majorName.localeCompare(b.majorName))
}

async function loadCountryIds(supabase: SupabaseSecretClient): Promise<Set<string>> {
  const { data, error } = await supabase.from("countries").select("id")
  if (error) throw error
  return new Set((data ?? []).map((country) => country.id))
}

async function ensureCountry(
  supabase: SupabaseSecretClient,
  countryIds: Set<string>,
  code: string,
  name: string,
): Promise<void> {
  const cc = code.trim().toUpperCase().slice(0, 2)
  if (cc.length !== 2) throw new Error(`Invalid country_code: ${code}`)
  if (countryIds.has(cc)) return

  const countryName = name.trim() || cc
  const { error } = await supabase.from("countries").insert({ id: cc, name: countryName })
  if (error) throw error
  countryIds.add(cc)
}

export type ImportSummary = {
  processed: number
  universitiesUpserted: number
  programsQueued: number
  created: number
  updated: number
  unchangedCount: number
  added: ImportRowAddition[]
  updatedRows: ImportRowUpdate[]
  errors: { rowNumber: number; message: string }[]
}

function rowToUniversityPayload(row: Record<string, string>, defaultYear: number) {
  const name = displayImportName(cell(row, "name"))
  const city = cell(row, "city")
  const countryCode = cell(row, "country_code").toUpperCase().slice(0, 2)
  const scholarshipNote = cell(row, "scholarship_note")

  return {
    name,
    city: city || "—",
    state: cell(row, "state_region") || null,
    country_code: countryCode,
    is_public: parseIsPublic(cell(row, "type")),
    description: cell(row, "description") || null,
    ranking: parseOptionalInt(cell(row, "ranking")),
    logo_url: cell(row, "logo_url") || null,
    acceptance_rate: parseOptionalInt(cell(row, "acceptance_rate")),
    intl_students: parseOptionalInt(cell(row, "intl_students_pct")),
    website_url: cell(row, "website") || null,
    email: cell(row, "email") || null,
    phone: cell(row, "phone") || null,
    admission_page_url: cell(row, "admissions_url") || null,
    address: cell(row, "address") || null,
    ielts_min_score: parseOptionalFloat(cell(row, "ielts_min")),
    toefl_min_score: parseOptionalInt(cell(row, "toefl_min")),
    sat_policy: cell(row, "sat_policy") || null,
    documents: buildDocuments(row),
    deadline_date: parseDeadline(cell(row, "deadline_primary"), defaultYear),
    method: cell(row, "application_method") || null,
    application_fee: parseOptionalFloat(cell(row, "application_fee")),
    intakes: cell(row, "intakes") || null,
    tuition_per_year: tuitionFromRow(row),
    tuition_display: cell(row, "tuition_display") || null,
    estimated_living_cost_per_year: livingFromRow(row),
    living_display: cell(row, "living_display") || null,
    is_scholarship_available: scholarshipNote.length > 0,
    is_priority: parseBool(cell(row, "is_priority"), false),
    difficulty: parseDifficulty(cell(row, "difficulty")),
    is_active: parseBool(cell(row, "is_active"), true),
  }
}

type ParsedImportRow = {
  rowNumber: number
  row: Record<string, string>
  nameKey: string
  displayName: string
}

function parseImportRow(
  row: Record<string, string>,
  rowNumber: number,
  seenNames: Set<string>,
  summary: ImportSummary,
): ParsedImportRow | null {
  const name = cell(row, "name")
  if (!name) {
    summary.processed++
    return null
  }

  const nameKey = displayImportName(name)
  if (seenNames.has(nameKey)) {
    summary.processed++
    summary.errors.push({
      rowNumber,
      message: "Duplicate university name in file",
    })
    return null
  }

  seenNames.add(nameKey)
  return { rowNumber, row, nameKey, displayName: displayImportName(name) }
}

type QueuedImportRow = {
  parsed: ParsedImportRow
  tempMetaData: UniversityTempMetaData
  recordIndex: number
}

function universityUpsertPayload(
  parsed: ParsedImportRow,
  defaultYear: number,
  tempMetaData: UniversityTempMetaData,
) {
  return {
    ...rowToUniversityPayload(parsed.row, defaultYear),
    temp_meta_data: tempMetaData as Json,
  }
}

async function ensureCountryForParsedRow(
  supabase: SupabaseSecretClient,
  countryIds: Set<string>,
  parsed: ParsedImportRow,
): Promise<void> {
  const countryName = cell(parsed.row, "country")
  const countryCode = cell(parsed.row, "country_code").toUpperCase().slice(0, 2)
  if (countryCode.length !== 2) {
    throw new Error("country_code must be a 2-letter code")
  }
  await ensureCountry(supabase, countryIds, countryCode, countryName)
}

async function upsertUniversityPayload(
  supabase: SupabaseSecretClient,
  payload: ReturnType<typeof universityUpsertPayload>,
): Promise<void> {
  const { error } = await supabase
    .from("universities")
    .upsert(payload, { onConflict: "name" })
  if (error) throw error
}

function recordImportRowError(
  summary: ImportSummary,
  parsed: ParsedImportRow,
  error: unknown,
): void {
  summary.processed++
  summary.errors.push({
    rowNumber: parsed.rowNumber,
    message: formatImportError(error),
  })
}

function recordImportRowSuccess(
  summary: ImportSummary,
  parsed: ParsedImportRow,
  rowMs: number,
): void {
  summary.universitiesUpserted++
  summary.programsQueued++
  summary.processed++
  logImportRow(parsed.rowNumber, parsed.displayName, rowMs)
}

async function processImportBatch(
  supabase: SupabaseSecretClient,
  countryIds: Set<string>,
  batch: QueuedImportRow[],
  defaultYear: number,
  summary: ImportSummary,
): Promise<void> {
  const upsertReady: QueuedImportRow[] = []

  for (const item of batch) {
    try {
      await ensureCountryForParsedRow(supabase, countryIds, item.parsed)
      upsertReady.push(item)
    } catch (error) {
      recordImportRowError(summary, item.parsed, error)
    }
  }

  if (upsertReady.length === 0) return

  const results = await Promise.allSettled(
    upsertReady.map(async (item) => {
      const rowStartedAt = Date.now()
      const payload = universityUpsertPayload(item.parsed, defaultYear, item.tempMetaData)
      await upsertUniversityPayload(supabase, payload)
      return { item, rowMs: Date.now() - rowStartedAt }
    }),
  )

  for (let i = 0; i < results.length; i++) {
    const result = results[i]!
    const item = upsertReady[i]!
    if (result.status === "fulfilled") {
      recordImportRowSuccess(summary, item.parsed, result.value.rowMs)
      continue
    }
    recordImportRowError(summary, item.parsed, result.reason)
  }
}

export async function importUniversitiesFromCsvRecords(
  supabase: SupabaseSecretClient,
  records: Record<string, string>[],
  options?: { defaultYear?: number; onProgress?: (progress: ImportProgressPayload) => void },
): Promise<ImportSummary> {
  const startedAt = Date.now()
  const defaultYear = options?.defaultYear ?? new Date().getFullYear()
  const summary: ImportSummary = {
    processed: 0,
    universitiesUpserted: 0,
    programsQueued: 0,
    created: 0,
    updated: 0,
    unchangedCount: 0,
    added: [],
    updatedRows: [],
    errors: [],
  }
  const seenNames = new Set<string>()

  console.log(`${IMPORT_LOG} start`, { recordCount: records.length, defaultYear })

  const countryIds = await loadCountryIds(supabase)

  const reportProgress = (index: number) => {
    options?.onProgress?.(buildImportProgress("universities", index, records.length))
  }

  if (records.length > 0) {
    reportProgress(0)
  }

  console.log(`${IMPORT_LOG} import start`, {
    rows: records.length,
    upsertBatchSize: UPSERT_BATCH_SIZE,
    elapsedMs: Date.now() - startedAt,
  })

  const queue: QueuedImportRow[] = []

  for (let i = 0; i < records.length; i++) {
    const parsed = parseImportRow(records[i]!, i + 2, seenNames, summary)
    if (!parsed) {
      reportProgress(i + 1)
      continue
    }

    queue.push({
      parsed,
      tempMetaData: programBlocksToTempMeta(programBlocksFromRow(parsed.row)),
      recordIndex: i,
    })
  }

  for (let batchStart = 0; batchStart < queue.length; batchStart += UPSERT_BATCH_SIZE) {
    const batch = queue.slice(batchStart, batchStart + UPSERT_BATCH_SIZE)
    const batchMaxIndex = batch[batch.length - 1]!.recordIndex

    await processImportBatch(supabase, countryIds, batch, defaultYear, summary)
    reportProgress(batchMaxIndex + 1)
  }

  if (records.length > 0) {
    reportProgress(records.length)
  }

  console.log(`${IMPORT_LOG} complete`, {
    elapsedMs: Date.now() - startedAt,
    processed: summary.processed,
    universitiesUpserted: summary.universitiesUpserted,
    programsQueued: summary.programsQueued,
    created: summary.created,
    updated: summary.updated,
    unchangedCount: summary.unchangedCount,
    errorCount: summary.errors.length,
  })

  return summary
}
