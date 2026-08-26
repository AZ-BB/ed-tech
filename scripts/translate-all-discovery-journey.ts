/**
 * Translate all discovery journey modules and global settings.
 *
 * Usage:
 *   npx tsx scripts/translate-all-discovery-journey.ts
 *   npx tsx scripts/translate-all-discovery-journey.ts --dry-run
 *   npx tsx scripts/translate-all-discovery-journey.ts --only-missing
 *   npx tsx scripts/translate-all-discovery-journey.ts --limit=2 --delay=1000
 *   npx tsx scripts/translate-all-discovery-journey.ts --modules-only
 *   npx tsx scripts/translate-all-discovery-journey.ts --settings-only
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, OPENAI_API_KEY in .env.local / .env
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Database } from "../src/database.types";
import {
  getDiscoveryModuleTranslationStatus,
  getDiscoverySettingsTranslationStatus,
  parseDiscoveryContentArMeta,
  parseDiscoveryModuleContentAr,
  parseDiscoverySettingsContentAr,
  type DiscoveryModuleSourceRow,
  type DiscoverySettingsSourceRow,
} from "../src/lib/discovery-translatable-fields";
import { translateDiscoveryModuleById } from "../src/lib/translation/translate-discovery-module";
import { translateDiscoverySettings } from "../src/lib/translation/translate-discovery-settings";

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
  let modulesOnly = false;
  let settingsOnly = false;

  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--only-missing") onlyMissing = true;
    else if (arg === "--modules-only") modulesOnly = true;
    else if (arg === "--settings-only") settingsOnly = true;
    else if (arg.startsWith("--limit=")) {
      const n = Number.parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    } else if (arg.startsWith("--delay=")) {
      const n = Number.parseInt(arg.slice("--delay=".length), 10);
      if (Number.isFinite(n) && n >= 0) delayMs = n;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: npx tsx scripts/translate-all-discovery-journey.ts [options]

Options:
  --dry-run         List items that would be translated; no OpenAI / DB writes
  --only-missing    Skip modules/settings with translation status "up_to_date"
  --limit=N         Process at most N modules
  --delay=MS        Wait MS milliseconds between batches of 3 (default 0)
  --modules-only    Skip global settings translation
  --settings-only   Translate only global settings (scales + combined profiles)
`);
      process.exit(0);
    }
  }

  if (modulesOnly && settingsOnly) {
    console.error("Use only one of --modules-only or --settings-only.");
    process.exit(1);
  }

  return { dryRun, onlyMissing, limit, delayMs, modulesOnly, settingsOnly };
}

const CONCURRENCY = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAllModules(supabase: ReturnType<typeof createClient<Database>>) {
  const { data, error } = await supabase
    .from("discovery_modules")
    .select("id, title, subtitle, description, content_json, content_ar, content_ar_meta")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch modules: ${error.message}`);
  }

  return data ?? [];
}

async function fetchSettingsRow(supabase: ReturnType<typeof createClient<Database>>) {
  const { data, error } = await supabase
    .from("discovery_settings")
    .select("id, scales_json, combined_profiles_json, content_ar, content_ar_meta")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch discovery settings: ${error.message}`);
  }

  return data;
}

async function main() {
  const { dryRun, onlyMissing, limit, delayMs, modulesOnly, settingsOnly } = parseArgs(
    process.argv.slice(2),
  );

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

  let moduleTargets: Awaited<ReturnType<typeof fetchAllModules>> = [];
  if (!settingsOnly) {
    const allModules = await fetchAllModules(supabase);
    moduleTargets = allModules;

    if (onlyMissing) {
      moduleTargets = allModules.filter((module) => {
        const row: DiscoveryModuleSourceRow = {
          id: module.id,
          title: module.title,
          subtitle: module.subtitle,
          description: module.description,
          content_json: module.content_json,
        };
        const contentAr = parseDiscoveryModuleContentAr(module.content_ar);
        const meta = parseDiscoveryContentArMeta(module.content_ar_meta);
        return getDiscoveryModuleTranslationStatus(row, contentAr, meta) !== "up_to_date";
      });
    }

    if (limit != null) {
      moduleTargets = moduleTargets.slice(0, limit);
    }
  }

  let shouldTranslateSettings = !modulesOnly;
  if (shouldTranslateSettings && onlyMissing) {
    const settings = await fetchSettingsRow(supabase);
    if (settings) {
      const row: DiscoverySettingsSourceRow = {
        scales_json: settings.scales_json,
        combined_profiles_json: settings.combined_profiles_json,
      };
      const contentAr = parseDiscoverySettingsContentAr(settings.content_ar);
      const meta = parseDiscoveryContentArMeta(settings.content_ar_meta);
      shouldTranslateSettings =
        getDiscoverySettingsTranslationStatus(row, contentAr, meta) !== "up_to_date";
    }
  }

  console.log(
    [
      `Modules selected: ${moduleTargets.length}`,
      shouldTranslateSettings ? "settings=included" : "settings=skipped",
      dryRun ? "mode=dry-run" : "mode=live",
      onlyMissing ? "filter=only-missing" : "filter=all",
      `concurrency=${CONCURRENCY}`,
      limit != null ? `limit=${limit}` : null,
      delayMs > 0 ? `delay=${delayMs}ms` : null,
    ]
      .filter(Boolean)
      .join(" | "),
  );

  if (moduleTargets.length === 0 && !shouldTranslateSettings) {
    console.log("Nothing to translate.");
    return;
  }

  let okCount = 0;
  let failCount = 0;
  let doneCount = 0;

  for (let i = 0; i < moduleTargets.length; i += CONCURRENCY) {
    const batch = moduleTargets.slice(i, i + CONCURRENCY);

    if (dryRun) {
      for (const module of batch) {
        console.log(`[dry-run] module: ${module.id} — ${module.title}`);
      }
      doneCount += batch.length;
      okCount += batch.length;
      console.log(`Progress: ${doneCount}/${moduleTargets.length}`);
      continue;
    }

    const results = await Promise.all(
      batch.map(async (module) => {
        try {
          const result = await translateDiscoveryModuleById(supabase, module.id);
          if (!result.ok) {
            console.error(`Module ${module.id}: ${result.error}`);
          }
          return { ok: result.ok as boolean };
        } catch (err) {
          console.error(`Module ${module.id}:`, err);
          return { ok: false };
        }
      }),
    );

    for (const item of results) {
      doneCount += 1;
      if (item.ok) okCount += 1;
      else failCount += 1;
    }

    console.log(`Progress: ${doneCount}/${moduleTargets.length}`);

    if (delayMs > 0 && i + CONCURRENCY < moduleTargets.length) {
      await sleep(delayMs);
    }
  }

  if (shouldTranslateSettings) {
    if (dryRun) {
      console.log("[dry-run] settings: default");
      okCount += 1;
    } else {
      try {
        const result = await translateDiscoverySettings(supabase);
        if (result.ok) {
          okCount += 1;
          console.log(`Settings translated: ${result.translatedCount} field(s)`);
        } else {
          failCount += 1;
          console.error(`Settings: ${result.error}`);
        }
      } catch (err) {
        failCount += 1;
        console.error("Settings:", err);
      }
    }
  }

  console.log(`Done. ok=${okCount} fail=${failCount}`);
  if (failCount > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
