// Cold-start proxy: fresh Node processes that import the DB client and run one
// query, plus the on-disk size of the ORM and the server build.
//   npm run bench:cold -- --label prisma-cold [--runs 10]
import { execSync, spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { meta, ms, percentiles, resultPath } from "./lib";

const { values: args } = parseArgs({
  options: { label: { type: "string" }, runs: { type: "string", default: "10" } },
});
if (!args.label) {
  console.error("Usage: npm run bench:cold -- --label <name> [--runs 10]");
  process.exit(1);
}
const runs = Number(args.runs);
const child = path.join(__dirname, "cold-child.ts");

const wall: number[] = [];
const importMs: number[] = [];
const firstQueryMs: number[] = [];
for (let i = 0; i < runs; i++) {
  const start = performance.now();
  const proc = spawnSync(process.execPath, ["--import", "tsx", child], {
    encoding: "utf8",
    env: process.env,
  });
  wall.push(performance.now() - start);
  if (proc.status !== 0) {
    console.error(proc.stderr);
    process.exit(1);
  }
  const lastLine = proc.stdout.trim().split("\n").at(-1) ?? "{}";
  const sample = JSON.parse(lastLine) as { importMs: number; firstQueryMs: number };
  importMs.push(sample.importMs);
  firstQueryMs.push(sample.firstQueryMs);
}

function sizeKb(rel: string) {
  return Number(execSync(`du -sk "${rel}"`).toString().split("\t")[0]);
}
const sizesKb: Record<string, number> = {};
for (const p of [
  "node_modules/@prisma",
  "node_modules/.prisma",
  "node_modules/prisma",
  "node_modules/drizzle-orm",
  "node_modules/drizzle-kit",
  "node_modules/pg",
  ".next/server",
]) {
  if (existsSync(p)) sizesKb[p] = sizeKb(p);
}

const result = {
  meta: { ...meta(args.label), runs },
  processWallMs: percentiles(wall),
  importMs: percentiles(importMs),
  firstQueryMs: percentiles(firstQueryMs),
  sizesKb,
};
const file = resultPath(args.label);
writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`);

console.log(
  `process wall p50 ${ms(result.processWallMs.p50)}, import p50 ${ms(result.importMs.p50)}, first query p50 ${ms(result.firstQueryMs.p50)}`,
);
for (const [p, kb] of Object.entries(sizesKb))
  console.log(`${p.padEnd(28)} ${(kb / 1024).toFixed(1)} MB`);
console.log(`→ ${file}`);
