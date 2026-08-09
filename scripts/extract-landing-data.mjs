import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = process.argv[2];
if (!htmlPath) {
  console.error("Usage: node scripts/extract-landing-data.mjs <path-to-html>");
  process.exit(1);
}

const html = readFileSync(htmlPath, "utf8");
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error("No script block found");
  process.exit(1);
}
const script = scriptMatch[1];

function extractArray(name) {
  const start = script.indexOf(`var ${name}=`);
  if (start === -1) throw new Error(`Could not find ${name}`);
  const open = script.indexOf("[", start);
  let depth = 0;
  let inString = false;
  let quote = "";
  for (let i = open; i < script.length; i++) {
    const ch = script[i];
    const prev = script[i - 1];
    if (inString) {
      if (ch === quote && prev !== "\\") inString = false;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inString = true;
      quote = ch;
      continue;
    }
    if (ch === "[") depth++;
    if (ch === "]") {
      depth--;
      if (depth === 0) {
        const expr = script.slice(open, i + 1);
        // eslint-disable-next-line no-eval
        return eval(`(${expr})`);
      }
    }
  }
  throw new Error(`Could not parse ${name}`);
}

const HERO_PROFILES = extractArray("HERO_PROFILES");
const OPT_TOOLS = extractArray("OPT_TOOLS");
const PTR_METRICS = extractArray("PTR_METRICS");
const PTR_UNIS = extractArray("PTR_UNIS");
const ADVISORS = extractArray("ADVISORS");
const AMBASSADORS = extractArray("AMBASSADORS");

const outDir = join(__dirname, "../src/components/landing/data");
mkdirSync(outDir, { recursive: true });

const out = `// Auto-generated from landing page HTML — do not edit by hand
export const HERO_PROFILES = ${JSON.stringify(HERO_PROFILES, null, 2)} as const;

export const OPT_TOOLS = ${JSON.stringify(OPT_TOOLS, null, 2)} as const;

export const PTR_METRICS = ${JSON.stringify(PTR_METRICS, null, 2)} as const;

export const PTR_UNIS = ${JSON.stringify(PTR_UNIS, null, 2)} as const;

export const ADVISORS = ${JSON.stringify(ADVISORS, null, 2)} as const;

export const AMBASSADORS = ${JSON.stringify(AMBASSADORS, null, 2)} as const;
`;

writeFileSync(join(outDir, "landing-page-data.ts"), out);
console.log("Wrote landing-page-data.ts");
