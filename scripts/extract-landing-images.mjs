import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dataPath = join(root, "src/components/landing/data/landing-page-data.ts");
const outDir = join(root, "public/landing");

mkdirSync(join(outDir, "hero"), { recursive: true });
mkdirSync(join(outDir, "advisors"), { recursive: true });
mkdirSync(join(outDir, "ambassadors"), { recursive: true });

let source = readFileSync(dataPath, "utf8");
let counter = 0;

const dataUrlRegex = /data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)/g;

source = source.replace(dataUrlRegex, (match, format, base64) => {
  counter++;
  const ext = format === "jpg" ? "jpeg" : format;
  const buffer = Buffer.from(base64, "base64");

  let subdir = "misc";
  if (counter <= 5) subdir = "hero";
  else if (counter <= 10) subdir = "advisors";
  else subdir = "ambassadors";

  const index =
    subdir === "hero"
      ? counter
      : subdir === "advisors"
        ? counter - 5
        : counter - 10;

  const prefix =
    subdir === "hero"
      ? "hero"
      : subdir === "advisors"
        ? "advisor"
        : "ambassador";
  const filename = `${prefix}-${index}.${ext}`;
  const filePath = join(outDir, subdir, filename);
  writeFileSync(filePath, buffer);

  const publicPath = `/landing/${subdir}/${filename}`;
  console.log(`Wrote ${publicPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
  return publicPath;
});

writeFileSync(dataPath, source);
console.log(`\nExtracted ${counter} images and updated ${dataPath}`);
