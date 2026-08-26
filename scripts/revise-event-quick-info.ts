/**
 * Translate/revise Arabic content for the event detail "Quick info" sidebar only
 * (معلومات سريعة: time, focus). Does not re-translate name, overview, etc.
 *
 * Usage:
 *   npx tsx scripts/revise-event-quick-info.ts
 *   npx tsx scripts/revise-event-quick-info.ts --dry-run
 *   npx tsx scripts/revise-event-quick-info.ts --only-missing
 *   npx tsx scripts/revise-event-quick-info.ts --limit=20 --delay=1000
 *
 * Processes 10 events per batch (concurrent within each batch).
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, OPENAI_API_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Database } from "../src/database.types";
import {
  getEventQuickInfoTranslationStatus,
  parseEventContentAr,
  parseEventContentArMeta,
} from "../src/lib/event-translatable-fields";
import { translateEventQuickInfoById } from "../src/lib/translation/translate-event-quick-info";

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
      console.log(`Usage: npx tsx scripts/revise-event-quick-info.ts [options]

Translates only Quick info sidebar fields (timeDisplay, regionFocus) into content_ar.

Options:
  --dry-run         List events that would be processed; no OpenAI / DB writes
  --only-missing    Skip events whose quick-info translations are up to date
  --limit=N         Process at most N events
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

type EventQuickInfoFetchRow = {
  id: string;
  event_name: string;
  start_time: string | null;
  end_time: string | null;
  timezone: string | null;
  region_focus: string | null;
  content_ar: Database["public"]["Tables"]["university_events"]["Row"]["content_ar"];
  content_ar_meta: Database["public"]["Tables"]["university_events"]["Row"]["content_ar_meta"];
};

async function fetchActiveEvents(supabase: ReturnType<typeof createClient<Database>>) {
  const pageSize = 500;
  const rows: EventQuickInfoFetchRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("university_events")
      .select(
        "id, event_name, start_time, end_time, timezone, region_focus, content_ar, content_ar_meta",
      )
      .ilike("record_status", "active")
      .order("event_name", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`);
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
  const all = await fetchActiveEvents(supabase);

  let targets = all;
  if (onlyMissing) {
    targets = all.filter((event) => {
      const quickInfoRow = {
        start_time: event.start_time,
        end_time: event.end_time,
        timezone: event.timezone,
        region_focus: event.region_focus,
      };
      const contentAr = parseEventContentAr(event.content_ar);
      const meta = parseEventContentArMeta(event.content_ar_meta);
      return getEventQuickInfoTranslationStatus(quickInfoRow, contentAr, meta) !== "up_to_date";
    });
  }

  if (limit != null) {
    targets = targets.slice(0, limit);
  }

  console.log(
    [
      `Active events: ${all.length}`,
      `Selected for quick-info revise: ${targets.length}`,
      `batchSize=${BATCH_SIZE}`,
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
    for (const event of targets) {
      console.log(`  - ${event.event_name} (${event.id})`);
    }
    return;
  }

  let okCount = 0;
  let failCount = 0;
  let doneCount = 0;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (event) => {
        try {
          const result = await translateEventQuickInfoById(supabase, event.id);
          if (result.ok) {
            console.log(
              `  ✓ ${result.eventName}: ${result.translatedCount} quick-info field(s)`,
            );
            if (result.errors.length > 0) {
              console.warn(`    warnings: ${result.errors.join("; ")}`);
            }
            return true;
          }
          console.error(`  ✗ ${event.event_name}: ${result.error}`);
          return false;
        } catch (err) {
          console.error(`  ✗ ${event.event_name}:`, err);
          return false;
        }
      }),
    );

    for (const ok of results) {
      doneCount += 1;
      if (ok) okCount += 1;
      else failCount += 1;
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
