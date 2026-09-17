// usage: npx dotenv -c development -- npx tsx capture-memo.mts <label>
// Text-extracts the pages whose components lost useMemo/useCallback, plus one interaction each.
import { chromium, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { sessionCookie } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/lib/auth/session";
import { generateSessionToken } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/tests/helpers";

const [label] = process.argv.slice(2);
const out = `/private/tmp/claude-501/-Users-shadracklilan-Workdir-institute-digitalhub-frontend/7d36f958-aa69-467e-968e-e46f88c181e4/scratchpad/bench/out/memo-${label}`;
mkdirSync(out, { recursive: true });
const base = "http://localhost:3001";
const browser = await chromium.launch();
const results: Record<string, unknown> = {};
const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").replace(/\d+d \d+h \d+m \d+s/g, "<countdown>").trim();

async function login(email: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: sessionCookie().name, value: await generateSessionToken(email), domain: "localhost", path: "/" }]);
  return ctx;
}
async function mainText(page: Page) {
  await page.waitForTimeout(800);
  const el = (await page.locator("main").count()) ? page.locator("main") : page.locator("body");
  return norm(await el.textContent()).replace(/\d+ Issues?/g, "");
}

const pages: [string, string, string][] = [
  ["martin.odegaard@test.com", "/sc/fellows", "sc-fellows"],
  ["martin.odegaard@test.com", "/sc/triage", "sc-triage"],
  ["martin.odegaard@test.com", "/sc/students", "sc-students"],
  ["martin.odegaard@test.com", "/sc/schedule?mode=table", "sc-schedule-table"],
  ["martin.odegaard@test.com", "/sc/tickets", "sc-tickets"],
  ["mikel.arteta@test.com", "/hc/supervisors", "hc-supervisors"],
  ["mikel.arteta@test.com", "/hc/schools/ARSENAL_SCH/sessions", "hc-school-sessions"],
];
for (const [email, path, key] of pages) {
  const ctx = await login(email); const page = await ctx.newPage();
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  results[key] = await mainText(page);
  await page.screenshot({ path: `${out}/${key}.png` });
  await ctx.close();
}
// interaction: expand a fellow row and open the group students dialog (fellow-schools-datatable memo removals)
{
  const ctx = await login("martin.odegaard@test.com"); const page = await ctx.newPage();
  await page.goto(`${base}/sc/fellows`, { waitUntil: "networkidle" });
  const row = page.locator("table tbody tr").first();
  await row.locator("td").first().click();
  const sub = page.locator("table table tbody tr").first(); await sub.waitFor();
  await sub.hover(); await sub.locator("svg").last().click();
  await page.getByText("View students in group", { exact: true }).click();
  await page.getByRole("dialog").waitFor();
  results.groupStudentsDialog = norm(await page.getByRole("dialog").textContent()).slice(0, 600);
  await page.screenshot({ path: `${out}/dialog-group-students.png` });
  await ctx.close();
}
writeFileSync(`${out}/metrics.json`, JSON.stringify(results, null, 2));
console.log(Object.keys(results).map((k) => `${k}:${String(results[k]).length}`).join(" "));
await browser.close();
