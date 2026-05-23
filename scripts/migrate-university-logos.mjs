import { createServerClient } from "@supabase/ssr";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PLACEHOLDER_PATH = path.join(ROOT, "public", "1.png");
const BUCKET = "university-logos";
const PAGE_SIZE = 200;
const DOWNLOAD_TIMEOUT_MS = 30_000;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env");
  process.exit(1);
}

if (!fs.existsSync(PLACEHOLDER_PATH)) {
  console.error(`Placeholder image not found at ${PLACEHOLDER_PATH}`);
  process.exit(1);
}

const placeholderBytes = fs.readFileSync(PLACEHOLDER_PATH);
const storagePrefix = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/`;

const supabase = createServerClient(supabaseUrl, serviceKey, {
  cookies: {
    getAll() {
      return null;
    },
  },
});

/** @type {{ processed: number; nullified: number; uploaded: number; skipped: number; failed: number }} */
const summary = {
  processed: 0,
  nullified: 0,
  uploaded: 0,
  skipped: 0,
  failed: 0,
};

function buffersEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  return Buffer.compare(a, b) === 0;
}

function isAlreadyMigrated(logoUrl) {
  return typeof logoUrl === "string" && logoUrl.startsWith(storagePrefix);
}

function extensionFromContentType(contentType) {
  const normalized = contentType.split(";")[0].trim().toLowerCase();
  switch (normalized) {
    case "image/png":
      return "png";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    default:
      return null;
  }
}

function extensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const match = pathname.match(/\.(png|jpe?g|webp|gif|svg)(?:$|[?#])/);
    return match?.[1]?.replace("jpeg", "jpg") ?? null;
  } catch {
    return null;
  }
}

function extensionFromBytes(bytes) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "gif";
  }
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("utf8").toLowerCase() === "<svg") {
    return "svg";
  }
  return null;
}

function resolveImageMeta(sourceUrl, bytes, responseContentType) {
  const ext =
    extensionFromContentType(responseContentType ?? "") ??
    extensionFromUrl(sourceUrl) ??
    extensionFromBytes(bytes) ??
    "png";

  const contentType =
    ext === "jpg" ? "image/jpeg" : ext === "svg" ? "image/svg+xml" : `image/${ext}`;

  return { ext, contentType };
}

async function downloadImage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "UniveeraLogoMigration/1.0",
        Accept: "image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      bytes: Buffer.from(arrayBuffer),
      contentType: response.headers.get("content-type"),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchUniversitiesPage(from, to) {
  const { data, error } = await supabase
    .from("universities")
    .select("id, name, logo_url")
    .not("logo_url", "is", null)
    .order("name")
    .range(from, to);

  if (error) {
    throw new Error(`Failed to fetch universities: ${error.message}`);
  }

  return data ?? [];
}

async function processUniversity(university) {
  const { id, name, logo_url: logoUrl } = university;
  summary.processed += 1;

  if (!logoUrl) {
    summary.skipped += 1;
    console.log(`[skip] ${name} (${id}) — no logo_url`);
    return;
  }

  if (isAlreadyMigrated(logoUrl)) {
    summary.skipped += 1;
    console.log(`[skip] ${name} (${id}) — already in Supabase storage`);
    return;
  }

  let bytes;
  let responseContentType;

  try {
    ({ bytes, contentType: responseContentType } = await downloadImage(logoUrl));
  } catch (error) {
    summary.failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[fail] ${name} (${id}) — download failed: ${message}`);
    return;
  }

  if (buffersEqual(bytes, placeholderBytes)) {
    if (dryRun) {
      summary.nullified += 1;
      console.log(`[dry-run null] ${name} (${id}) — placeholder image detected`);
      return;
    }

    const { error } = await supabase.from("universities").update({ logo_url: null }).eq("id", id);
    if (error) {
      summary.failed += 1;
      console.error(`[fail] ${name} (${id}) — failed to null logo_url: ${error.message}`);
      return;
    }

    summary.nullified += 1;
    console.log(`[null] ${name} (${id}) — placeholder image removed`);
    return;
  }

  const { ext, contentType } = resolveImageMeta(logoUrl, bytes, responseContentType);
  const objectPath = `${id}/logo.${ext}`;
  const publicUrl = `${storagePrefix}${objectPath}`;

  if (dryRun) {
    summary.uploaded += 1;
    console.log(`[dry-run upload] ${name} (${id}) -> ${publicUrl}`);
    return;
  }

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, bytes, {
    contentType,
    upsert: true,
  });

  if (uploadError) {
    summary.failed += 1;
    console.error(`[fail] ${name} (${id}) — upload failed: ${uploadError.message}`);
    return;
  }

  const { error: updateError } = await supabase
    .from("universities")
    .update({ logo_url: publicUrl })
    .eq("id", id);

  if (updateError) {
    summary.failed += 1;
    console.error(`[fail] ${name} (${id}) — failed to update logo_url: ${updateError.message}`);
    return;
  }

  summary.uploaded += 1;
  console.log(`[upload] ${name} (${id}) -> ${publicUrl}`);
}

async function main() {
  console.log(`Starting university logo migration${dryRun ? " (dry run)" : ""}...`);
  console.log(`Placeholder bytes: ${placeholderBytes.length}`);
  console.log(`Storage bucket: ${BUCKET}`);

  let offset = 0;
  let done = false;

  while (!done) {
    const from = offset;
    const to = offset + PAGE_SIZE - 1;
    const page = await fetchUniversitiesPage(from, to);

    if (page.length === 0) {
      break;
    }

    for (const university of page) {
      if (limit !== null && summary.processed >= limit) {
        done = true;
        break;
      }
      await processUniversity(university);
    }

    if (page.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  console.log("\nSummary:");
  console.log(`  processed: ${summary.processed}`);
  console.log(`  uploaded:  ${summary.uploaded}`);
  console.log(`  nullified: ${summary.nullified}`);
  console.log(`  skipped:   ${summary.skipped}`);
  console.log(`  failed:    ${summary.failed}`);

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
