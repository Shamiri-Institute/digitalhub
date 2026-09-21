// Page benchmark: requests every platform page as each role against a running
// production server and records TTFB and full-body time per page.
//
//   npm run build && npm start            (in another terminal)
//   npm run bench -- --label prisma-baseline [--runs 20] [--warmup 3] [--base-url http://localhost:3000] [--dump DIR]
//
// --dump saves each page's first response body to DIR so two runs can be compared with
// `npm run bench:diff -- DIR_A DIR_B` to prove the rendered data did not change.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { createSession } from "#/lib/auth/session";
import { close } from "./db";
import { meta, ms, percentiles, resultPath, type Stat } from "./lib";
import { type Role, type Route, resolveRoutes } from "./routes";

export type PageResult = Route & {
  status: number;
  /** Set for index pages that only redirect (e.g. `/hc` → `/hc/schedule`); not a failure. */
  redirectTo?: string;
  bytes: number;
  ttfb: Stat;
  total: Stat;
};

export type BenchResult = {
  meta: ReturnType<typeof meta> & { baseUrl: string; runs: number; warmup: number };
  users: Record<Role, string>;
  pages: PageResult[];
};

const { values: args } = parseArgs({
  options: {
    label: { type: "string" },
    runs: { type: "string", default: "20" },
    warmup: { type: "string", default: "3" },
    "base-url": { type: "string", default: "http://localhost:3000" },
    dump: { type: "string" },
  },
});

if (!args.label) {
  console.error("Usage: npm run bench -- --label <name> [--runs 20] [--warmup 3] [--base-url URL]");
  process.exit(1);
}
const label = args.label;
const runs = Number(args.runs);
const warmup = Number(args.warmup);
const baseUrl = (args["base-url"] ?? "http://localhost:3000").replace(/\/$/, "");
const dumpDir = args.dump ? path.resolve(args.dump) : null;
if (dumpDir) mkdirSync(dumpDir, { recursive: true });

/** Stable file name for a page dump: `HUB_COORDINATOR__hc_schools_ABC_students.html`. */
export function dumpFileName(route: Route) {
  return `${route.role}__${route.path.replace(/^\//, "").replace(/[^A-Za-z0-9]+/g, "_")}.html`;
}

async function measure(url: string, cookie: string) {
  const start = performance.now();
  const res = await fetch(url, { headers: { cookie }, redirect: "manual" });
  const ttfb = performance.now() - start;
  const body = await res.text();
  return {
    status: res.status,
    location: res.headers.get("location"),
    body,
    bytes: body.length,
    ttfb,
    total: performance.now() - start,
  };
}

async function benchPage(route: Route, cookie: string): Promise<PageResult> {
  const url = `${baseUrl}${route.path}`;
  const first = await measure(url, cookie);
  if (dumpDir && first.status === 200) {
    writeFileSync(path.join(dumpDir, dumpFileName(route)), first.body);
  }
  if (first.status !== 200) {
    const redirectTo =
      first.location && !first.location.includes("/login") ? first.location : undefined;
    return {
      ...route,
      status: first.status,
      redirectTo,
      bytes: first.bytes,
      ttfb: { p50: 0, p95: 0 },
      total: { p50: 0, p95: 0 },
    };
  }
  for (let i = 1; i < warmup; i++) await measure(url, cookie);
  const ttfb: number[] = [];
  const total: number[] = [];
  for (let i = 0; i < runs; i++) {
    const sample = await measure(url, cookie);
    ttfb.push(sample.ttfb);
    total.push(sample.total);
  }
  return {
    ...route,
    status: 200,
    bytes: first.bytes,
    ttfb: percentiles(ttfb),
    total: percentiles(total),
  };
}

async function main() {
  try {
    await bench();
  } finally {
    await close();
  }
}

async function bench() {
  const { users, routes } = await resolveRoutes();
  const cookieName = baseUrl.startsWith("https://")
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
  const cookies = {} as Record<Role, string>;
  for (const [role, user] of Object.entries(users) as [Role, (typeof users)[Role]][]) {
    const session = await createSession(user.id);
    cookies[role] = `${cookieName}=${session.value}`;
  }

  const pages: PageResult[] = [];
  for (const route of routes) {
    const result = await benchPage(route, cookies[route.role]);
    pages.push(result);
    const line =
      result.status === 200
        ? `ttfb ${ms(result.ttfb.p50)}  total ${ms(result.total.p50)} (p95 ${ms(result.total.p95)})`
        : result.redirectTo
          ? `redirect → ${result.redirectTo}`
          : `HTTP ${result.status}`;
    console.log(`${result.path.padEnd(64)} ${line}`);
  }

  const result: BenchResult = {
    meta: { ...meta(label), baseUrl, runs, warmup },
    users: Object.fromEntries(Object.entries(users).map(([r, u]) => [r, u.email])) as Record<
      Role,
      string
    >,
    pages,
  };
  const file = resultPath(label);
  writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`);

  const measured = pages.filter((p) => p.status === 200);
  const redirects = pages.filter((p) => p.redirectTo);
  const failed = pages.filter((p) => p.status !== 200 && !p.redirectTo);
  const sum = measured.reduce((acc, p) => acc + p.total.p50, 0);
  console.log(
    `\n${measured.length} pages measured (sum of p50 totals ${ms(sum)}), ${redirects.length} redirect-only, ${failed.length} failed → ${file}`,
  );
  if (failed.length > 0) {
    for (const p of failed) console.error(`  ${p.role} ${p.path}: HTTP ${p.status}`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
