// Picks the spec files for one CI shard so every shard gets about the same measured run time.
//   bun scripts/ci/e2e-shard.ts <shard> <total>       prints the shard's spec files, one per line
//                                                     (only those in E2E_SPECS, when it is set)
//   bun scripts/ci/e2e-shard.ts --record <report.json>  rewrites durations from a Playwright JSON report
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const durationsFile = path.join(import.meta.dirname, "e2e-durations.json");
const specDir = "tests/e2e";

type Durations = Record<string, number>;

function specFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return specFiles(full);
    return entry.name.endsWith(".spec.ts") ? [full] : [];
  });
}

type ReportSuite = {
  file: string;
  specs: { tests: { results: { duration: number }[] }[] }[];
  suites?: ReportSuite[];
};

function record(reportPath: string) {
  const report = JSON.parse(readFileSync(reportPath, "utf8")) as { suites: ReportSuite[] };
  const msBySpec: Durations = {};
  const visit = (suite: ReportSuite) => {
    const spec = path.join(specDir, suite.file);
    for (const { tests } of suite.specs)
      for (const { results } of tests)
        for (const { duration } of results) msBySpec[spec] = (msBySpec[spec] ?? 0) + duration;
    suite.suites?.forEach(visit);
  };
  report.suites.forEach(visit);
  const sorted = Object.fromEntries(
    Object.entries(msBySpec).toSorted(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(durationsFile, `${JSON.stringify(sorted, null, 2)}\n`);
}

function shard(index: number, total: number) {
  const recorded = JSON.parse(readFileSync(durationsFile, "utf8")) as Durations;
  const known = Object.values(recorded).toSorted((a, b) => a - b);
  // A spec added since the last recording counts as a typical one until it is measured.
  const typical = known[Math.floor(known.length / 2)] ?? 1;
  const selected = process.env.E2E_SPECS?.split(/\s+/).filter(Boolean);
  const specs = (selected ?? specFiles(specDir))
    .map((spec) => ({ spec, ms: recorded[spec] ?? typical }))
    .toSorted((a, b) => b.ms - a.ms || a.spec.localeCompare(b.spec));
  const shards = Array.from({ length: total }, () => ({ ms: 0, specs: [] as string[] }));
  for (const { spec, ms } of specs) {
    const lightest = shards.reduce((min, s) => (s.ms < min.ms ? s : min));
    lightest.specs.push(spec);
    lightest.ms += ms;
  }
  const mine = shards[index - 1];
  if (!mine) throw new Error(`shard ${index} is outside 1..${total}`);
  console.log(mine.specs.toSorted().join("\n"));
}

const [first, second] = process.argv.slice(2);
if (first === "--record" && second) record(second);
else if (first && second) shard(Number(first), Number(second));
else throw new Error("usage: e2e-shard.ts <shard> <total> | --record <report.json>");
