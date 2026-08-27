/**
 * Translate every program discovery row and its linked university programs.
 *
 * Usage:
 *   npx tsx scripts/translate-all-programs-discovery.ts
 *   npx tsx scripts/translate-all-programs-discovery.ts --dry-run
 *   npx tsx scripts/translate-all-programs-discovery.ts --only-missing
 *   npx tsx scripts/translate-all-programs-discovery.ts --limit=5 --delay=1000
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, OPENAI_API_KEY in .env.local / .env
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Database } from "../src/database.types";
import {
  getProgramDiscoveryTranslationStatus,
  parseProgramDiscoveryContentAr,
  parseProgramDiscoveryContentArMeta,
  programDiscoverySourceRowFromRow,
} from "../src/lib/program-discovery-translatable-fields";
import type { ProgramsDiscoveryRow } from "../src/lib/programs-discovery-types";
import { translateProgramDiscoveryBundleById } from "../src/lib/translation/translate-program-discovery-bundle";

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
      console.log(`Usage: npx tsx scripts/translate-all-programs-discovery.ts [options]

Options:
  --dry-run         List programs that would be translated; no OpenAI / DB writes
  --only-missing    Skip programs with translation status "up_to_date"
  --limit=N         Process at most N programs
  --delay=MS        Wait MS milliseconds between programs (default 0)
`);
      process.exit(0);
    }
  }

  return { dryRun, onlyMissing, limit, delayMs };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAllPrograms(
  supabase: ReturnType<typeof createClient<Database>>,
) {
  const pageSize = 500;
  const rows: ProgramsDiscoveryRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("programs_discovery")
      .select("*")
      .order("title", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch programs: ${error.message}`);
    }

    const batch = (data ?? []) as ProgramsDiscoveryRow[];
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
  const all = await fetchAllPrograms(supabase);

  let targets = all;
  if (onlyMissing) {
    targets = all.filter((program) => {
      const sourceRow = programDiscoverySourceRowFromRow(program);
      const contentAr = parseProgramDiscoveryContentAr(program.content_ar ?? null);
      const meta = parseProgramDiscoveryContentArMeta(program.content_ar_meta ?? null);
      const status = getProgramDiscoveryTranslationStatus(sourceRow, contentAr, meta);
      return status !== "up_to_date";
    });
  }

  if (limit != null) {
    targets = targets.slice(0, limit);
  }

  console.log(
    [
      `Programs in DB: ${all.length}`,
      `Selected: ${targets.length}`,
      dryRun ? "mode=dry-run" : "mode=live",
      onlyMissing ? "filter=only-missing" : "filter=all",
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

  for (let i = 0; i < targets.length; i += 1) {
    const program = targets[i];

    if (dryRun) {
      console.log(`Would translate: ${program.title} (${program.slug})`);
      okCount += 1;
      console.log(`Progress: ${i + 1}/${targets.length}`);
      continue;
    }

    try {
      const result = await translateProgramDiscoveryBundleById(
        supabase,
        program.id,
      );
      if (result.ok) {
        okCount += 1;
        console.log(
          `Translated ${result.programTitle}: ${result.totalTranslatedCount} field(s), ${result.universityProgramCount} uni program(s)`,
        );
      } else {
        failCount += 1;
        console.error(`Failed ${program.title}: ${result.error}`);
      }
    } catch (err) {
      failCount += 1;
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`Failed ${program.title}: ${message}`);
    }

    console.log(`Progress: ${i + 1}/${targets.length}`);

    if (delayMs > 0 && i + 1 < targets.length) {
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
