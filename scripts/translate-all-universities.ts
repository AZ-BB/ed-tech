/**
 * Translate every university in the database (structured content + majors/programs).
 *
 * Usage:
 *   npx tsx scripts/translate-all-universities.ts
 *   npx tsx scripts/translate-all-universities.ts --dry-run
 *   npx tsx scripts/translate-all-universities.ts --only-missing
 *   npx tsx scripts/translate-all-universities.ts --limit=5 --delay=1000
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, OPENAI_API_KEY in .env.local / .env
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Database } from "../src/database.types";
import { translateUniversityById } from "../src/lib/translation/translate-university";
import {
  getUniversityTranslationStatus,
  parseUniversityContentAr,
  parseUniversityContentArMeta,
  type UniversitySourceRow,
} from "../src/lib/university-translatable-fields";

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
      console.log(`Usage: npx tsx scripts/translate-all-universities.ts [options]

Options:
  --dry-run         List universities that would be translated; no OpenAI / DB writes
  --only-missing    Skip universities with translation status "up_to_date"
  --limit=N         Process at most N universities
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

async function fetchAllUniversities(
  supabase: ReturnType<typeof createClient<Database>>,
) {
  const pageSize = 500;
  const rows: {
    id: string;
    name: string;
    city: string | null;
    country_code: string | null;
    description: string | null;
    tuition_display: string | null;
    tuition_per_year: number | null;
    living_display: string | null;
    estimated_living_cost_per_year: number | null;
    sat_policy: string | null;
    method: string | null;
    intakes: string | null;
    documents: Database["public"]["Tables"]["universities"]["Row"]["documents"];
    is_scholarship_available: boolean;
    content_ar: Database["public"]["Tables"]["universities"]["Row"]["content_ar"];
    content_ar_meta: Database["public"]["Tables"]["universities"]["Row"]["content_ar_meta"];
  }[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("universities")
      .select(
        "id, name, city, country_code, description, tuition_display, tuition_per_year, living_display, estimated_living_cost_per_year, sat_policy, method, intakes, documents, is_scholarship_available, content_ar, content_ar_meta",
      )
      .order("name", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch universities: ${error.message}`);
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows;
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
  const all = await fetchAllUniversities(supabase);

  let targets = all;
  if (onlyMissing) {
    targets = all.filter((uni) => {
      const row: UniversitySourceRow = {
        name: uni.name,
        city: uni.city,
        country_code: uni.country_code,
        description: uni.description,
        tuition_display: uni.tuition_display,
        tuition_per_year: uni.tuition_per_year,
        living_display: uni.living_display,
        estimated_living_cost_per_year: uni.estimated_living_cost_per_year,
        sat_policy: uni.sat_policy,
        method: uni.method,
        intakes: uni.intakes,
        documents: uni.documents,
        is_scholarship_available: uni.is_scholarship_available,
      };
      const contentAr = parseUniversityContentAr(uni.content_ar);
      const meta = parseUniversityContentArMeta(uni.content_ar_meta);
      const status = getUniversityTranslationStatus(row, contentAr, meta);
      return status !== "up_to_date";
    });
  }

  if (limit != null) {
    targets = targets.slice(0, limit);
  }

  console.log(
    [
      `Universities in DB: ${all.length}`,
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
      batch.map(async (uni) => {
        try {
          const result = await translateUniversityById(supabase, uni.id);
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
