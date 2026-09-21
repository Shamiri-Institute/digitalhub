// Compares two `bench --dump` directories page by page after removing build-specific noise,
// so a query conversion can be checked for rendering the same data.
//   npm run bench:diff -- bench/dumps/before bench/dumps/after
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const [dirA, dirB] = process.argv.slice(2);
if (!dirA || !dirB) {
  console.error("Usage: npm run bench:diff -- <dumpDirBefore> <dumpDirAfter>");
  process.exit(1);
}

// Things that legitimately differ between two builds or two requests of the same data.
function normalize(html: string) {
  return html
    .replace(/\/_next\/static\/[A-Za-z0-9_-]+\//g, "/_next/static/BUILD/")
    .replace(/"buildId":"[^"]+"/g, '"buildId":"BUILD"')
    .replace(/\?dpl=[A-Za-z0-9_-]+/g, "")
    .replace(/nonce="[^"]+"/g, 'nonce=""')
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\b/g, (iso) =>
      // Session expiry and "now" style timestamps move between runs; keep the date only.
      iso.slice(0, 10),
    );
}

function firstDifference(a: string, b: string) {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i++;
  const from = Math.max(0, i - 80);
  return { at: i, a: a.slice(from, i + 160), b: b.slice(from, i + 160) };
}

const files = readdirSync(dirA)
  .filter((f) => f.endsWith(".html"))
  .toSorted();
let same = 0;
const differing: string[] = [];
const missing: string[] = [];
for (const file of files) {
  const other = path.join(dirB, file);
  if (!existsSync(other)) {
    missing.push(file);
    continue;
  }
  const a = normalize(readFileSync(path.join(dirA, file), "utf8"));
  const b = normalize(readFileSync(other, "utf8"));
  if (a === b) {
    same++;
    continue;
  }
  differing.push(file);
  const d = firstDifference(a, b);
  console.log(`\n## ${file} differs (${a.length} vs ${b.length} chars, first at ${d.at})`);
  console.log(`--- before: …${d.a.replace(/\n/g, "\\n")}…`);
  console.log(`+++ after:  …${d.b.replace(/\n/g, "\\n")}…`);
}

console.log(
  `\n${files.length} pages: ${same} identical, ${differing.length} differ, ${missing.length} missing in ${dirB}.`,
);
if (differing.length > 0) console.log(`Differ: ${differing.join(", ")}`);
if (missing.length > 0) console.log(`Missing: ${missing.join(", ")}`);
process.exitCode = differing.length + missing.length > 0 ? 1 : 0;
