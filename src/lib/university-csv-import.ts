import type { Json } from "@/database.types"
import { createSupabaseSecretClient } from "@/utils/supabase-server"

type SupabaseSecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>

type Delimiter = "," | "\t"

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

async function ensureCountry(supabase: SupabaseSecretClient, code: string, name: string) {
  const cc = code.trim().toUpperCase().slice(0, 2)
  if (cc.length !== 2) throw new Error(`Invalid country_code: ${code}`)

  const { data: existing } = await supabase.from("countries").select("id").eq("id", cc).maybeSingle()

  if (existing) return

  const countryName = name.trim() || cc
  const { error } = await supabase.from("countries").insert({ id: cc, name: countryName })
  if (error) throw error
}

async function getOrCreateMajor(supabase: SupabaseSecretClient, name: string): Promise<number> {
  const { data: found } = await supabase.from("majors").select("id").eq("name", name).maybeSingle()
  if (found) return found.id

  const { data: inserted, error } = await supabase.from("majors").insert({ name }).select("id").single()
  if (error) throw error
  return inserted!.id
}

async function getOrCreateProgram(supabase: SupabaseSecretClient, majorId: number, programName: string): Promise<number> {
  const { data: found } = await supabase
    .from("programs")
    .select("id")
    .eq("major_id", majorId)
    .eq("name", programName)
    .maybeSingle()

  if (found) return found.id

  const { data: inserted, error } = await supabase
    .from("programs")
    .insert({ major_id: majorId, name: programName })
    .select("id")
    .single()

  if (error) throw error
  return inserted!.id
}

async function getOrCreateUniversityMajor(supabase: SupabaseSecretClient, universityId: string, majorId: number): Promise<number> {
  const { data: found } = await supabase
    .from("university_majors")
    .select("id")
    .eq("university_id", universityId)
    .eq("major_id", majorId)
    .maybeSingle()

  if (found) return found.id

  const { data: inserted, error } = await supabase
    .from("university_majors")
    .insert({ university_id: universityId, major_id: majorId })
    .select("id")
    .single()

  if (error) throw error
  return inserted!.id
}

async function getOrCreateUniversityMajorProgram(
  supabase: SupabaseSecretClient,
  universityMajorId: number,
  programId: number,
): Promise<void> {
  const { data: found } = await supabase
    .from("university_major_programs")
    .select("id")
    .eq("university_major_id", universityMajorId)
    .eq("program_id", programId)
    .maybeSingle()

  if (found) return

  const { error } = await supabase.from("university_major_programs").insert({
    university_major_id: universityMajorId,
    program_id: programId,
  })

  if (error) throw error
}

export type ImportSummary = {
  processed: number
  universitiesUpserted: number
  errors: { rowNumber: number; message: string }[]
}

function rowToUniversityPayload(row: Record<string, string>, defaultYear: number) {
  const name = cell(row, "name")
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
    sat_policy: cell(row, "sat_policy") || null,
    documents: buildDocuments(row),
    deadline_date: parseDeadline(cell(row, "deadline_primary"), defaultYear),
    method: cell(row, "application_method") || null,
    application_fee: parseOptionalFloat(cell(row, "application_fee")),
    intakes: cell(row, "intakes") || null,
    tuition_per_year: tuitionFromRow(row),
    estimated_living_cost_per_year: livingFromRow(row),
    is_scholarship_available: scholarshipNote.length > 0,
  }
}

export async function importUniversitiesFromCsvRecords(
  supabase: SupabaseSecretClient,
  records: Record<string, string>[],
  options?: { defaultYear?: number },
): Promise<ImportSummary> {
  const defaultYear = options?.defaultYear ?? new Date().getFullYear()
  const summary: ImportSummary = { processed: 0, universitiesUpserted: 0, errors: [] }

  for (let i = 0; i < records.length; i++) {
    const row = records[i]!
    const rowNumber = i + 2

    try {
      const name = cell(row, "name")
      if (!name) {
        summary.processed++
        continue
      }

      const countryName = cell(row, "country")
      const countryCode = cell(row, "country_code").toUpperCase().slice(0, 2)
      if (countryCode.length !== 2) {
        throw new Error("country_code must be a 2-letter code")
      }

      await ensureCountry(supabase, countryCode, countryName)

      const payload = rowToUniversityPayload(row, defaultYear)

      const { data: existing } = await supabase
        .from("universities")
        .select("id")
        .eq("name", name)
        .eq("country_code", countryCode)
        .maybeSingle()

      let universityId: string

      if (existing) {
        const { error: upErr } = await supabase.from("universities").update(payload).eq("id", existing.id)
        if (upErr) throw upErr
        universityId = existing.id
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("universities")
          .insert(payload)
          .select("id")
          .single()
        if (insErr) throw insErr
        universityId = inserted!.id
      }

      summary.universitiesUpserted++

      for (let g = 1; g <= 4; g++) {
        const majorName = cell(row, `prog${g}_name`)
        const itemsRaw = cell(row, `prog${g}_items`)
        if (!majorName) continue

        const majorId = await getOrCreateMajor(supabase, majorName)
        const uniMajorId = await getOrCreateUniversityMajor(supabase, universityId, majorId)

        for (const programName of splitPrograms(itemsRaw)) {
          const programId = await getOrCreateProgram(supabase, majorId, programName)
          await getOrCreateUniversityMajorProgram(supabase, uniMajorId, programId)
        }
      }

      summary.processed++
    } catch (e) {
      summary.processed++
      summary.errors.push({
        rowNumber,
        message: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return summary
}
