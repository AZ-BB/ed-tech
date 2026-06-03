import type { Database, Json } from "@/database.types"
import { displayImportName, normalizeImportNameKey } from "@/lib/admin-import-name-key"
import { buildImportProgress, type ImportProgressPayload } from "@/lib/admin-import-progress"
import {
  diffImportRecords,
  mergeFieldChanges,
  normalizeCompareBoolean,
  normalizeCompareDecimal,
  normalizeCompareInteger,
  normalizeCompareString,
  pushUpdatedRow,
  type ImportRowAddition,
  type ImportRowUpdate,
} from "@/lib/admin-import-report"
import { createSupabaseSecretClient } from "@/utils/supabase-server"

const IMPORT_LOG = "[university-csv-import]"

type UniversityDifficulty = Database["public"]["Enums"]["university_difficulty"]

type SupabaseSecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>

type Delimiter = "," | "\t"

const UNIVERSITY_DIFF_FIELDS = [
  "name",
  "city",
  "state_region",
  "country_code",
  "type",
  "description",
  "ranking",
  "logo_url",
  "acceptance_rate",
  "intl_students_pct",
  "website",
  "email",
  "phone",
  "admissions_url",
  "address",
  "ielts_min",
  "toefl_min",
  "sat_policy",
  "documents",
  "deadline_primary",
  "is_priority",
  "application_method",
  "application_fee",
  "intakes",
  "tuition_amount",
  "living_cost_annual",
  "scholarship_note",
  "difficulty",
  "is_active",
  "programs",
] as const

type UnivMajorProgramRow = {
  programs: { name: string } | null
}

type UnivMajorRow = {
  majors: { name: string } | null
  university_major_programs: UnivMajorProgramRow[] | null
}

type UniversityDbRow = {
  id: string
  name: string
  city: string
  state: string | null
  country_code: string
  is_public: boolean
  is_active: boolean
  is_priority: boolean
  is_scholarship_available: boolean
  description: string | null
  ranking: number | null
  logo_url: string | null
  acceptance_rate: number | null
  intl_students: number | null
  website_url: string | null
  email: string | null
  phone: string | null
  admission_page_url: string | null
  address: string | null
  ielts_min_score: number | null
  toefl_min_score: number | null
  sat_policy: string | null
  documents: Json | null
  deadline_date: string | null
  method: string | null
  application_fee: number | null
  intakes: string | null
  tuition_per_year: number | null
  estimated_living_cost_per_year: number | null
  difficulty: string | null
  university_majors: UnivMajorRow[] | null
}

