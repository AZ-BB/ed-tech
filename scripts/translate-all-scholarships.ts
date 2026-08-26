/**
 * Translate every scholarship in the database (structured content).
 *
 * Usage:
 *   npx tsx scripts/translate-all-scholarships.ts
 *   npx tsx scripts/translate-all-scholarships.ts --dry-run
 *   npx tsx scripts/translate-all-scholarships.ts --only-missing
 *   npx tsx scripts/translate-all-scholarships.ts --limit=5 --delay=1000
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, OPENAI_API_KEY in .env.local / .env
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Database } from "../src/database.types";
import {
  getScholarshipTranslationStatus,
  parseScholarshipContentAr,
  parseScholarshipContentArMeta,
  type ScholarshipSourceRow,
} from "../src/lib/scholarship-translatable-fields";
import { translateScholarshipById } from "../src/lib/translation/translate-scholarship";

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
      console.log(`Usage: npx tsx scripts/translate-all-scholarships.ts [options]

Options:
  --dry-run         List scholarships that would be translated; no OpenAI / DB writes
  --only-missing    Skip scholarships with translation status "up_to_date"
  --limit=N         Process at most N scholarships
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

async function fetchAllScholarships(
  supabase: ReturnType<typeof createClient<Database>>,
) {
  const pageSize = 500;
  const rows: {
    id: string;
    name: string;
    nationality_country_code: string;
    description: string | null;
    target_students: string | null;
    level: string | null;
    fields: Database["public"]["Tables"]["scholarships"]["Row"]["fields"];
    coverage: string | null;
    competition: Database["public"]["Tables"]["scholarships"]["Row"]["competition"];
    tuition: string | null;
    travel: string | null;
    living_stipend: string | null;
    other_benefits: string | null;
    city: string | null;
    academic_eligibility: string | null;
    sat_policy: string | null;
    documents: Database["public"]["Tables"]["scholarships"]["Row"]["documents"];
    deadline: string | null;
    method: string | null;
    tooltip: string | null;
    other: string | null;
    intakes: string | null;
    is_renewable: boolean;
    type: Database["public"]["Tables"]["scholarships"]["Row"]["type"];
    discovery_payload: Database["public"]["Tables"]["scholarships"]["Row"]["discovery_payload"];
    content_ar: Database["public"]["Tables"]["scholarships"]["Row"]["content_ar"];
    content_ar_meta: Database["public"]["Tables"]["scholarships"]["Row"]["content_ar_meta"];
  }[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("scholarships")
      .select(
        "id, name, nationality_country_code, description, target_students, level, fields, coverage, competition, tuition, travel, living_stipend, other_benefits, city, academic_eligibility, sat_policy, documents, deadline, method, tooltip, other, intakes, is_renewable, type, discovery_payload, content_ar, content_ar_meta",
      )
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

function toSourceRow(
  s: Awaited<ReturnType<typeof fetchAllScholarships>>[number],
): ScholarshipSourceRow {
  return {
    name: s.name,
    nationality_country_code: s.nationality_country_code,
    description: s.description,
    target_students: s.target_students,
    level: s.level,
    fields: s.fields,
    coverage: s.coverage,
    competition: s.competition,
    tuition: s.tuition,
    travel: s.travel,
    living_stipend: s.living_stipend,
    other_benefits: s.other_benefits,
    city: s.city,
    academic_eligibility: s.academic_eligibility,
    sat_policy: s.sat_policy,
    documents: s.documents,
    deadline: s.deadline,
    method: s.method,
    tooltip: s.tooltip,
    other: s.other,
    intakes: s.intakes,
    is_renewable: s.is_renewable,
    type: s.type,
    discovery_payload: s.discovery_payload,
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
  const all = await fetchAllScholarships(supabase);

  let targets = all;
  if (onlyMissing) {
    targets = all.filter((scholarship) => {
      const row = toSourceRow(scholarship);
      const contentAr = parseScholarshipContentAr(scholarship.content_ar);
      const meta = parseScholarshipContentArMeta(scholarship.content_ar_meta);
      const status = getScholarshipTranslationStatus(row, contentAr, meta);
      return status !== "up_to_date";
    });
  }

  if (limit != null) {
    targets = targets.slice(0, limit);
  }

  console.log(
    [
      `Scholarships in DB: ${all.length}`,
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
      batch.map(async (scholarship) => {
        try {
          const result = await translateScholarshipById(supabase, scholarship.id);
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
