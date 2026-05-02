/**
 * Seeds `scholarships` from `scholarship_database.xlsx` (flat columns via discovery upsert).
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY — required
 *   SCHOLARSHIP_XLSX_PATH — optional
 *   SEED_ROW_LIMIT — max data rows (default 5). Use `0` or `all` for entire sheet.
 *
 * CLI:
 *   node scripts/seed-scholarship-discovery-from-xlsx.mjs --all   (import every row)
 *
 * Usage:
 *   npm run db:seed:scholarships:xlsx
 *   npm run db:seed:scholarships:xlsx:all
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import { discoveryScholarshipToDbRow } from "./lib/scholarship-discovery-upsert.mjs";
import { flatSnakeRowToPayload } from "./lib/scholarship-flat-import.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const defaultXlsx = path.join(
  root,
  "..",
  "old-code",
  "scholarship_database.xlsx",
);
const xlsxPath =
  process.env.SCHOLARSHIP_XLSX_PATH ||
  (fs.existsSync(defaultXlsx)
    ? defaultXlsx
    : path.join(
        "c:",
        "Users",
        "pc",
        "Desktop",
        "work",
        "Clients",
        "ghassan",
        "old-code",
        "scholarship_database.xlsx",
      ));

const envLimit = process.env.SEED_ROW_LIMIT;
const importAll =
  process.argv.includes("--all") ||
  envLimit === "0" ||
  String(envLimit ?? "").toLowerCase() === "all";

const limit = importAll
  ? Number.POSITIVE_INFINITY
  : Math.max(
      1,
      Math.min(
        500_000,
        Number.parseInt(envLimit ?? "5", 10) || 5,
      ),
    );

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  process.exit(1);
}

if (!fs.existsSync(xlsxPath)) {
  console.error("Excel not found:", xlsxPath);
  process.exit(1);
}

function rowObject(headers, row) {
  const o = {};
  headers.forEach((h, i) => {
    const key = String(h ?? "").trim();
    if (key) o[key] = row[i] ?? "";
  });
  return o;
}

const wb = XLSX.readFile(xlsxPath);
const ws = wb.Sheets.Scholarships;
if (!ws) {
  console.error('Workbook missing "Scholarships" sheet.');
  process.exit(1);
}

const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
const headers = aoa[1].map((h) => String(h ?? "").trim());
const markerIdx = aoa.findIndex((row) =>
  String(row[0] ?? "").includes("DATA STARTS HERE"),
);
const firstDataRow = markerIdx >= 0 ? markerIdx + 1 : 7;

const payloads = [];
for (
  let i = firstDataRow;
  i < aoa.length && payloads.length < limit;
  i++
) {
  const row = aoa[i];
  if (!row || !String(row[0] ?? "").trim()) continue;
  const r = rowObject(headers, row);
  if (String(r.id ?? "").startsWith("Required")) continue;
  if (String(r.id ?? "").startsWith("Unique ")) continue;
  try {
    payloads.push({ payload: flatSnakeRowToPayload(r), raw: r });
  } catch (e) {
    console.warn("Skip row", i, e.message);
  }
}

if (!payloads.length) {
  console.error("No data rows parsed. Check sheet layout / marker row.");
  process.exit(1);
}

console.log("Excel:", xlsxPath);
console.log(
  importAll ? `Importing all rows (${payloads.length}).` : `Row limit: ${limit}.`,
);
console.log(
  "Upserting",
  payloads.length,
  "rows:",
  payloads.map((p) => p.payload.id).join(", "),
);

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
