/**
 * Translate every university event in the database.
 *
 * Usage:
 *   npx tsx scripts/translate-all-events.ts
 *   npx tsx scripts/translate-all-events.ts --dry-run
 *   npx tsx scripts/translate-all-events.ts --only-missing
 *   npx tsx scripts/translate-all-events.ts --limit=5 --delay=1000
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Database } from "../src/database.types";
import {
  getEventTranslationStatus,
  parseEventContentAr,
  parseEventContentArMeta,
  type EventSourceRow,
} from "../src/lib/event-translatable-fields";
import { translateEventById } from "../src/lib/translation/translate-event";

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
    }
  }

  return { dryRun, onlyMissing, limit, delayMs };
}

const CONCURRENCY = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type EventFetchRow = {
  id: string;
  event_name: string;
  event_type: string;
  recommended_tag: string | null;
  short_description: string | null;
  full_overview: string | null;
  topics_covered: string | null;
  target_audience: string | null;
  why_attend: string | null;
  prep_steps: string | null;
  city: string | null;
  venue: string | null;
  organizer: string | null;
  universities_attending: string | null;
  cost: string | null;
  region_focus: string | null;
  country: string | null;
  content_ar: Database["public"]["Tables"]["university_events"]["Row"]["content_ar"];
  content_ar_meta: Database["public"]["Tables"]["university_events"]["Row"]["content_ar_meta"];
};

async function fetchAllEvents(supabase: ReturnType<typeof createClient<Database>>) {
  const pageSize = 500;
  const rows: EventFetchRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("university_events")
      .select(
        "id, event_name, event_type, recommended_tag, short_description, full_overview, topics_covered, target_audience, why_attend, prep_steps, city, venue, organizer, universities_attending, cost, region_focus, country, content_ar, content_ar_meta",
      )
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

function toSourceRow(row: EventFetchRow): EventSourceRow {
  return {
    event_name: row.event_name,
    event_type: row.event_type,
    recommended_tag: row.recommended_tag,
    short_description: row.short_description,
    full_overview: row.full_overview,
    topics_covered: row.topics_covered,
    target_audience: row.target_audience,
    why_attend: row.why_attend,
    prep_steps: row.prep_steps,
    city: row.city,
    venue: row.venue,
    organizer: row.organizer,
    universities_attending: row.universities_attending,
    cost: row.cost,
    region_focus: row.region_focus,
    country: row.country,
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
  const all = await fetchAllEvents(supabase);

  let targets = all;
  if (onlyMissing) {
    targets = all.filter((event) => {
      const row = toSourceRow(event);
      const contentAr = parseEventContentAr(event.content_ar);
      const meta = parseEventContentArMeta(event.content_ar_meta);
      return getEventTranslationStatus(row, contentAr, meta) !== "up_to_date";
    });
  }

  if (limit != null) {
    targets = targets.slice(0, limit);
  }

  console.log(
    [
      `Events in DB: ${all.length}`,
      `Selected: ${targets.length}`,
      dryRun ? "mode=dry-run" : "mode=live",
      onlyMissing ? "filter=only-missing" : "filter=all",
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
      batch.map(async (event) => {
        try {
          const result = await translateEventById(supabase, event.id);
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
