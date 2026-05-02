/**
 * Seeds `scholarships` from the standard CSV (same columns as export / XLSX).
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY — required
 *   SCHOLARSHIP_CSV_PATH — optional, default `data/scholarships-standard-dataset.csv`
 *
 * Usage:
 *   npm run db:seed:scholarships:csv
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { discoveryScholarshipToDbRow } from "./lib/scholarship-discovery-upsert.mjs";
import { flatSnakeRowToPayload } from "./lib/scholarship-flat-import.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const csvPath =
  process.env.SCHOLARSHIP_CSV_PATH ||
  path.join(root, "data", "scholarships-standard-dataset.csv");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error("CSV not found:", csvPath);
  console.error("Run: npm run scholarships:export-csv");
  process.exit(1);
}

/** RFC-style CSV parse: commas, quoted fields, "" for literal quote */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;

  const pushRow = () => {
    row.push(field);
    if (row.some((c) => String(c).trim() !== "")) rows.push(row);
    row = [];
    field = "";
  };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      pushRow();
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (inQuotes) {
    throw new Error("Unclosed quote in CSV");
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((c) => String(c).trim() !== "")) rows.push(row);
  }
  return rows;
}

function rowFromHeaders(headers, cells) {
  const o = {};
  headers.forEach((h, j) => {
    const key = String(h ?? "").trim();
    if (key) o[key] = cells[j] ?? "";
  });
  return o;
}

const text = fs.readFileSync(csvPath, "utf8");
const grid = parseCsv(text);
if (grid.length < 2) {
  console.error("CSV must have a header row and at least one data row.");
  process.exit(1);
}

const headers = grid[0].map((h) => String(h ?? "").trim());
const payloads = [];
for (let r = 1; r < grid.length; r++) {
  const cells = grid[r];
  const raw = rowFromHeaders(headers, cells);
  if (!String(raw.id ?? "").trim()) continue;
  try {
    payloads.push({ payload: flatSnakeRowToPayload(raw), raw });
  } catch (e) {
    console.warn("Skip CSV row", r + 1, e.message);
  }
}

if (!payloads.length) {
  console.error("No valid data rows in CSV.");
  process.exit(1);
}

console.log("CSV:", csvPath);
console.log("Upserting", payloads.length, "rows");

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const chunkSize = 25;
for (let i = 0; i < payloads.length; i += chunkSize) {
  const slice = payloads.slice(i, i + chunkSize);
  const batch = slice.map(({ payload, raw }) =>
    discoveryScholarshipToDbRow(payload, raw),
  );
  const { error } = await supabase
    .from("scholarships")
    .upsert(batch, { onConflict: "discovery_slug" });
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(`Upserted ${Math.min(i + chunkSize, payloads.length)} / ${payloads.length}`);
}

console.log("Done.");
