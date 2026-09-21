// Prints a markdown comparison of two `bench` runs, worst regression first.
//   npm run bench:compare -- prisma-baseline drizzle-auth
import { ms, readResult, round } from "./lib";
import type { BenchResult, PageResult } from "./run";

// Two runs of identical code differ by up to ±12% on pages that render in 10–30 ms
// (measured 2026-09-21), so a page is flagged only when both the relative and the absolute
// change are beyond that jitter. The aggregate lines at the bottom are the primary signal.
const THRESHOLD_PCT = 10;
const THRESHOLD_MS = 5;

const [beforeArg, afterArg] = process.argv.slice(2);
if (!beforeArg || !afterArg) {
  console.error("Usage: npm run bench:compare -- <before-label|path> <after-label|path>");
  process.exit(1);
}

const before = readResult<BenchResult>(beforeArg);
const after = readResult<BenchResult>(afterArg);

const key = (p: PageResult) => `${p.role} ${p.path}`;
const afterByKey = new Map(after.pages.map((p) => [key(p), p]));

type Row = { page: PageResult; other: PageResult; delta: number };
const rows: Row[] = [];
const missing: string[] = [];
for (const page of before.pages) {
  if (page.redirectTo) continue;
  const other = afterByKey.get(key(page));
  if (!other || page.status !== 200 || other.status !== 200) {
    missing.push(key(page));
    continue;
  }
  rows.push({
    page,
    other,
    delta: round(((other.total.p50 - page.total.p50) / page.total.p50) * 100),
  });
}
rows.sort((a, b) => b.delta - a.delta);

const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
const describe = (r: BenchResult) =>
  `\`${r.meta.label}\` (${r.meta.orm}, ${r.meta.gitSha}, ${r.meta.runs} runs)`;

console.log(`Before: ${describe(before)}\nAfter: ${describe(after)}\n`);
console.log("| Page | Role | Before p50 | After p50 | Δ p50 | Before p95 | After p95 | |");
console.log("| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |");
const beyondJitter = (r: Row) =>
  Math.abs(r.delta) > THRESHOLD_PCT &&
  Math.abs(r.other.total.p50 - r.page.total.p50) > THRESHOLD_MS;
for (const r of rows) {
  const { page, other, delta } = r;
  const flag = !beyondJitter(r) ? "" : delta > 0 ? "⚠ slower" : "✓ faster";
  console.log(
    `| ${page.path} | ${page.role} | ${ms(page.total.p50)} | ${ms(other.total.p50)} | ${pct(delta)} | ${ms(page.total.p95)} | ${ms(other.total.p95)} | ${flag} |`,
  );
}

const deltas = rows.map((r) => r.delta).toSorted((a, b) => a - b);
const median = deltas[Math.floor(deltas.length / 2)] ?? 0;
const sumBefore = rows.reduce((acc, r) => acc + r.page.total.p50, 0);
const sumAfter = rows.reduce((acc, r) => acc + r.other.total.p50, 0);
console.log(
  `\n${rows.length} pages compared. Median Δ p50 ${pct(median)}. Sum of p50 ${ms(sumBefore)} → ${ms(sumAfter)} (${pct(round(((sumAfter - sumBefore) / sumBefore) * 100))}).`,
);
console.log(
  `Beyond jitter (>${THRESHOLD_PCT}% and >${THRESHOLD_MS} ms): ${rows.filter((r) => beyondJitter(r) && r.delta > 0).length} slower, ${rows.filter((r) => beyondJitter(r) && r.delta < 0).length} faster.`,
);
if (missing.length > 0)
  console.log(`Not compared (missing or non-200 in one run): ${missing.join(", ")}`);
