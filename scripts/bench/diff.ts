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
  return (
    html
      .replace(/\/_next\/static\/[A-Za-z0-9_-]+\//g, "/_next/static/BUILD/")
      .replace(/"buildId":"[^"]+"/g, '"buildId":"BUILD"')
      // The build id also travels inside the RSC payload as `"b":"<id>"` (JSON-escaped quotes).
      .replace(/\\"b\\":\\"[A-Za-z0-9_-]{15,}\\"/g, '\\"b\\":\\"BUILD\\"')
      .replace(/\?dpl=[A-Za-z0-9_-]+/g, "")
      .replace(/nonce="[^"]+"/g, 'nonce=""')
      // Sentry injects a fresh trace id and baggage per request.
      .replace(
        /<meta name="sentry-trace" content="[^"]*"\/>/g,
        '<meta name="sentry-trace" content=""/>',
      )
      .replace(/<meta name="baggage" content="[^"]*"\/>/g, '<meta name="baggage" content=""/>')
      .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\b/g, (iso) =>
        // Session expiry and "now" style timestamps move between runs; keep the date only.
        iso.slice(0, 10),
      )
  );
}

/**
 * React streams Suspense boundaries in whatever order they resolve, so two renders of the same
 * data can differ in chunk order and in RSC row numbering. This reduces a page to an
 * order-independent form: sorted flight rows with row ids and module references removed, plus
 * sorted streamed HTML segments.
 */
/** The JSON string literals pushed to `self.__next_f`; scanned by hand, a regex overflows on 5 MB pages. */
function flightPayloads(html: string) {
  const open = 'self.__next_f.push([1,"';
  const payloads: string[] = [];
  let pos = html.indexOf(open);
  while (pos !== -1) {
    const start = pos + open.length;
    let end = start;
    for (;;) {
      end = html.indexOf('"])', end);
      if (end === -1) return payloads;
      // An even number of backslashes before the quote means it is not escaped.
      let backslashes = 0;
      for (let i = end - 1; i >= start && html[i] === "\\"; i--) backslashes++;
      if (backslashes % 2 === 0) break;
      end++;
    }
    payloads.push(JSON.parse(`"${html.slice(start, end)}"`) as string);
    pos = html.indexOf(open, end);
  }
  return payloads;
}

function canonical(html: string) {
  const flightRows: string[] = [];
  for (const payload of flightPayloads(html)) {
    for (const row of payload.split("\n")) {
      const body = row.replace(/^[0-9a-f]+:/, "");
      if (!body || body.startsWith("I[") || body.startsWith("HL[")) continue;
      flightRows.push(body.replace(/\$L?[0-9a-f]+\b/g, "$REF"));
    }
  }
  const markup = html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/\b(id|hidden id)="(S|B|P):\d+"/g, '$1="$2:N"')
    .replace(/\$RC\("B:\d+","S:\d+"\)/g, "$RC()");
  const segments = markup.split(/(?=<div hidden id="S:N">)/).toSorted();
  return `${segments.join("\n")}\n${flightRows.toSorted().join("\n")}`;
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
let sameAfterReorder = 0;
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
  if (canonical(a) === canonical(b)) {
    sameAfterReorder++;
    continue;
  }
  differing.push(file);
  const d = firstDifference(a, b);
  console.log(`\n## ${file} differs (${a.length} vs ${b.length} chars, first at ${d.at})`);
  console.log(`--- before: …${d.a.replace(/\n/g, "\\n")}…`);
  console.log(`+++ after:  …${d.b.replace(/\n/g, "\\n")}…`);
}

console.log(
  `\n${files.length} pages: ${same} identical, ${sameAfterReorder} identical after streaming reorder, ${differing.length} differ, ${missing.length} missing in ${dirB}.`,
);
if (differing.length > 0) console.log(`Differ: ${differing.join(", ")}`);
if (missing.length > 0) console.log(`Missing: ${missing.join(", ")}`);
process.exitCode = differing.length + missing.length > 0 ? 1 : 0;
