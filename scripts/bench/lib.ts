import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const RESULTS_DIR = path.join(process.cwd(), "bench", "results");

export type Stat = { p50: number; p95: number };

export function percentiles(samples: number[]): Stat {
  const sorted = samples.toSorted((a, b) => a - b);
  const at = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))] ?? 0;
  return { p50: round(at(0.5)), p95: round(at(0.95)) };
}

export function round(n: number) {
  return Math.round(n * 10) / 10;
}

function packageVersion(name: string) {
  const file = path.join(process.cwd(), "node_modules", name, "package.json");
  return existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as { version: string }).version
    : null;
}

/** Which ORM this checkout runs on, read from what is installed. */
export function ormLabel() {
  const drizzle = packageVersion("drizzle-orm");
  return drizzle ? `drizzle-orm ${drizzle}` : "unknown";
}

export function meta(label: string, extra: Record<string, unknown> = {}) {
  return {
    label,
    date: new Date().toISOString(),
    gitSha: execSync("git rev-parse --short HEAD").toString().trim(),
    node: process.version,
    next: packageVersion("next"),
    orm: ormLabel(),
    ...extra,
  };
}

/** `bench/results/<label>.json`; a value containing a slash is treated as a path. */
export function resultPath(labelOrPath: string) {
  if (labelOrPath.includes("/")) return path.resolve(labelOrPath);
  mkdirSync(RESULTS_DIR, { recursive: true });
  return path.join(RESULTS_DIR, `${labelOrPath}.json`);
}

export function readResult<T>(labelOrPath: string): T {
  return JSON.parse(readFileSync(resultPath(labelOrPath), "utf8")) as T;
}

export function ms(n: number) {
  return `${Math.round(n)} ms`;
}
