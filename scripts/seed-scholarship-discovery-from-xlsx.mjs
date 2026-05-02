/**
 * Seeds `scholarships` (discovery JSON in `discovery_payload`) from `scholarship_database.xlsx`.
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY — required
 *   SCHOLARSHIP_XLSX_PATH — optional, defaults to repo sibling old-code path
 *   SEED_ROW_LIMIT — optional, default 5 (first N data rows after the marker row)
 *
 * Usage: npm run db:seed:scholarships:xlsx
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import { discoveryScholarshipToDbRow } from "./lib/scholarship-discovery-upsert.mjs";

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

const limit = Math.max(
  1,
  Math.min(500, Number.parseInt(process.env.SEED_ROW_LIMIT ?? "5", 10) || 5),
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

function flagFromCountryCode(code) {
  const c = String(code ?? "")
    .trim()
    .toUpperCase();
  if (c.length !== 2 || !/^[A-Z]{2}$/.test(c)) return "🌐";
  const A = 0x1f1e6;
  return (
    String.fromCodePoint(A + (c.charCodeAt(0) - 65)) +
    String.fromCodePoint(A + (c.charCodeAt(1) - 65))
  );
}

function typeToBadgeClass(type) {
  const t = String(type ?? "")
    .trim()
    .toLowerCase();
  if (t === "government") return "badge-gov";
  if (t === "university") return "badge-uni";
  if (t === "foundation") return "badge-foundation";
  if (t === "corporate") return "badge-ext";
  return "badge-gov";
}

function parseBool(v) {
  const s = String(v ?? "").trim().toUpperCase();
  return s === "TRUE" || s === "1" || s === "YES";
}

function splitList(v) {
  return String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeLinkStatus(v) {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (s === "verified" || s === "missing" || s === "uncertain") return s;
  return "missing";
}

function rowObject(headers, row) {
  const o = {};
  headers.forEach((h, i) => {
    const key = String(h ?? "").trim();
    if (key) o[key] = row[i] ?? "";
  });
  return o;
}

function excelRowToScholarship(r) {
  const id = String(r.id ?? "")
    .trim()
    .toLowerCase();
  if (!id) throw new Error("Row missing id");

  const nat = splitList(r.eligible_nationalities).map((x) => x.toLowerCase());
  const destinations = splitList(r.destinations);
  const requiredDocs = splitList(r.required_docs);

  const coverage = String(r.coverage ?? "")
    .trim()
    .toLowerCase();
  const cov =
    coverage === "partial" || coverage === "full" ? coverage : "full";

  return {
    id,
    name: String(r.name ?? "").trim(),
    provider: String(r.provider ?? "").trim(),
    country: String(r.country ?? "").trim(),
    flag: flagFromCountryCode(r.country_code),
    type: String(r.type ?? "Government").trim(),
    badgeClass: typeToBadgeClass(r.type),
    eligibleNationalities: nat.length ? nat : ["other"],
    destinations: destinations.length ? destinations : ["Global"],
    coverage: cov,
    coverageLabel: String(r.coverage_label ?? "").trim() || "Full ride",
    deadline: String(r.deadline ?? "").trim(),
    eligSummary: String(r.eligibility_summary ?? "").trim(),
    shortSummary: String(r.short_summary ?? "").trim(),
    degreeLevels: String(r.degree_levels ?? "").trim(),
    fieldsOfStudy: String(r.fields_of_study ?? "").trim(),
    academicElig: String(r.academic_eligibility ?? "").trim(),
    englishReq: String(r.english_requirement ?? "").trim(),
    otherElig: String(r.other_eligibility ?? "").trim(),
    requiredDocs,
    applicationMethod: String(r.application_method ?? "").trim(),
    coverageDetails: {
      tuition: String(r.cov_tuition ?? "").trim() || "—",
      stipend: String(r.cov_stipend ?? "").trim() || "—",
      travel: String(r.cov_travel ?? "").trim() || "—",
      other: String(r.cov_other ?? "").trim() || "—",
    },
    importantNotes: String(r.important_notes ?? "").trim(),
    competition: String(r.competition ?? "Medium").trim(),
    renewable: String(r.renewable ?? "").trim() || "—",
    applicationUrl: String(r.application_url ?? "").trim(),
    applicationWebsiteName: String(r.application_website_name ?? "").trim(),
    applicationWebsiteDomain: String(r.application_website_domain ?? "").trim(),
    isOfficialSource: parseBool(r.is_official_source),
    linkStatus: normalizeLinkStatus(r.link_status),
    linkNotes: String(r.link_notes ?? "").trim(),
    fallbackUrl: String(r.fallback_url ?? "").trim(),
  };
}

const wb = XLSX.readFile(xlsxPath);
const ws = wb.Sheets.Scholarships;
if (!ws) {
  console.error('Workbook missing "Scholarships" sheet.');
  process.exit(1);
}

const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
const headers = aoa[1].map((h) => String(h ?? "").trim());
const markerIdx = aoa.findIndex(
  (row) => String(row[0] ?? "").includes("DATA STARTS HERE"),
);
const firstDataRow = markerIdx >= 0 ? markerIdx + 1 : 7;

const payloads = [];
for (let i = firstDataRow; i < aoa.length && payloads.length < limit; i++) {
  const row = aoa[i];
  if (!row || !String(row[0] ?? "").trim()) continue;
  const r = rowObject(headers, row);
  if (String(r.id ?? "").startsWith("Required")) continue;
  if (String(r.id ?? "").startsWith("Unique ")) continue;
  try {
    payloads.push({ payload: excelRowToScholarship(r), raw: r });
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
  "Upserting",
  payloads.length,
  "rows:",
  payloads.map((p) => p.payload.id).join(", "),
);

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const batch = payloads.map(({ payload, raw }) =>
  discoveryScholarshipToDbRow(payload, raw),
);
const { error } = await supabase
  .from("scholarships")
  .upsert(batch, { onConflict: "discovery_slug" });

if (error) {
  console.error(error);
  process.exit(1);
}

console.log("Done.");
