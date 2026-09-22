// Compares the visible text of two `bench --dump` directories, so two checkouts can be checked
// for showing the same thing to the same user.
//
//   npx tsx scripts/bench/text-diff.ts bench/dumps/before bench/dumps/after
//
// `diff.ts` compares the RSC payload, which is the right tool within one ORM but not across a
// change of ORM: a renamed field (Prisma's `_count: { students }` versus a named count) changes
// the payload while the page still shows the same number. Scripts and styles are stripped, so
// only what the server rendered into the markup is left.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const [dirA, dirB] = process.argv.slice(2);
if (!dirA || !dirB) {
  console.error("Usage: tsx scripts/bench/text-diff.ts <dumpDirBefore> <dumpDirAfter>");
  process.exit(1);
}

/** The rendered markup as text: no scripts, no styles, no tags, one space between words. */
function visibleText(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#\d+|[a-z]+);/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Wall-clock text that moves between two runs of the same data. */
function normalize(text: string) {
  return text
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\s?(AM|PM|am|pm)?\b/g, "TIME")
    .replace(/\b\d+ (seconds?|minutes?|hours?) ago\b/g, "AGO");
}

const files = readdirSync(dirA)
  .filter((f) => f.endsWith(".html"))
  .toSorted();
let identical = 0;
const differing: string[] = [];
const missing: string[] = [];

for (const file of files) {
  const other = path.join(dirB, file);
  if (!existsSync(other)) {
    missing.push(file);
    continue;
  }
  const a = normalize(visibleText(readFileSync(path.join(dirA, file), "utf8")));
  const b = normalize(visibleText(readFileSync(other, "utf8")));
  if (a === b) {
    identical++;
    continue;
  }
  differing.push(file);
  let i = 0;
  while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
  console.log(`\n## ${file} differs (${a.length} vs ${b.length} chars, first at ${i})`);
  console.log(`--- before: …${a.slice(Math.max(0, i - 100), i + 200)}…`);
  console.log(`+++ after:  …${b.slice(Math.max(0, i - 100), i + 200)}…`);
}

console.log(
  `\n${files.length} pages: ${identical} show identical text, ${differing.length} differ, ${missing.length} missing in ${dirB}.`,
);
if (differing.length > 0) console.log(`Differ: ${differing.join(", ")}`);
if (missing.length > 0) console.log(`Missing: ${missing.join(", ")}`);
process.exitCode = differing.length + missing.length > 0 ? 1 : 0;
