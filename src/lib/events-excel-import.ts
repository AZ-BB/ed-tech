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
import { csvToRecords } from "@/lib/university-csv-import";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export { csvToRecords };

const IMPORT_LOG = "[events-excel-import]";
const UPSERT_BATCH_SIZE = 10;

type UniversityEventInsert =
  Database["public"]["Tables"]["university_events"]["Insert"];

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

function parseOptionalInt(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number.parseInt(s.replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalDate(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  const parsed = Date.parse(t);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString().split("T")[0] ?? null;
}

function nullableText(s: string): string | null {
  const t = s.trim();
  return t || null;
}

export type EventImportSummary = {
  processed: number;
  eventsUpserted: number;
  created: number;
  updated: number;
  unchangedCount: number;
  added: ImportRowAddition[];
  updatedRows: ImportRowUpdate[];
  errors: { rowNumber: number; message: string }[];
};

function rowToEventPayload(
  row: Record<string, string>,
): UniversityEventInsert | null {
  const eventId = cell(row, "event_id");
  const eventName = displayImportName(cell(row, "event_name"));
  if (!eventId) return null;
  if (!eventName) return null;

  return {
    event_id: eventId,
    event_name: eventName,
    event_type: cell(row, "event_type") || "",
    featured: parseBool(cell(row, "featured"), false),
    recommended_tag: nullableText(cell(row, "recommended_tag")),
    date_start: parseOptionalDate(cell(row, "date_start")),
    date_end: parseOptionalDate(cell(row, "date_end")),
    month: nullableText(cell(row, "month")),
    year: parseOptionalInt(cell(row, "year")),
    start_time: nullableText(cell(row, "start_time")),
    end_time: nullableText(cell(row, "end_time")),
    timezone: nullableText(cell(row, "timezone")),
    mode: nullableText(cell(row, "mode")),
    country: nullableText(cell(row, "country")),
    city: nullableText(cell(row, "city")),
    venue: nullableText(cell(row, "venue")),
    region_focus: nullableText(cell(row, "region_focus")),
    short_description: nullableText(cell(row, "short_description")),
    full_overview: nullableText(cell(row, "full_overview")),
    topics_covered: nullableText(cell(row, "topics_covered")),
    target_audience: nullableText(cell(row, "target_audience")),
    why_attend: nullableText(cell(row, "why_attend")),
    universities_attending: nullableText(cell(row, "universities_attending")),
    university_count: parseOptionalInt(cell(row, "university_count")),
    organizer: nullableText(cell(row, "organizer")),
    organizer_type: nullableText(cell(row, "organizer_type")),
    cost: nullableText(cell(row, "cost")),
    language: nullableText(cell(row, "language")),
    registration_status: nullableText(cell(row, "registration_status")),
    registration_required: nullableText(cell(row, "registration_required")),
    registration_url: nullableText(cell(row, "registration_url")),
    source_name: nullableText(cell(row, "source_name")),
    source_url: nullableText(cell(row, "source_url")),
    date_verified: parseOptionalDate(cell(row, "date_verified")),
    record_status: cell(row, "record_status") || "Active",
    internal_notes: nullableText(cell(row, "internal_notes")),
    prep_steps: nullableText(cell(row, "prep_steps")),
  };
}

function payloadsEqual(
  a: UniversityEventInsert,
  b: UniversityEventInsert,
): boolean {
  const keys = Object.keys(a) as (keyof UniversityEventInsert)[];
  return keys.every((key) => {
    const av = a[key];
    const bv = b[key];
    if (av === bv) return true;
    if (av == null && bv == null) return true;
    return String(av ?? "") === String(bv ?? "");
  });
}

export async function importEventsFromCsvRecords(
  supabase: SupabaseSecretClient,
  records: Record<string, string>[],
  options?: { onProgress?: (progress: ImportProgressPayload) => void },
): Promise<EventImportSummary> {
  const summary: EventImportSummary = {
    processed: 0,
    eventsUpserted: 0,
    created: 0,
    updated: 0,
    unchangedCount: 0,
    added: [],
    updatedRows: [],
    errors: [],
  };

  const eventIds = records
    .map((row) => cell(row, "event_id"))
    .filter(Boolean);

  const existingByEventId = new Map<string, UniversityEventInsert & { id: string }>();

  if (eventIds.length > 0) {
    const { data, error } = await supabase
      .from("university_events")
      .select("*")
      .in("event_id", eventIds);

    if (error) throw error;

    for (const row of data ?? []) {
      existingByEventId.set(row.event_id, row as UniversityEventInsert & { id: string });
    }
  }

  const total = records.length;

  for (let i = 0; i < records.length; i++) {
    const rowNumber = i + 2;
    const row = records[i]!;

    try {
      const payload = rowToEventPayload(row);
      if (!payload) {
        summary.errors.push({
          rowNumber,
          message: "Missing required event_id or event_name.",
        });
        continue;
      }

      summary.processed++;

      const existing = existingByEventId.get(payload.event_id);

      if (existing) {
        if (payloadsEqual(payload, existing)) {
          summary.unchangedCount++;
        } else {
          const { error } = await supabase
            .from("university_events")
            .update(payload)
            .eq("id", existing.id);

          if (error) throw error;

          summary.eventsUpserted++;
          summary.updated++;
          summary.updatedRows.push({
            rowNumber,
            name: payload.event_name,
            changes: [],
          });
          existingByEventId.set(payload.event_id, { ...existing, ...payload });
        }
      } else {
        const { data: inserted, error } = await supabase
          .from("university_events")
          .insert(payload)
          .select("*")
          .single();

        if (error) throw error;

        summary.eventsUpserted++;
        summary.created++;
        summary.added.push({
          rowNumber,
          name: payload.event_name,
        });
        existingByEventId.set(
          payload.event_id,
          inserted as UniversityEventInsert & { id: string },
        );
      }
    } catch (err) {
      summary.errors.push({
        rowNumber,
        message: formatImportError(err),
      });
    }

    options?.onProgress?.(
      buildImportProgress("events", i + 1, total),
    );
  }

  console.log(`${IMPORT_LOG} complete`, {
    processed: summary.processed,
    eventsUpserted: summary.eventsUpserted,
    errors: summary.errors.length,
  });

  return summary;
}
