/**
 * Translate/revise Arabic content for scholarship modal fields only:
 * - SAT / ACT (sat_policy column)
 * - Coverage notes at the bottom of the modal (tooltip)
 *
 * Does not re-translate name, overview, eligibility, etc.
 *
 * Usage:
 *   npx tsx scripts/revise-scholarship-modal-fields.ts
 *   npx tsx scripts/revise-scholarship-modal-fields.ts --dry-run
 *   npx tsx scripts/revise-scholarship-modal-fields.ts --only-missing
 *   npx tsx scripts/revise-scholarship-modal-fields.ts --limit=20 --delay=1000
 *
 * Sends up to 10 scholarships per OpenAI API call (one batch = one request).
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, OPENAI_API_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Database } from "../src/database.types";
import {
  buildScholarshipModalFields,
  getScholarshipModalTranslationStatus,
  parseScholarshipContentAr,
  parseScholarshipContentArMeta,
  type ScholarshipModalSourceRow,
} from "../src/lib/scholarship-translatable-fields";
import {
  translateScholarshipModalBatch,
  type ScholarshipModalBatchEntry,
} from "../src/lib/translation/translate-scholarship-modal";

const BATCH_SIZE = 10;

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = readFileSync(join(process.cwd(), file), "utf8");
      for (const line of raw.split("\n")) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m && !process.env[m[1].trim()]) {
          process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
        }
      }
      return;
    } catch {
      /* try next */
    }
  }
}

loadEnv();

function parseArgs(argv: string[]) {
  let dryRun = false;
  let onlyMissing = false;
  let limit: number | null = null;
  let delayMs = 0;

  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--only-missing") onlyMissing = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: npx tsx scripts/revise-scholarship-modal-fields.ts [options]

Translates only modal fields (sat_policy, tooltip) into content_ar.

Options:
  --dry-run         List scholarships that would be processed; no OpenAI / DB writes
  --only-missing    Skip scholarships whose modal-field translations are up to date
  --limit=N         Process at most N scholarships
  --delay=MS        Wait MS milliseconds between batches of ${BATCH_SIZE}
`);
      process.exit(0);
    } else if (arg.startsWith("--limit=")) {
      const n = Number.parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    } else if (arg.startsWith("--delay=")) {
      const n = Number.parseInt(arg.slice("--delay=".length), 10);
      if (Number.isFinite(n) && n >= 0) delayMs = n;
    }
  }

  return { dryRun, onlyMissing, limit, delayMs };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ScholarshipModalFetchRow = {
  id: string;
  name: string;
  sat_policy: string | null;
  tooltip: string | null;
  discovery_payload: Database["public"]["Tables"]["scholarships"]["Row"]["discovery_payload"];
  content_ar: Database["public"]["Tables"]["scholarships"]["Row"]["content_ar"];
  content_ar_meta: Database["public"]["Tables"]["scholarships"]["Row"]["content_ar_meta"];
};

async function fetchAllScholarships(supabase: ReturnType<typeof createClient<Database>>) {
  const pageSize = 500;
  const rows: ScholarshipModalFetchRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("scholarships")
      .select("id, name, sat_policy, tooltip, discovery_payload, content_ar, content_ar_meta")
      .order("name", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch scholarships: ${error.message}`);
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows;
}

function hasModalSourceContent(row: ScholarshipModalSourceRow): boolean {
  return buildScholarshipModalFields(row).length > 0;
}

async function main() {
  const { dryRun, onlyMissing, limit, delayMs } = parseArgs(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
    process.exit(1);
  }

  if (!dryRun && !process.env.OPENAI_API_KEY?.trim()) {
    console.error("Missing OPENAI_API_KEY");
    process.exit(1);
  }

  const supabase = createClient<Database>(url, key);
  const all = await fetchAllScholarships(supabase);

  let targets = all.filter((scholarship) =>
    hasModalSourceContent({
      sat_policy: scholarship.sat_policy,
      tooltip: scholarship.tooltip,
      discovery_payload: scholarship.discovery_payload,
    }),
  );

  if (onlyMissing) {
    targets = targets.filter((scholarship) => {
      const modalRow: ScholarshipModalSourceRow = {
        sat_policy: scholarship.sat_policy,
        tooltip: scholarship.tooltip,
        discovery_payload: scholarship.discovery_payload,
      };
      const contentAr = parseScholarshipContentAr(scholarship.content_ar);
      const meta = parseScholarshipContentArMeta(scholarship.content_ar_meta);
      return getScholarshipModalTranslationStatus(modalRow, contentAr, meta) !== "up_to_date";
    });
  }

  if (limit != null) {
    targets = targets.slice(0, limit);
  }

  console.log(
    [
      `Scholarships in DB: ${all.length}`,
      `With SAT/ACT or modal notes: ${targets.length}`,
      `batchSize=${BATCH_SIZE} (one API call per batch)`,
      dryRun ? "mode=dry-run" : "mode=live",
      onlyMissing ? "filter=only-missing" : "filter=all",
      limit != null ? `limit=${limit}` : null,
      delayMs > 0 ? `delay=${delayMs}ms` : null,
    ]
      .filter(Boolean)
      .join(" | "),
  );

  if (targets.length === 0) {
    console.log("Nothing to revise.");
    return;
  }

  if (dryRun) {
    for (const scholarship of targets) {
      const modalRow: ScholarshipModalSourceRow = {
        sat_policy: scholarship.sat_policy,
        tooltip: scholarship.tooltip,
        discovery_payload: scholarship.discovery_payload,
      };
      const fields = buildScholarshipModalFields(modalRow);
      const fieldSummary = fields.map((f) => f.key).join(", ");
      console.log(`  - ${scholarship.name} (${scholarship.id}): ${fieldSummary}`);
    }
    return;
  }

  let okCount = 0;
  let failCount = 0;
  let doneCount = 0;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const entries: ScholarshipModalBatchEntry[] = batch.map((scholarship) => ({
      id: scholarship.id,
      name: scholarship.name,
      sat_policy: scholarship.sat_policy,
      tooltip: scholarship.tooltip,
      discovery_payload: scholarship.discovery_payload,
      content_ar: scholarship.content_ar,
      content_ar_meta: scholarship.content_ar_meta,
    }));

    const results = await translateScholarshipModalBatch(supabase, entries);

    for (const result of results) {
      doneCount += 1;
      if (result.ok) {
        okCount += 1;
        console.log(
          `  ✓ ${result.name}: ${result.translatedCount} modal field(s)`,
        );
        if (result.errors.length > 0) {
          console.warn(`    warnings: ${result.errors.join("; ")}`);
        }
      } else {
        failCount += 1;
        console.error(`  ✗ ${result.name}: ${result.error}`);
      }
    }

    console.log(`Progress: ${doneCount}/${targets.length}`);

    if (delayMs > 0 && i + BATCH_SIZE < targets.length) {
      await sleep(delayMs);
    }
  }

  console.log(`Done. ok=${okCount} fail=${failCount}`);
  if (failCount > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
