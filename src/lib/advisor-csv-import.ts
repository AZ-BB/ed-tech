import { parseExcelFirstSheetToRecords } from "@/lib/admin-excel-parse";

import type { Json } from "@/database.types";
import { parseMultilineStringList, personDuplicateKey } from "@/lib/admin-csv-utils";
import { csvToRecords } from "@/lib/university-csv-import";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type SupabaseSecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type CsvImportSummary = {
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
};

async function loadExistingAdvisorKeys(supabase: SupabaseSecretClient) {
  const existingKeys = new Set<string>();
  const existingByEmail = new Map<string, string>();

  const { data, error } = await supabase
    .from("advisors")
    .select("email, first_name, last_name");

  if (error) throw error;

  for (const row of data ?? []) {
    const key = personDuplicateKey(row.email, row.first_name, row.last_name);
    existingKeys.add(key);
    existingByEmail.set(row.email.trim().toLowerCase(), key);
  }

  return { existingKeys, existingByEmail };
}

function assertEmailAvailable(
  email: string,
  personKey: string,
  existingByEmail: Map<string, string>,
) {
  const emailKey = email.trim().toLowerCase();
  const existingPersonKey = existingByEmail.get(emailKey);
  if (existingPersonKey && existingPersonKey !== personKey) {
    throw new Error("Email already belongs to a different advisor.");
  }
}

function cell(row: Record<string, string>, key: string): string {
  return row[key]?.trim() ?? "";
}

function parseCommaList(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseOptionalInt(raw: string): number | null {
  if (!raw.trim()) return null;
  const value = Number.parseInt(raw.replace(/,/g, ""), 10);
  return Number.isFinite(value) ? value : null;
}

function parseBool(raw: string, fallback = false): boolean {
  const value = raw.trim().toLowerCase();
  if (!value) return fallback;
  if (value === "true" || value === "1" || value === "yes") return true;
  if (value === "false" || value === "0" || value === "no") return false;
  return fallback;
}

function toJsonArray(values: string[]): Json | null {
  return values.length > 0 ? values : null;
}

async function getOrCreateAdvisorTag(
  supabase: SupabaseSecretClient,
  text: string,
): Promise<number> {
  const { data: existing } = await supabase
    .from("advisor_tags")
    .select("id")
    .eq("text", text)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: inserted, error } = await supabase
    .from("advisor_tags")
    .insert({ text })
    .select("id")
    .single();

  if (error) throw error;
  return inserted!.id;
}

export async function replaceAdvisorTags(
  supabase: SupabaseSecretClient,
  advisorId: string,
  tags: string[],
) {
  await supabase.from("advisor_tags_joint").delete().eq("advisor_id", advisorId);

  for (const tag of tags) {
    const tagId = await getOrCreateAdvisorTag(supabase, tag);
    const { error } = await supabase
      .from("advisor_tags_joint")
      .insert({ advisor_id: advisorId, tag_id: tagId });
    if (error) throw error;
  }
}

export async function replaceAdvisorSpecializations(
  supabase: SupabaseSecretClient,
  advisorId: string,
  countryCodes: string[],
) {
  await supabase
    .from("advisor_specializations_countries")
    .delete()
    .eq("advisor_id", advisorId);

  for (const countryCode of countryCodes) {
    const { error } = await supabase.from("advisor_specializations_countries").insert({
      advisor_id: advisorId,
      country_code: countryCode.toUpperCase(),
    });
    if (error) throw error;
  }
}

export async function importAdvisorsFromRecords(
  records: Record<string, string>[],
): Promise<CsvImportSummary> {
  const supabase = await createSupabaseSecretClient();
  const { existingKeys, existingByEmail } = await loadExistingAdvisorKeys(supabase);
  const summary: CsvImportSummary = {
    created: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  if (records.length === 0) {
    summary.errors.push("No data rows found in spreadsheet.");
    return summary;
  }

  for (let index = 0; index < records.length; index++) {
    const row = records[index]!;
    const rowNumber = index + 2;

    try {
      const email = cell(row, "email");
      const firstName = cell(row, "first_name");
      const lastName = cell(row, "last_name");
      const nationalityCountryCode = cell(row, "nationality_country_code").toUpperCase();

      if (!email || !firstName || !lastName || !nationalityCountryCode) {
        throw new Error("Missing required fields.");
      }

      const personKey = personDuplicateKey(email, firstName, lastName);
      if (existingKeys.has(personKey)) {
        summary.skipped += 1;
        continue;
      }

      assertEmailAvailable(email, personKey, existingByEmail);

      const payload = {
        email,
        first_name: firstName,
        last_name: lastName,
        nationality_country_code: nationalityCountryCode,
        phone: cell(row, "phone") || null,
        title: cell(row, "title") || null,
        experience_years: parseOptionalInt(cell(row, "experience_years")),
        languages: cell(row, "languages") || null,
        avatar_url: cell(row, "avatar_url") || null,
        description: cell(row, "description") || null,
        best_for: cell(row, "best_for") || null,
        session_for: cell(row, "session_for") || null,
        session_coverage: toJsonArray(parseMultilineStringList(cell(row, "session_coverage"))),
        about: cell(row, "about") || null,
        questions: toJsonArray(parseMultilineStringList(cell(row, "questions"))),
        is_active: parseBool(cell(row, "is_active"), true),
      };

      const { data: inserted, error } = await supabase
        .from("advisors")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;

      const advisorId = inserted!.id;
      existingKeys.add(personKey);
      existingByEmail.set(email.trim().toLowerCase(), personKey);
      summary.created += 1;

      await replaceAdvisorTags(supabase, advisorId, parseCommaList(cell(row, "tags")));
      await replaceAdvisorSpecializations(
        supabase,
        advisorId,
        parseCommaList(cell(row, "specialization_country_codes")),
      );
    } catch (error) {
      summary.failed += 1;
      summary.errors.push(
        `Row ${rowNumber}: ${error instanceof Error ? error.message : "Import failed."}`,
      );
    }
  }

  return summary;
}

export async function importAdvisorsFromCsvText(text: string): Promise<CsvImportSummary> {
  return importAdvisorsFromRecords(csvToRecords(text));
}

export async function importAdvisorsFromExcelBuffer(
  buffer: ArrayBuffer,
): Promise<CsvImportSummary> {
  return importAdvisorsFromRecords(await parseExcelFirstSheetToRecords(buffer));
}
