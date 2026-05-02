/**
 * Upserts scholarship discovery rows from static JSON into `scholarships`.
 * Canonical UI fields are stored in `discovery_payload` (JSONB); core columns
 * hold a denormalized subset for constraints and simple queries.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, and optionally DOTENV_CONFIG_PATH.
 *
 * Usage: node scripts/seed-scholarship-discovery.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { discoveryScholarshipToDbRow } from "./lib/scholarship-discovery-upsert.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });
const jsonPath = path.join(
  root,
  "src",
  "app",
  "(protected)",
  "student",
  "scholarships",
  "_data",
  "scholarships.json",
);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment.",
  );
  process.exit(1);
}

const raw = fs.readFileSync(jsonPath, "utf8");
const list = JSON.parse(raw);
if (!Array.isArray(list)) {
  console.error("scholarships.json must be a JSON array.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const batch = list.map((row) => discoveryScholarshipToDbRow(row, null));

const chunkSize = 25;
for (let i = 0; i < batch.length; i += chunkSize) {
  const slice = batch.slice(i, i + chunkSize);
  const { error } = await supabase
    .from("scholarships")
    .upsert(slice, { onConflict: "discovery_slug" });
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(`Upserted ${Math.min(i + chunkSize, batch.length)} / ${batch.length}`);
}

console.log("Done.");
