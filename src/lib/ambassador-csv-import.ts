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

async function loadExistingAmbassadorKeys(supabase: SupabaseSecretClient) {
  const existingKeys = new Set<string>();
  const existingByEmail = new Map<string, string>();

  const { data, error } = await supabase
    .from("ambassadors")
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
    throw new Error("Email already belongs to a different ambassador.");
  }
}

function cell(row: Record<string, string>, key: string): string {
  return row[key]?.trim() ?? "";
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

async function getOrCreateAmbassadorTag(
  supabase: SupabaseSecretClient,
  text: string,
): Promise<number> {
  const { data: existing } = await supabase
    .from("ambassador_tags")
    .select("id")
    .eq("text", text)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: inserted, error } = await supabase
    .from("ambassador_tags")
    .insert({ text })
    .select("id")
    .single();

  if (error) throw error;
  return inserted!.id;
}

export async function replaceAmbassadorTags(
  supabase: SupabaseSecretClient,
  ambassadorId: string,
  tags: string[],
) {
  await supabase.from("ambassador_tags_joint").delete().eq("ambassador_id", ambassadorId);

  for (const tag of tags) {
    const tagId = await getOrCreateAmbassadorTag(supabase, tag);
    const { error } = await supabase
      .from("ambassador_tags_joint")
      .insert({ ambassador_id: ambassadorId, tag_id: tagId });
    if (error) throw error;
  }
}

export async function importAmbassadorsFromRecords(
  records: Record<string, string>[],
): Promise<CsvImportSummary> {
  const supabase = await createSupabaseSecretClient();
  const { existingKeys, existingByEmail } = await loadExistingAmbassadorKeys(supabase);
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
      const destinationCountryCode = cell(row, "destination_country_code").toUpperCase();
      const nationalityCountryCode = cell(row, "nationality_country_code").toUpperCase();

      if (!email || !firstName || !lastName || !destinationCountryCode || !nationalityCountryCode) {
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
        destination_country_code: destinationCountryCode,
        nationality_country_code: nationalityCountryCode,
        university_id: cell(row, "university_id") || null,
        university_name: cell(row, "university_name") || null,
        avatar_url: cell(row, "avatar_url") || null,
        start_year: parseOptionalInt(cell(row, "start_year")),
        graduation_year: parseOptionalInt(cell(row, "graduation_year")),
        is_current_student: parseBool(cell(row, "is_current_student")),
        major: cell(row, "major") || null,
        has_msc: parseBool(cell(row, "has_msc")),
        has_phd: parseBool(cell(row, "has_phd")),
        about: cell(row, "about") || null,
        help_in: toJsonArray(parseMultilineStringList(cell(row, "help_in"))),
        is_active: parseBool(cell(row, "is_active"), true),
      };

      const { data: inserted, error } = await supabase
        .from("ambassadors")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;

      const ambassadorId = inserted!.id;
      existingKeys.add(personKey);
      existingByEmail.set(email.trim().toLowerCase(), personKey);
      summary.created += 1;

      await replaceAmbassadorTags(
        supabase,
        ambassadorId,
        parseMultilineStringList(cell(row, "tags"), { allowCommaFallback: true }),
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

export async function importAmbassadorsFromCsvText(
  text: string,
): Promise<CsvImportSummary> {
  return importAmbassadorsFromRecords(csvToRecords(text));
}

export async function importAmbassadorsFromExcelBuffer(
  buffer: ArrayBuffer,
): Promise<CsvImportSummary> {
  return importAmbassadorsFromRecords(await parseExcelFirstSheetToRecords(buffer));
}
