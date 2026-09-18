import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { sessionCookie } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/lib/auth/session";
import { generateSessionToken } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/tests/helpers";
const B = "/private/tmp/claude-501/-Users-shadracklilan-Workdir-institute-digitalhub-frontend/88b3163f-2751-4602-98a3-5dd2a244bc66/scratchpad/bench";
const before = JSON.parse(readFileSync(`${B}/out/crawl-before/results.json`, "utf8"));
const users: Record<string, string> = { admin: "admin@shamiri.institute", sc: "martin.odegaard@test.com", cl: "ben.white@test.com", fel: "bukayo.saka@test.com" };
const keys = ["admin /admin/schools/ARSENAL_SCH/groups", "sc /sc/reporting/fellow-reports/group-report", "sc /sc/reporting/fellow-reports/weekly-fellow-evaluation", "sc /sc/schools/ARSENAL_SCH", "cl /cl", "fel /fel/schools/ARSENAL_SCH/group"];
const norm = (s: string) => s.replace(/\s+/g, " ").replace(/\d+d \d+h \d+m \d+s/g, "<countdown>").replace(/\d+ Issues?/g, "").replace(/\d+ (seconds?|minutes?|hours?) ago/g, "<ago>").trim();
const browser = await chromium.launch();
for (const key of keys) {
  const [role, route] = key.split(" ");
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: sessionCookie().name, value: await generateSessionToken(users[role]), domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();
  const pageErrors: string[] = []; page.on("pageerror", (e) => pageErrors.push(norm(e.message).slice(0, 80)));
  const line: string[] = [];
  for (let i = 0; i < 3; i++) {
    pageErrors.length = 0; const t = Date.now();
    let status: number | null = null; let text = "";
    try { const res = await page.goto(`http://localhost:3001${route}`, { waitUntil: "networkidle", timeout: 60000 }); status = res?.status() ?? null; await page.waitForTimeout(800); text = norm(await page.evaluate(() => document.body.innerText)); } catch (e) { text = "NAV ERROR"; }
    line.push(`${status} ${text === before[key].text ? "same" : "DIFF"} pe=${pageErrors.length} ${Date.now() - t}ms`);
  }
  console.log(`${key}: ${line.join(" | ")}`);
  await ctx.close();
}
await browser.close();
