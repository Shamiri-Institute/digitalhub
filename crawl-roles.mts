// usage: npx dotenv -c development -- npx tsx crawl-roles.mts <label> [limitPerRole]
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { sessionCookie } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/lib/auth/session";
import { generateSessionToken } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/tests/helpers";

const [label, limitArg] = process.argv.slice(2);
const limit = limitArg ? Number(limitArg) : Infinity;
const S = "/private/tmp/claude-501/-Users-shadracklilan-Workdir-institute-digitalhub-frontend/88b3163f-2751-4602-98a3-5dd2a244bc66/scratchpad/bench";
const out = `${S}/out/crawl-${label}`;
mkdirSync(`${out}/shots`, { recursive: true });
const base = "http://localhost:3001";
const users: Record<string, string> = {
  admin: "admin@shamiri.institute", hc: "mikel.arteta@test.com", sc: "martin.odegaard@test.com",
  cl: "ben.white@test.com", ct: "takehiro.tomiyasu@test.com", ops: "benny@shamiri.institute", fel: "bukayo.saka@test.com",
};
const routes = readFileSync(`${S}/routes.txt`, "utf8").trim().split("\n");
const norm = (s: string) => s.replace(/\s+/g, " ").replace(/\d+d \d+h \d+m \d+s/g, "<countdown>").replace(/\d+ Issues?/g, "").replace(/\d+ (seconds?|minutes?|hours?) ago/g, "<ago>").trim();

const browser = await chromium.launch();
const results: Record<string, { status: number | null; text: string; consoleErrors: string[]; pageErrors: string[] }> = {};
for (const [role, email] of Object.entries(users)) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: sessionCookie().name, value: await generateSessionToken(email), domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();
  const consoleErrors: string[] = []; const pageErrors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(norm(m.text()).slice(0, 160)); });
  page.on("pageerror", (e) => pageErrors.push(norm(e.message).slice(0, 160)));
  const roleRoutes = routes.filter((r) => r.split("/")[1] === role).slice(0, limit);
  for (const route of roleRoutes) {
    consoleErrors.length = 0; pageErrors.length = 0;
    let status: number | null = null; let text = "";
    try {
      const res = await page.goto(`${base}${route}`, { waitUntil: "networkidle", timeout: 60000 });
      status = res?.status() ?? null;
      await page.waitForTimeout(800);
      text = norm(await page.evaluate(() => document.body.innerText));
      await page.screenshot({ path: `${out}/shots/${role}${route.replace(/[\/?=]/g, "_")}.png` });
    } catch (e) { text = `NAV ERROR: ${String(e).slice(0, 120)}`; }
    results[`${role} ${route}`] = { status, text, consoleErrors: [...consoleErrors].filter((e) => !/Download the React DevTools|hydrat/i.test(e)), pageErrors: [...pageErrors] };
    process.stdout.write(`${role} ${route} ${status} ${text.length}c ${pageErrors.length}pe\n`);
  }
  await ctx.close();
}
writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
await browser.close();
