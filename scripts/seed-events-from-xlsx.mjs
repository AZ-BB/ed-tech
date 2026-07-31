import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

dotenv.config();

const DEFAULT_XLSX = path.resolve(
  "e:/#Dwonloads00/ghassan-phase-2/Univeera_Events_Source_of_Truth_EXPANDED.xlsx",
);

function cell(row, key) {
  const value = row[key];
  if (value == null) return "";
  return String(value).trim();
}

function parseBool(value, defaultValue = false) {
  const t = String(value ?? "").trim().toLowerCase();
  if (!t) return defaultValue;
  if (["true", "1", "yes", "y"].includes(t)) return true;
  if (["false", "0", "no", "n"].includes(t)) return false;
  return defaultValue;
}

function parseOptionalInt(value) {
  const t = String(value ?? "").trim();
  if (!t) return null;
  const n = Number.parseInt(t.replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalDate(value) {
  const t = String(value ?? "").trim();
  if (!t) return null;
  const parsed = Date.parse(t);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
}

function nullableText(value) {
  const t = String(value ?? "").trim();
  return t || null;
}

function rowToPayload(row) {
  const eventId = cell(row, "event_id");
  const eventName = cell(row, "event_name");
  if (!eventId || !eventName) return null;

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

async function main() {
  const xlsxPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_XLSX;
  if (!fs.existsSync(xlsxPath)) {
    console.error(`Excel file not found: ${xlsxPath}`);
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const workbook = XLSX.readFile(xlsxPath);
  const sheet = workbook.Sheets.Events;
  if (!sheet) {
    console.error('Sheet "Events" not found in workbook');
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  let upserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const payload = rowToPayload(row);
    if (!payload) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from("university_events")
      .upsert(payload, { onConflict: "event_id" });

    if (error) {
      console.error(`Failed ${payload.event_id}:`, error.message);
      process.exit(1);
    }
    upserted++;
  }

  console.log(`Seeded ${upserted} events (${skipped} skipped). Source: ${xlsxPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
