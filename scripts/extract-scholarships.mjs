import fs from "node:fs";

const src =
  "C:/Users/pc/Desktop/work/Clients/ghassan/old-code/scholarship_discovery_page.html";
const s = fs.readFileSync(src, "utf8");
const lines = s.split(/\r?\n/);
const startLine = lines.findIndex((l) => l.includes("var scholarships=["));
if (startLine === -1) throw new Error("marker line not found");
let buf = lines[startLine].replace(/^[\s\S]*?var scholarships=\s*/, "");
let endLine = startLine;
for (let k = startLine + 1; k < lines.length; k++) {
  buf += "\n" + lines[k];
  endLine = k;
  if (/^\s*\];\s*$/.test(lines[k])) break;
}
if (!/^\s*\];\s*$/.test(lines[endLine])) throw new Error("closing ]; not found");
const slice = buf.replace(/\s*\]\s*;\s*$/, "]").trim();
const arr = (0, eval)(slice);
const out =
  "src/app/(protected)/student/scolarships/_data/scholarships.json";
fs.mkdirSync("src/app/(protected)/student/scolarships/_data", {
  recursive: true,
});
fs.writeFileSync(out, JSON.stringify(arr, null, 2), "utf8");
console.log("Wrote", out, "items:", arr.length);
