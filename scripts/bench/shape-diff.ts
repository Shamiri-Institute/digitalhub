// Compares the data inside the React Server Components payload of two `bench --dump` directories,
// independently of the field names that carry it.
//
//   npx tsx scripts/bench/shape-diff.ts bench/dumps/before bench/dumps/after
//
// `text-diff.ts` proves the two sides show the same text, but text only covers what the server
// rendered into the markup. A field that a client component reads after hydration never appears
// there. This compares the payload itself in two ways:
//
//   values  every scalar leaf, as a multiset. A dropped field, a lost row or a changed type
//           shows up here. A renamed field does not.
//   keys    every object key, as a multiset. A rename shows up here and nowhere else, so the
//           two lists together separate "the data changed" from "the field is called something
//           else now".
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const [dirA, dirB] = process.argv.slice(2);
if (!dirA || !dirB) {
  console.error("Usage: tsx scripts/bench/shape-diff.ts <dumpDirBefore> <dumpDirAfter>");
  process.exit(1);
}

/** The JSON string literals pushed to `self.__next_f`; scanned by hand, a regex overflows. */
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

/** Build-specific or request-specific scalars that legitimately move between two runs. */
const NOISE =
  /^(\$|\/_next\/|nonce|sentry|baggage|script(-\d+)?$|true$|false$|null$)|\.(js|css)$|^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}|^[A-Za-z0-9_-]{20,}$/;

type Counts = Map<string, number>;
function bump(counts: Counts, key: string) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

/**
 * The flight protocol writes a BigInt as `$n123`. A payload built elsewhere may carry a count as
 * a BigInt where this one carries a Number. Compare them by the digits, and count the markers
 * separately, so the number is checked and the change of type is still reported.
 */
function collect(value: unknown, values: Counts, keys: Counts, bigints: Counts, depth = 0) {
  if (depth > 60) return;
  if (Array.isArray(value)) {
    for (const item of value) collect(item, values, keys, bigints, depth + 1);
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      bump(keys, k);
      collect(v, values, keys, bigints, depth + 1);
    }
    return;
  }
  let scalar = String(value);
  const asBigInt = /^\$n(\d+)$/.exec(scalar);
  if (asBigInt?.[1]) {
    scalar = asBigInt[1];
    bump(bigints, scalar);
  } else if (scalar === "" || NOISE.test(scalar)) return;
  bump(values, scalar);
}

function read(file: string) {
  const values: Counts = new Map();
  const keys: Counts = new Map();
  const bigints: Counts = new Map();
  for (const payload of flightPayloads(readFileSync(file, "utf8"))) {
    for (const row of payload.split("\n")) {
      const body = /^[0-9a-f]+:([\s\S]*)$/.exec(row)?.[1] ?? row;
      if (!body || body.startsWith("I[") || body.startsWith("HL[")) continue;
      if (!body.startsWith("[") && !body.startsWith("{")) continue;
      try {
        collect(JSON.parse(body), values, keys, bigints);
      } catch {
        // partial rows split across pushes; the next push carries the rest
      }
    }
  }
  return { values, keys, bigints };
}

/**
 * Splits the entries of `a` that `b` does not match into the two cases that mean different
 * things. `absent` is a value `b` never carries, which is information that disappeared. `fewer`
 * is a value `b` still carries but fewer times, which is a repeated copy that went away: the
 * mark of an over-fetch that no longer loads the same row under every parent.
 */
function surplus(a: Counts, b: Counts) {
  const absent: string[] = [];
  const fewer: string[] = [];
  for (const [k, n] of a) {
    const m = b.get(k) ?? 0;
    if (m === 0) absent.push(k);
    else if (n > m) fewer.push(`${k} (${n} to ${m})`);
  }
  return { absent: absent.toSorted(), fewer: fewer.toSorted() };
}

const files = readdirSync(dirA)
  .filter((f) => f.endsWith(".html"))
  .toSorted();
let sameData = 0;
let sameKeys = 0;
let bigIntsBefore = 0;
let bigIntsAfter = 0;
const dataDiffs: string[] = [];
const deduped: string[] = [];
const renamedKeys = new Map<string, number>();

for (const file of files) {
  const other = path.join(dirB, file);
  if (!existsSync(other)) continue;
  const a = read(path.join(dirA, file));
  const b = read(other);

  for (const n of a.bigints.values()) bigIntsBefore += n;
  for (const n of b.bigints.values()) bigIntsAfter += n;

  const lost = surplus(a.values, b.values);
  const gained = surplus(b.values, a.values);
  if (lost.absent.length === 0 && gained.absent.length === 0) {
    sameData++;
    if (lost.fewer.length > 0) deduped.push(file);
  } else {
    dataDiffs.push(file);
    console.log(`\n## ${file}: a value appears on one side only`);
    if (lost.absent.length > 0)
      console.log(`  gone after (${lost.absent.length}): ${lost.absent.slice(0, 15).join(", ")}`);
    if (gained.absent.length > 0)
      console.log(
        `  new after  (${gained.absent.length}): ${gained.absent.slice(0, 15).join(", ")}`,
      );
  }

  const keysLost = surplus(a.keys, b.keys).absent;
  const keysGained = surplus(b.keys, a.keys).absent;
  if (keysLost.length === 0 && keysGained.length === 0) sameKeys++;
  for (const k of [...keysLost, ...keysGained]) {
    renamedKeys.set(k, (renamedKeys.get(k) ?? 0) + 1);
  }
}

console.log(
  `\n${files.length} pages: ${sameData} carry every value both sides carry, ${dataDiffs.length} lose a value. ${sameKeys} also use identical field names.`,
);
console.log(
  `${deduped.length} pages carry a value fewer times, which is a repeated copy that no longer loads.`,
);
console.log(
  `BigInt scalars in the payload: ${bigIntsBefore} before, ${bigIntsAfter} after. A count or a sum that changes from BigInt to Number shows here; the number itself is compared above.`,
);
if (renamedKeys.size > 0) {
  console.log(`\nField names that differ, and the number of pages each appears on:`);
  for (const [k, n] of [...renamedKeys].toSorted((x, y) => y[1] - x[1])) {
    console.log(`  ${k}: ${n}`);
  }
}
if (dataDiffs.length > 0) console.log(`\nData differs: ${dataDiffs.join(", ")}`);
process.exitCode = dataDiffs.length > 0 ? 1 : 0;
