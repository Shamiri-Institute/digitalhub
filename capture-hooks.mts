// usage: npx dotenv -c development -- npx tsx capture-hooks.mts <label>
import { chromium, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { sessionCookie } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/lib/auth/session";
import { generateSessionToken } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/tests/helpers";

const [label] = process.argv.slice(2);
const out = `/private/tmp/claude-501/-Users-shadracklilan-Workdir-institute-digitalhub-frontend/7d36f958-aa69-467e-968e-e46f88c181e4/scratchpad/bench/out/hooks-${label}`;
mkdirSync(out, { recursive: true });
const base = "http://localhost:3001";
const browser = await chromium.launch();
const results: Record<string, unknown> = {};

async function login(email: string) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: out, size: { width: 1440, height: 900 } } });
  await context.addCookies([{ name: sessionCookie().name, value: await generateSessionToken(email), domain: "localhost", path: "/" }]);
  return context;
}
async function rowMenu(page: Page, rowText: string, item: string) {
  const row = page.locator("table tbody tr").filter({ hasText: rowText }).first();
  await row.hover();
  await row.locator("svg").last().click();
  await page.getByText(item, { exact: true }).click();
}
async function dialogState(page: Page) {
  const dialog = page.getByRole("dialog");
  await page.waitForTimeout(700);
  const fields: Record<string, string> = {};
  for (const el of await dialog.locator("input[name], textarea[name], [role=combobox]").all()) {
    const name = (await el.getAttribute("name")) ?? `combobox:${(await el.textContent())?.trim().slice(0, 40)}`;
    fields[name] = (await el.inputValue().catch(async () => (await el.textContent()) ?? "")).trim();
  }
  const countdown = (await dialog.getByText(/\d+d \d+h \d+m \d+s/).first().textContent().catch(() => "")) ?? "";
  const disabledInputs = await dialog.locator("input:disabled, textarea:disabled, button:disabled").count();
  return { fields, countdown: countdown.replace(/\d+s/, "Ns"), disabledInputs, text: (await dialog.textContent())?.replace(/\s+/g, " ").slice(0, 400) };
}

// 1. HC: monthly supervisor evaluation with an existing evaluation (bench_msev_1)
{
  const ctx = await login("mikel.arteta@test.com"); const page = await ctx.newPage();
  await page.goto(`${base}/hc/supervisors`, { waitUntil: "networkidle" });
  await page.goto(`${base}/hc/supervisors`, { waitUntil: "networkidle" });
  await rowMenu(page, "Declan Rice", "Monthly supervisor evaluation");
  await page.getByRole("heading", { name: /supervisor evaluation/i }).waitFor();
  results.monthlyOpened = await dialogState(page);
  await page.getByRole("dialog").getByRole("combobox").first().click();
  await page.getByRole("option").filter({ hasText: /Aug 2026/ }).first().click();
  results.monthlySelected = await dialogState(page);
  await page.screenshot({ path: `${out}/01-monthly-evaluation.png` });
  await ctx.close();
}
// 2. HC: weekly fellow evaluation with an existing rating (bench_wfr_1)
{
  const ctx = await login("mikel.arteta@test.com"); const page = await ctx.newPage();
  await page.goto(`${base}/hc/fellows`, { waitUntil: "networkidle" });
  await rowMenu(page, "Bukayo Saka", "View weekly fellow evaluation");
  await page.getByRole("heading", { name: /weekly fellow evaluation/i }).waitFor();
  results.weeklyOpened = await dialogState(page);
  await page.screenshot({ path: `${out}/02-weekly-evaluation.png` });
  await ctx.close();
}
// 3. SC: schedule list view labels (session-list derived labels)
{
  const ctx = await login("martin.odegaard@test.com"); const page = await ctx.newPage();
  await page.goto(`${base}/sc/schedule?mode=list`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const labels = (await page.locator("main").textContent())?.replace(/\s+/g, " ") ?? "";
  results.listView = { hasTimes: (labels.match(/\d{1,2}:\d{2}(am|pm)/gi) ?? []).slice(0, 6), sample: labels.slice(0, 300) };
  await page.screenshot({ path: `${out}/03-schedule-list.png` });
  await ctx.close();
}
writeFileSync(`${out}/metrics.json`, JSON.stringify(results, null, 2));
// 4. HC: weekly session report with an existing rating (bench_isr_1), from the schedule list view
{
  const ctx = await login("mikel.arteta@test.com"); const page = await ctx.newPage();
  await page.goto(`${base}/hc/schools/ARSENAL_SCH/sessions`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const row = page.locator("table tbody tr").filter({ hasText: /Pre|08 Sep|2026-09-08|08\/09\/2026/ }).first();
  await row.hover();
  await row.locator("svg").last().click();
  await page.getByText("Weekly session report", { exact: true }).click();
  await page.getByRole("heading", { name: /weekly session report/i }).waitFor();
  results.sessionReport = await dialogState(page);
  await page.screenshot({ path: `${out}/04-session-report.png` });
  await ctx.close();
}
writeFileSync(`${out}/metrics.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
await browser.close();