type ProgramBlock = {
  majorName: string
  programs: string[]
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

function documentsToString(doc: Json | null): string {
  if (doc == null) return ""
  if (Array.isArray(doc)) {
    return doc.filter((x): x is string => typeof x === "string").join(", ")
  }
  if (typeof doc === "object" && doc !== null && "items" in doc) {
    const items = (doc as { items: unknown }).items
    if (Array.isArray(items)) {
      return items.filter((x): x is string => typeof x === "string").join(", ")
    }
  }
  return ""
}

function documentsFromRow(row: Record<string, string>): string {
  return [1, 2, 3, 4, 5]
    .map((i) => cell(row, `doc_${i}`))
    .filter(Boolean)
    .join(", ")
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

function str(value: string | number | null | undefined): string {
  if (value == null) return ""
  return String(value)
}

function buildProgramBlocksFromDb(rows: UnivMajorRow[] | null): ProgramBlock[] {
  if (!rows?.length) return []
  return rows
    .map((row) => {
      const majorName = row.majors?.name?.trim() || ""
      const programs =
        row.university_major_programs
          ?.map((p) => p.programs?.name?.trim())
          .filter((n): n is string => Boolean(n)) ?? []
      return { majorName, programs }
    })
    .filter((b) => b.majorName.length > 0)
    .sort((a, b) => a.majorName.localeCompare(b.majorName))
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

/** Matches export Excel columns so re-import without edits does not false-positive. */
function universityDbToExportFlatRow(row: UniversityDbRow): Record<string, string> {
  const blocks = buildProgramBlocksFromDb(row.university_majors).slice(0, 4)
  const docs = documentsToArray(row.documents)

  const flat: Record<string, string> = {
    name: row.name,
    country_code: row.country_code,
    city: row.city,
    state_region: row.state?.trim() ?? "",
    type: row.is_public ? "public" : "private",
    description: row.description?.trim() ?? "",
    ranking: str(row.ranking),
    logo_url: row.logo_url?.trim() ?? "",
    acceptance_rate: str(row.acceptance_rate),
    intl_students_pct: str(row.intl_students),
    website: row.website_url?.trim() ?? "",
    email: row.email?.trim() ?? "",
    phone: row.phone?.trim() ?? "",
    admissions_url: row.admission_page_url?.trim() ?? "",
    address: row.address?.trim() ?? "",
    ielts_min: str(row.ielts_min_score),
    toefl_min: str(row.toefl_min_score),
    sat_policy: row.sat_policy?.trim() ?? "",
    doc_1: docs[0] ?? "",
    doc_2: docs[1] ?? "",
    doc_3: docs[2] ?? "",
    doc_4: docs[3] ?? "",
    doc_5: docs[4] ?? "",
    deadline_primary: row.deadline_date?.trim() ?? "",
    is_priority: row.is_priority ? "true" : "false",
    application_method: row.method?.trim() ?? "",
    application_fee: str(row.application_fee),
    intakes: row.intakes?.trim() ?? "",
    tuition_amount: str(row.tuition_per_year),
    living_cost_annual: str(row.estimated_living_cost_per_year),
    scholarship_note: row.is_scholarship_available ? "Scholarships available" : "",
    difficulty: row.difficulty?.trim() ?? "",
    is_active: row.is_active ? "true" : "false",
  }

  for (let i = 0; i < 4; i++) {
    const n = i + 1
    const block = blocks[i]
    flat[`prog${n}_name`] = block?.majorName ?? ""
    flat[`prog${n}_items`] = block?.programs.join(",") ?? ""
  }

  return flat
}

function documentsToArray(doc: Json | null): string[] {
  if (doc == null) return []
  if (Array.isArray(doc)) {
    return doc.filter((x): x is string => typeof x === "string")
  }
  if (typeof doc === "object" && doc !== null && "items" in doc) {
    const items = (doc as { items: unknown }).items
    if (Array.isArray(items)) {
      return items.filter((x): x is string => typeof x === "string")
    }
  }
  return []
}

function programsCanonicalFromFlat(row: Record<string, string>): string {
  const blocks = programBlocksFromRow(row)
  if (!blocks.length) return ""
  return blocks.map((b) => `${b.majorName}: ${b.programs.join(",")}`).join(" | ")
}

function normalizeDeadlineForCompare(raw: string, defaultYear: number): string {
  const t = raw.trim()
  if (!t) return ""
  const parsed = parseDeadline(t, defaultYear)
  if (parsed) return parsed
  const iso = t.match(/^(\d{4}-\d{2}-\d{2})/)
  return iso?.[1] ?? t
}

function canonicalTypeFromFlat(typeRaw: string): string {
  const t = typeRaw.trim().toLowerCase()
  if (t.includes("private")) return "private"
  if (t.includes("public")) return "public"
  return parseIsPublic(typeRaw) ? "public" : "private"
}

/** Canonical form for before/after diff (aligned with export template columns). */
function canonicalUniversitySnapshot(
  flat: Record<string, string>,
  defaultYear: number,
): Record<string, string> {
  const scholarshipNote = cell(flat, "scholarship_note")

  return {
    name: displayImportName(cell(flat, "name")),
    city: normalizeCompareString(cell(flat, "city")),
    state_region: normalizeCompareString(cell(flat, "state_region")),
    country_code: cell(flat, "country_code").toUpperCase().slice(0, 2),
    type: canonicalTypeFromFlat(cell(flat, "type")),
    description: normalizeCompareString(cell(flat, "description")),
    ranking: normalizeCompareInteger(cell(flat, "ranking")),
    logo_url: normalizeCompareString(cell(flat, "logo_url")),
    acceptance_rate: normalizeCompareInteger(cell(flat, "acceptance_rate")),
    intl_students_pct: normalizeCompareInteger(cell(flat, "intl_students_pct")),
    website: normalizeCompareString(cell(flat, "website")),
    email: normalizeCompareString(cell(flat, "email")),
    phone: normalizeCompareString(cell(flat, "phone")),
    admissions_url: normalizeCompareString(cell(flat, "admissions_url")),
    address: normalizeCompareString(cell(flat, "address")),
    ielts_min: normalizeCompareDecimal(cell(flat, "ielts_min")),
    toefl_min: normalizeCompareInteger(cell(flat, "toefl_min")),
    sat_policy: normalizeCompareString(cell(flat, "sat_policy")),
    documents: documentsFromRow(flat),
    deadline_primary: normalizeDeadlineForCompare(cell(flat, "deadline_primary"), defaultYear),
    is_priority: normalizeCompareBoolean(cell(flat, "is_priority"), false),
    application_method: normalizeCompareString(cell(flat, "application_method")),
    application_fee: normalizeCompareDecimal(cell(flat, "application_fee")),
    intakes: normalizeCompareString(cell(flat, "intakes")),
    tuition_amount: normalizeCompareDecimal(cell(flat, "tuition_amount")),
    living_cost_annual: normalizeCompareDecimal(cell(flat, "living_cost_annual")),
    scholarship_note: scholarshipNote.length > 0 ? "Scholarships available" : "",
    difficulty: normalizeCompareString(cell(flat, "difficulty")).toLowerCase(),
    is_active: normalizeCompareBoolean(cell(flat, "is_active"), true),
    programs: programsCanonicalFromFlat(flat),
  }
}

const PAGE_SIZE = 1000

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const page = data ?? []
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const code = "code" in error ? String(error.code) : ""
  return code === "23505"
}

class UniversityImportCache {
  private readonly supabase: SupabaseSecretClient
  private readonly countryIds = new Set<string>()
  private readonly majors = new Map<string, number>()
  private readonly programs = new Map<string, number>()
  private readonly universities = new Map<string, string>()
  private readonly snapshots = new Map<string, Record<string, string>>()
  private readonly uniMajors = new Map<string, number>()
  private readonly uniMajorPrograms = new Set<string>()

  constructor(
    supabase: SupabaseSecretClient,
    seed?: {
      countries?: { id: string }[]
      majors?: { id: number; name: string }[]
      programs?: { id: number; major_id: number; name: string }[]
      universities?: UniversityDbRow[]
      universityMajors?: { id: number; university_id: string; major_id: number }[]
      universityMajorPrograms?: { university_major_id: number; program_id: number }[]
    },
  ) {
    this.supabase = supabase

    for (const country of seed?.countries ?? []) {
      this.countryIds.add(country.id)
    }

    for (const major of seed?.majors ?? []) {
      const key = major.name.trim()
      if (key) this.majors.set(key, major.id)
    }

    for (const program of seed?.programs ?? []) {
      const key = programKey(program.major_id, program.name)
      if (key) this.programs.set(key, program.id)
    }

    const defaultYear = new Date().getFullYear()
    for (const university of seed?.universities ?? []) {
      const key = normalizeImportNameKey(university.name)
      if (!key) continue
      this.universities.set(key, university.id)
      this.snapshots.set(
        key,
        canonicalUniversitySnapshot(universityDbToExportFlatRow(university), defaultYear),
      )
    }

    for (const link of seed?.universityMajors ?? []) {
      this.uniMajors.set(uniMajorKey(link.university_id, link.major_id), link.id)
    }

    for (const link of seed?.universityMajorPrograms ?? []) {
      this.uniMajorPrograms.add(
        uniMajorProgramKey(link.university_major_id, link.program_id),
      )
    }
  }

  async ensureCountry(code: string, name: string): Promise<void> {
    const cc = code.trim().toUpperCase().slice(0, 2)
    if (cc.length !== 2) throw new Error(`Invalid country_code: ${code}`)
    if (this.countryIds.has(cc)) return

    const countryName = name.trim() || cc
    const { error } = await this.supabase.from("countries").insert({ id: cc, name: countryName })
    if (error) throw error
    this.countryIds.add(cc)
  }

  getUniversityId(nameKey: string): string | undefined {
    return this.universities.get(nameKey)
  }

  getSnapshot(nameKey: string): Record<string, string> | undefined {
    return this.snapshots.get(nameKey)
  }

  setUniversityId(nameKey: string, id: string, snapshot: Record<string, string>): void {
    this.universities.set(nameKey, id)
    this.snapshots.set(nameKey, snapshot)
  }

  clearUniversityProgramCache(universityId: string): void {
    for (const key of [...this.uniMajors.keys()]) {
      if (key.startsWith(`${universityId}\0`)) {
        this.uniMajors.delete(key)
      }
    }
  }

  async replaceProgramsForUniversity(universityId: string): Promise<void> {
    const { data: uniMajors, error: fetchError } = await this.supabase
      .from("university_majors")
      .select("id")
      .eq("university_id", universityId)

    if (fetchError) throw fetchError

    const uniMajorIds = (uniMajors ?? []).map((r) => r.id)
    if (uniMajorIds.length > 0) {
      const { error: progDelError } = await this.supabase
        .from("university_major_programs")
        .delete()
        .in("university_major_id", uniMajorIds)

      if (progDelError) throw progDelError

      const { error: majorDelError } = await this.supabase
        .from("university_majors")
        .delete()
        .eq("university_id", universityId)

      if (majorDelError) throw majorDelError
    }

    this.clearUniversityProgramCache(universityId)
  }

  async getOrCreateMajor(name: string): Promise<number> {
    const key = name.trim()
    const cached = this.majors.get(key)
    if (cached != null) return cached

    const { data: inserted, error } = await this.supabase
      .from("majors")
      .insert({ name: key })
      .select("id")
      .single()

    if (error) {
      if (isDuplicateKeyError(error)) {
        const { data: found, error: findError } = await this.supabase
          .from("majors")
          .select("id")
          .eq("name", key)
          .maybeSingle()
        if (findError) throw findError
        if (found) {
          this.majors.set(key, found.id)
          return found.id
        }
      }
      throw error
    }

    const id = inserted!.id
    this.majors.set(key, id)
    return id
  }

  async getOrCreateProgram(majorId: number, programName: string): Promise<number> {
    const key = programKey(majorId, programName)
    const cached = this.programs.get(key)
    if (cached != null) return cached

    const trimmed = programName.trim()
    const { data: inserted, error } = await this.supabase
      .from("programs")
      .insert({ major_id: majorId, name: trimmed })
      .select("id")
      .single()

    if (error) {
      if (isDuplicateKeyError(error)) {
        const { data: found, error: findError } = await this.supabase
          .from("programs")
          .select("id")
          .eq("major_id", majorId)
          .eq("name", trimmed)
          .maybeSingle()
        if (findError) throw findError
        if (found) {
          this.programs.set(key, found.id)
          return found.id
        }
      }
      throw error
    }

    const id = inserted!.id
    this.programs.set(key, id)
    return id
  }

  async getOrCreateUniversityMajor(universityId: string, majorId: number): Promise<number> {
    const key = uniMajorKey(universityId, majorId)
    const cached = this.uniMajors.get(key)
    if (cached != null) return cached

    const { data: inserted, error } = await this.supabase
      .from("university_majors")
      .insert({ university_id: universityId, major_id: majorId })
      .select("id")
      .single()

    if (error) {
      if (isDuplicateKeyError(error)) {
        const { data: found, error: findError } = await this.supabase
          .from("university_majors")
          .select("id")
          .eq("university_id", universityId)
          .eq("major_id", majorId)
          .maybeSingle()
        if (findError) throw findError
        if (found) {
          this.uniMajors.set(key, found.id)
          return found.id
        }
      }
      throw error
    }

    const id = inserted!.id
    this.uniMajors.set(key, id)
    return id
  }

  async getOrCreateUniversityMajorProgram(
    universityMajorId: number,
    programId: number,
  ): Promise<void> {
    const key = uniMajorProgramKey(universityMajorId, programId)
    if (this.uniMajorPrograms.has(key)) return

    const { error } = await this.supabase.from("university_major_programs").insert({
      university_major_id: universityMajorId,
      program_id: programId,
    })

    if (error) {
      if (isDuplicateKeyError(error)) {
        this.uniMajorPrograms.add(key)
        return
      }
      throw error
    }

    this.uniMajorPrograms.add(key)
  }
}

function programKey(majorId: number, programName: string): string {
  return `${majorId}\0${programName.trim()}`
}

function uniMajorKey(universityId: string, majorId: number): string {
  return `${universityId}\0${majorId}`
}

function uniMajorProgramKey(universityMajorId: number, programId: number): string {
  return `${universityMajorId}\0${programId}`
}

const UNIVERSITY_SELECT = `
  id,
  name,
  city,
  state,
  country_code,
  is_public,
  is_active,
  is_priority,
  is_scholarship_available,
  description,
  ranking,
  logo_url,
  acceptance_rate,
  intl_students,
  website_url,
  email,
  phone,
  admission_page_url,
  address,
  ielts_min_score,
  toefl_min_score,
  sat_policy,
  documents,
  deadline_date,
  method,
  application_fee,
  intakes,
  tuition_per_year,
  estimated_living_cost_per_year,
  difficulty,
  university_majors (
    majors ( name ),
    university_major_programs (
      programs ( name )
    )
  )
`

async function createImportCache(supabase: SupabaseSecretClient): Promise<UniversityImportCache> {
  const cacheStartedAt = Date.now()
  console.log(`${IMPORT_LOG} cache preload start`)

  const [countries, majors, programs, universities, universityMajors, universityMajorPrograms] =
    await Promise.all([
      supabase.from("countries").select("id"),
      fetchAllRows<{ id: number; name: string }>(async (from, to) =>
        supabase.from("majors").select("id, name").range(from, to),
      ),
      fetchAllRows<{ id: number; major_id: number; name: string }>(async (from, to) =>
        supabase.from("programs").select("id, major_id, name").range(from, to),
      ),
      fetchAllRows<UniversityDbRow>(async (from, to) =>
        supabase.from("universities").select(UNIVERSITY_SELECT).range(from, to),
      ),
      fetchAllRows<{ id: number; university_id: string; major_id: number }>(async (from, to) =>
        supabase.from("university_majors").select("id, university_id, major_id").range(from, to),
      ),
      fetchAllRows<{ university_major_id: number; program_id: number }>(async (from, to) =>
        supabase
          .from("university_major_programs")
          .select("university_major_id, program_id")
          .range(from, to),
      ),
    ])

  if (countries.error) throw countries.error

  const cache = new UniversityImportCache(supabase, {
    countries: countries.data ?? [],
    majors,
    programs,
    universities,
    universityMajors,
    universityMajorPrograms,
  })

  console.log(`${IMPORT_LOG} cache preload done`, {
    elapsedMs: Date.now() - cacheStartedAt,
    countries: countries.data?.length ?? 0,
    majors: majors.length,
    programs: programs.length,
    universities: universities.length,
    universityMajors: universityMajors.length,
    universityMajorPrograms: universityMajorPrograms.length,
  })

  return cache
}

export type ImportSummary = {
  processed: number
  universitiesUpserted: number
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
    estimated_living_cost_per_year: livingFromRow(row),
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

  const nameKey = normalizeImportNameKey(name)
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

type UpsertResult = {
  universityId: string
  isNew: boolean
}

async function upsertUniversityRow(
  supabase: SupabaseSecretClient,
  cache: UniversityImportCache,
  parsed: ParsedImportRow,
  defaultYear: number,
): Promise<UpsertResult> {
  const { row, nameKey } = parsed
  const countryName = cell(row, "country")
  const countryCode = cell(row, "country_code").toUpperCase().slice(0, 2)
  if (countryCode.length !== 2) {
    throw new Error("country_code must be a 2-letter code")
  }

  await cache.ensureCountry(countryCode, countryName)

  const payload = rowToUniversityPayload(row, defaultYear)
  const afterSnapshot = canonicalUniversitySnapshot(row, defaultYear)
  const existingId = cache.getUniversityId(nameKey)

  if (existingId) {
    const { error: upErr } = await supabase
      .from("universities")
      .update(payload)
      .eq("id", existingId)
    if (upErr) throw upErr
    return { universityId: existingId, isNew: false }
  }

  const { data: inserted, error: insErr } = await supabase
    .from("universities")
    .insert(payload)
    .select("id")
    .single()
  if (insErr) throw insErr

  const universityId = inserted!.id
  cache.setUniversityId(nameKey, universityId, afterSnapshot)
  return { universityId, isNew: true }
}

async function linkProgramsForRow(
  cache: UniversityImportCache,
  row: Record<string, string>,
  universityId: string,
): Promise<void> {
  for (let g = 1; g <= 4; g++) {
    const majorName = cell(row, `prog${g}_name`)
    const itemsRaw = cell(row, `prog${g}_items`)
    if (!majorName) continue

    const majorId = await cache.getOrCreateMajor(majorName)
    const uniMajorId = await cache.getOrCreateUniversityMajor(universityId, majorId)

    for (const programName of splitPrograms(itemsRaw)) {
      const programId = await cache.getOrCreateProgram(majorId, programName)
      await cache.getOrCreateUniversityMajorProgram(uniMajorId, programId)
    }
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
    created: 0,
    updated: 0,
    unchangedCount: 0,
    added: [],
    updatedRows: [],
    errors: [],
  }
  const seenNames = new Set<string>()
  const totalUpdatedCount = { value: 0 }
  const pendingUpdates = new Map<
    string,
    { rowNumber: number; name: string; changes: ImportRowUpdate["changes"] }
  >()

  console.log(`${IMPORT_LOG} start`, { recordCount: records.length, defaultYear })

  const cache = await createImportCache(supabase)

  const parsedRows: ParsedImportRow[] = []
  for (let i = 0; i < records.length; i++) {
    const parsed = parseImportRow(records[i]!, i + 2, seenNames, summary)
    if (parsed) parsedRows.push(parsed)
  }

  const reportProgress = (phase: "universities" | "programs", index: number) => {
    options?.onProgress?.(buildImportProgress(phase, index, parsedRows.length))
  }

  if (parsedRows.length > 0) {
    reportProgress("universities", 0)
  }

  console.log(`${IMPORT_LOG} phase 1: universities start`, {
    rows: parsedRows.length,
    elapsedMs: Date.now() - startedAt,
  })

  const rowMeta = new Map<
    string,
    { universityId: string; isNew: boolean; row: Record<string, string>; rowNumber: number; displayName: string }
  >()

  for (let i = 0; i < parsedRows.length; i++) {
    const parsed = parsedRows[i]!
    const rowStartedAt = Date.now()

    try {
      const beforeSnapshot = cache.getSnapshot(parsed.nameKey)
      const { universityId, isNew } = await upsertUniversityRow(
        supabase,
        cache,
        parsed,
        defaultYear,
      )

      rowMeta.set(parsed.nameKey, {
        universityId,
        isNew,
        row: parsed.row,
        rowNumber: parsed.rowNumber,
        displayName: parsed.displayName,
      })
      summary.universitiesUpserted++

      if (isNew) {
        summary.created++
        summary.added.push({ rowNumber: parsed.rowNumber, name: parsed.displayName })
      } else if (beforeSnapshot) {
        const afterMain = canonicalUniversitySnapshot(parsed.row, defaultYear)
        const mainChanges = diffImportRecords(
          beforeSnapshot,
          afterMain,
          UNIVERSITY_DIFF_FIELDS.filter((f) => f !== "programs"),
        )
        if (mainChanges.length > 0) {
          pendingUpdates.set(parsed.nameKey, {
            rowNumber: parsed.rowNumber,
            name: parsed.displayName,
            changes: mainChanges,
          })
        }
      }

      if (i < 3 || i % 25 === 0 || i === parsedRows.length - 1) {
        console.log(`${IMPORT_LOG} phase 1 row done`, {
          rowIndex: i + 1,
          total: parsedRows.length,
          name: parsed.displayName,
          rowMs: Date.now() - rowStartedAt,
          elapsedMs: Date.now() - startedAt,
        })
      }
    } catch (e) {
      summary.errors.push({
        rowNumber: parsed.rowNumber,
        message: e instanceof Error ? e.message : String(e),
      })
    }

    reportProgress("universities", i + 1)
  }

  console.log(`${IMPORT_LOG} phase 1: universities done`, {
    upserted: summary.universitiesUpserted,
    errors: summary.errors.length,
    elapsedMs: Date.now() - startedAt,
  })

  console.log(`${IMPORT_LOG} phase 2: programs start`, {
    rows: parsedRows.length,
    elapsedMs: Date.now() - startedAt,
  })

  if (parsedRows.length > 0) {
    reportProgress("programs", 0)
  }

  for (let i = 0; i < parsedRows.length; i++) {
    const parsed = parsedRows[i]!
    const meta = rowMeta.get(parsed.nameKey)
    const rowStartedAt = Date.now()

    if (!meta) {
      summary.processed++
      reportProgress("programs", i + 1)
      continue
    }

    try {
      const afterPrograms = canonicalUniversitySnapshot(meta.row, defaultYear).programs ?? ""
      const beforePrograms = cache.getSnapshot(parsed.nameKey)?.programs ?? ""
      const programsChanged = beforePrograms !== afterPrograms

      if (meta.isNew) {
        await linkProgramsForRow(cache, meta.row, meta.universityId)
        summary.processed++
      } else {
        if (programsChanged) {
          await cache.replaceProgramsForUniversity(meta.universityId)
          await linkProgramsForRow(cache, meta.row, meta.universityId)
        }

        const programChanges = programsChanged
          ? [{ field: "programs", before: beforePrograms, after: afterPrograms }]
          : []
        const pending = pendingUpdates.get(parsed.nameKey)
        const allChanges = pending
          ? mergeFieldChanges(pending.changes, programChanges)
          : programChanges

        if (allChanges.length > 0) {
          summary.updated++
          pushUpdatedRow(
            summary.updatedRows,
            {
              rowNumber: meta.rowNumber,
              name: meta.displayName,
              changes: allChanges,
            },
            totalUpdatedCount,
          )
        } else {
          summary.unchangedCount++
        }
        cache.setUniversityId(
          parsed.nameKey,
          meta.universityId,
          canonicalUniversitySnapshot(meta.row, defaultYear),
        )
        summary.processed++
      }

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
      })
    }

    reportProgress("programs", i + 1)
  }

  if (parsedRows.length > 0) {
    reportProgress("programs", parsedRows.length)
  }

  if (totalUpdatedCount.value > summary.updatedRows.length) {
    console.log(`${IMPORT_LOG} updated list truncated`, {
      total: totalUpdatedCount.value,
      returned: summary.updatedRows.length,
    })
  }

  console.log(`${IMPORT_LOG} complete`, {
    elapsedMs: Date.now() - startedAt,
    processed: summary.processed,
    universitiesUpserted: summary.universitiesUpserted,
    created: summary.created,
    updated: summary.updated,
    unchangedCount: summary.unchangedCount,
    errorCount: summary.errors.length,
  })

  return summary
}
