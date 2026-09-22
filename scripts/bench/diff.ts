// Compares two `bench --dump` directories page by page after removing build-specific noise,
// so a query conversion can be checked for rendering the same data.
//   npm run bench:diff -- bench/dumps/before bench/dumps/after
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
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
      // Chunk file names embed content hashes and change whenever a client component changes.
      .replace(/\/_next\/static\/BUILD\/[A-Za-z0-9_-]+\.js/g, "/_next/static/BUILD/CHUNK.js")
      // Stylesheet names embed a content hash too, and change whenever any class does.
      .replace(/\/_next\/static\/BUILD\/[A-Za-z0-9_-]+\.css/g, "/_next/static/BUILD/CHUNK.css")
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

/** JSON with object keys sorted, so column order (Prisma schema order vs table order) does not matter. */
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .toSorted()
        .map((k) => [k, stable((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

/**
 * The RSC flight payload carries the whole server-rendered tree, so it is compared on its own:
 * the HTML is a render of the same data whose shape depends on which Suspense boundaries had
 * resolved when the shell flushed. Rows are sorted (row numbering follows resolution order),
 * row ids, module references and script chunk rows are dropped, and JSON keys are sorted.
 */
/** Like `stable`, but also sorts arrays: order of to-many relations is unspecified in both ORMs. */
function unordered(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map(unordered)
      .toSorted((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .toSorted()
        .map((k) => [k, unordered((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

/**
 * The flight encoder writes an object once and refers back to it (`"$1b:props:sessions:0:school"`)
 * when the same instance appears again, so a query that shares one row object across results
 * serializes differently from one that repeats equal copies. Inline such references so both
 * compare as the same data. Elements are `["$", type, key, props]`, so `props` maps to index 3.
 */
function resolveRefs(value: unknown, rows: Map<string, unknown>, depth = 0): unknown {
  if (depth > 50) return value;
  if (typeof value === "string") {
    const m = /^\$([0-9a-f]+)((?::[^:]+)*)$/.exec(value);
    const [, rowId, pathPart] = m ?? [];
    if (rowId === undefined) return value;
    let target = rows.get(rowId);
    if (target === undefined) return value;
    for (const segment of (pathPart ?? "").split(":").filter(Boolean)) {
      if (Array.isArray(target) && target[0] === "$" && segment === "props") {
        target = target[3];
      } else if (target && typeof target === "object") {
        target = (target as Record<string, unknown>)[segment];
      } else {
        return value;
      }
      if (target === undefined) return value;
    }
    return resolveRefs(target, rows, depth + 1);
  }
  if (Array.isArray(value)) return value.map((v) => resolveRefs(v, rows, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, resolveRefs(v, rows, depth + 1)]),
    );
  }
  return value;
}

function canonical(html: string, arrayOrder: "keep" | "ignore" = "keep") {
  const shape = arrayOrder === "keep" ? stable : unordered;
  const parsed = new Map<string, unknown>();
  const others: string[] = [];
  for (const payload of flightPayloads(html)) {
    for (const row of payload.split("\n")) {
      const m = /^([0-9a-f]+):([\s\S]*)$/.exec(row);
      const id = m?.[1] ?? "";
      const body = m?.[2] ?? row;
      if (!body || body.startsWith("I[") || body.startsWith("HL[")) continue;
      if (body.startsWith("[") || body.startsWith("{")) {
        try {
          parsed.set(id, JSON.parse(body));
          continue;
        } catch {
          // text chunks and partial rows stay as they are
        }
      }
      others.push(body);
    }
  }
  const flightRows = others;
  for (const value of parsed.values()) {
    const body = JSON.stringify(shape(resolveRefs(value, parsed)));
    if (/^\["\$","script","script-\d+"/.test(body)) continue;
    flightRows.push(body);
  }
  return flightRows
    .map((r) => r.replace(/\$L?[0-9a-f]+\b/g, "$REF"))
    .toSorted()
    .join("\n");
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
const sameUpToArrayOrder: string[] = [];
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
  const [ca, cb] = [canonical(a), canonical(b)];
  if (ca === cb) {
    sameAfterReorder++;
    continue;
  }
  if (canonical(a, "ignore") === canonical(b, "ignore")) {
    sameUpToArrayOrder.push(file);
    continue;
  }
  differing.push(file);
  // BENCH_DIFF_OUT=dir writes both canonical forms so `diff` can show the real change.
  if (process.env.BENCH_DIFF_OUT) {
    mkdirSync(process.env.BENCH_DIFF_OUT, { recursive: true });
    writeFileSync(path.join(process.env.BENCH_DIFF_OUT, `${file}.before.txt`), ca);
    writeFileSync(path.join(process.env.BENCH_DIFF_OUT, `${file}.after.txt`), cb);
  }
  const d = firstDifference(a, b);
  console.log(`\n## ${file} differs (${a.length} vs ${b.length} chars, first at ${d.at})`);
  console.log(`--- before: …${d.a.replace(/\n/g, "\\n")}…`);
  console.log(`+++ after:  …${d.b.replace(/\n/g, "\\n")}…`);
}

console.log(
  `\n${files.length} pages: ${same} identical, ${sameAfterReorder} identical after streaming reorder, ${sameUpToArrayOrder.length} identical up to relation order, ${differing.length} differ, ${missing.length} missing in ${dirB}.`,
);
if (sameUpToArrayOrder.length > 0) {
  console.log(`Same rows, different to-many order: ${sameUpToArrayOrder.join(", ")}`);
}
if (differing.length > 0) console.log(`Differ: ${differing.join(", ")}`);
if (missing.length > 0) console.log(`Missing: ${missing.join(", ")}`);
process.exitCode = differing.length + missing.length > 0 ? 1 : 0;
