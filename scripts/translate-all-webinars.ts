/**
 * Translate every webinar in the database.
 *
 * Usage:
 *   npx tsx scripts/translate-all-webinars.ts
 *   npx tsx scripts/translate-all-webinars.ts --dry-run
 *   npx tsx scripts/translate-all-webinars.ts --only-missing
 *   npx tsx scripts/translate-all-webinars.ts --limit=5 --delay=1000
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Database } from "../src/database.types";
import {
  getWebinarTranslationStatus,
  parseWebinarContentAr,
  parseWebinarContentArMeta,
  type WebinarSourceRow,
} from "../src/lib/webinar-translatable-fields";
import { translateWebinarById } from "../src/lib/translation/translate-webinar";

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

type WebinarFetchRow = {
  id: number;
  title: string;
  description: string | null;
  format: string;
  tags: string[] | null;
  agenda: unknown;
  host_name: string | null;
  host_title: string | null;
  host_bio: string | null;
  host_image_url: string | null;
  content_ar: Database["public"]["Tables"]["webinars"]["Row"]["content_ar"];
  content_ar_meta: Database["public"]["Tables"]["webinars"]["Row"]["content_ar_meta"];
  advisors:
    | {
        first_name: string | null;
        last_name: string | null;
        title: string | null;
        description: string | null;
        about: string | null;
        avatar_url: string | null;
      }
    | {
        first_name: string | null;
        last_name: string | null;
        title: string | null;
        description: string | null;
        about: string | null;
        avatar_url: string | null;
      }[]
    | null;
};

async function fetchAllWebinars(supabase: ReturnType<typeof createClient<Database>>) {
  const pageSize = 500;
  const rows: WebinarFetchRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("webinars")
      .select(
        `
        id, title, description, format, tags, agenda,
        host_name, host_title, host_bio, host_image_url,
        content_ar, content_ar_meta,
        advisors ( first_name, last_name, title, description, about, avatar_url )
      `,
      )
      .order("title", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch webinars: ${error.message}`);
    }

    const batch = (data ?? []) as WebinarFetchRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows;
}

function toSourceRow(row: WebinarFetchRow): WebinarSourceRow {
  const advisor = Array.isArray(row.advisors) ? row.advisors[0] : row.advisors;
  return {
    title: row.title,
    description: row.description,
    format: row.format,
    tags: row.tags,
    agenda: row.agenda,
    host_name: row.host_name,
    host_title: row.host_title,
    host_bio: row.host_bio,
    host_image_url: row.host_image_url,
    advisors: advisor ?? null,
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
  const all = await fetchAllWebinars(supabase);

  let targets = all;
  if (onlyMissing) {
    targets = all.filter((webinar) => {
      const row = toSourceRow(webinar);
      const contentAr = parseWebinarContentAr(webinar.content_ar);
      const meta = parseWebinarContentArMeta(webinar.content_ar_meta);
      return getWebinarTranslationStatus(row, contentAr, meta) !== "up_to_date";
    });
  }

  if (limit != null) {
    targets = targets.slice(0, limit);
  }

  console.log(
    [
      `Webinars in DB: ${all.length}`,
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
      batch.map(async (webinar) => {
        try {
          const result = await translateWebinarById(supabase, webinar.id);
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
