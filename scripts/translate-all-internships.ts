/**
 * Translate every internship in the database (structured content).
 *
 * Usage:
 *   npx tsx scripts/translate-all-internships.ts
 *   npx tsx scripts/translate-all-internships.ts --dry-run
 *   npx tsx scripts/translate-all-internships.ts --only-missing
 *   npx tsx scripts/translate-all-internships.ts --limit=5 --delay=1000
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, OPENAI_API_KEY in .env.local / .env
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Database } from "../src/database.types";
import {
  getInternshipTranslationStatus,
  parseInternshipContentAr,
  parseInternshipContentArMeta,
  type InternshipSourceRow,
} from "../src/lib/internship-translatable-fields";
import { translateInternshipById } from "../src/lib/translation/translate-internship";

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
    else if (arg.startsWith("--limit=")) {
      const n = Number.parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    } else if (arg.startsWith("--delay=")) {
      const n = Number.parseInt(arg.slice("--delay=".length), 10);
      if (Number.isFinite(n) && n >= 0) delayMs = n;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: npx tsx scripts/translate-all-internships.ts [options]

Options:
  --dry-run         List internships that would be translated; no OpenAI / DB writes
  --only-missing    Skip internships with translation status "up_to_date"
  --limit=N         Process at most N internships
  --delay=MS        Wait MS milliseconds between batches of 3 (default 0)
`);
      process.exit(0);
    }
  }

  return { dryRun, onlyMissing, limit, delayMs };
}

const CONCURRENCY = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type InternshipFetchRow = {
  id: string;
  name: string;
  provider: string;
  country_code: string;
  location_label: string;
  field: string;
  pay_label: string;
  duration: string;
  summary: string;
  what_youll_do: string[];
  what_youll_gain: string[];
  eligibility: string;
  how_to_apply: string;
  content_ar: Database["public"]["Tables"]["internships"]["Row"]["content_ar"];
  content_ar_meta: Database["public"]["Tables"]["internships"]["Row"]["content_ar_meta"];
};

async function fetchAllInternships(
  supabase: ReturnType<typeof createClient<Database>>,
) {
  const pageSize = 500;
  const rows: InternshipFetchRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("internships")
      .select(
        "id, name, provider, country_code, location_label, field, pay_label, duration, summary, what_youll_do, what_youll_gain, eligibility, how_to_apply, content_ar, content_ar_meta",
      )
      .order("name", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch internships: ${error.message}`);
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows;
}

function toSourceRow(row: InternshipFetchRow): InternshipSourceRow {
  return {
    name: row.name,
    provider: row.provider,
    country_code: row.country_code,
    location_label: row.location_label,
    field: row.field,
    pay_label: row.pay_label,
    duration: row.duration,
    summary: row.summary,
    what_youll_do: row.what_youll_do,
    what_youll_gain: row.what_youll_gain,
    eligibility: row.eligibility,
    how_to_apply: row.how_to_apply,
  };
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
  const all = await fetchAllInternships(supabase);

  let targets = all;
  if (onlyMissing) {
    targets = all.filter((internship) => {
      const row = toSourceRow(internship);
      const contentAr = parseInternshipContentAr(internship.content_ar);
      const meta = parseInternshipContentArMeta(internship.content_ar_meta);
      const status = getInternshipTranslationStatus(row, contentAr, meta);
      return status !== "up_to_date";
    });
  }

  if (limit != null) {
    targets = targets.slice(0, limit);
  }

  console.log(
    [
      `Internships in DB: ${all.length}`,
      `Selected: ${targets.length}`,
      dryRun ? "mode=dry-run" : "mode=live",
      onlyMissing ? "filter=only-missing" : "filter=all",
      `concurrency=${CONCURRENCY}`,
      limit != null ? `limit=${limit}` : null,
      delayMs > 0 ? `delay=${delayMs}ms` : null,
    ]
      .filter(Boolean)
      .join(" | "),
  );

  if (targets.length === 0) {
    console.log("Nothing to translate.");
    return;
  }

  let okCount = 0;
  let failCount = 0;
  let doneCount = 0;

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);

    if (dryRun) {
      doneCount += batch.length;
      okCount += batch.length;
      console.log(`Progress: ${doneCount}/${targets.length}`);
      continue;
    }

    const results = await Promise.all(
      batch.map(async (internship) => {
        try {
          const result = await translateInternshipById(supabase, internship.id);
          return { ok: result.ok as boolean };
        } catch {
          return { ok: false };
        }
      }),
    );

    for (const item of results) {
      doneCount += 1;
      if (item.ok) okCount += 1;
      else failCount += 1;
    }

    console.log(`Progress: ${doneCount}/${targets.length}`);

    if (delayMs > 0 && i + CONCURRENCY < targets.length) {
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
