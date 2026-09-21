import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { sessionCookie } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/lib/auth/session";
import { generateSessionToken } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/tests/helpers";
const [label] = process.argv.slice(2);
const out = `/private/tmp/claude-501/-Users-shadracklilan-Workdir-institute-digitalhub-frontend/88b3163f-2751-4602-98a3-5dd2a244bc66/scratchpad/bench/out/svg-${label}.json`;
const users: Record<string, string> = { admin: "admin@shamiri.institute", hc: "mikel.arteta@test.com", sc: "martin.odegaard@test.com", cl: "ben.white@test.com", ct: "takehiro.tomiyasu@test.com" };
const routes = ["cl /cl/clinical", "cl /cl", "ct /ct/clinical", "ct /ct", "sc /sc/clinical", "hc /hc/schools", "hc /hc/fellows", "hc /hc/supervisors", "cl /cl/students", "ct /ct/students", "admin /admin/students", "sc /sc/schools/ARSENAL_SCH/students"];
const browser = await chromium.launch();
const results: Record<string, unknown> = {};
for (const key of routes) {
  const [role, route] = key.split(" ");
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: sessionCookie().name, value: await generateSessionToken(users[role]), domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();
  await page.goto(`http://localhost:3001${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  results[key] = await page.evaluate(() => Array.from(document.querySelectorAll(".recharts-pie-sector path, .recharts-sector")).map((p) => ({ fill: p.getAttribute("fill"), d: (p.getAttribute("d") ?? "").replace(/(\d+\.\d{2})\d+/g, "$1") })));
  await ctx.close();
}
writeFileSync(out, JSON.stringify(results, null, 1));
console.log(Object.entries(results).map(([k, v]) => `${k}: ${(v as unknown[]).length} sectors`).join(" | "));
await browser.close();
