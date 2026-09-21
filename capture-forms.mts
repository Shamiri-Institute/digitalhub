// usage: npx dotenv -c development -- npx tsx capture-forms.mts <label>
// Dialogs backed by the effects converted to useEffectEvent in ENG-2144.
import { chromium, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { sessionCookie } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/lib/auth/session";
import { generateSessionToken } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/tests/helpers";

const [label] = process.argv.slice(2);
const out = `/private/tmp/claude-501/-Users-shadracklilan-Workdir-institute-digitalhub-frontend/88b3163f-2751-4602-98a3-5dd2a244bc66/scratchpad/bench/out/forms-${label}`;
mkdirSync(out, { recursive: true });
const base = "http://localhost:3001";
const browser = await chromium.launch();
const results: Record<string, unknown> = {};
const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").replace(/\d+d \d+h \d+m \d+s/g, "<countdown>").trim();

async function login(email: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: sessionCookie().name, value: await generateSessionToken(email), domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(norm(e.message).slice(0, 120)));
  return { ctx, page, pageErrors };
}
async function rowMenu(page: Page, rowText: string | RegExp, item: string) {
  const row = page.locator("table tbody tr").filter({ hasText: rowText }).first();
  await row.hover(); await row.locator("svg").last().click();
  await page.getByText(item, { exact: true }).click();
}
async function dialogState(page: Page) {
  const d = page.getByRole("dialog"); await d.waitFor(); await page.waitForTimeout(700);
  const fields: Record<string, string> = {};
  for (const el of await d.locator("input[name], textarea[name], select[name], [role=combobox]").all()) {
    const name = (await el.getAttribute("name")) ?? `combobox:${norm(await el.textContent()).slice(0, 40)}`;
    fields[name] = norm(await el.inputValue().catch(async () => (await el.textContent()) ?? ""));
  }
  return { fields, disabled: await d.locator("input:disabled, textarea:disabled, button:disabled").count(), text: norm(await d.textContent()).slice(0, 500) };
}
async function flow(key: string, email: string, fn: (page: Page) => Promise<unknown>) {
  const { ctx, page, pageErrors } = await login(email);
  try { results[key] = { ...(await fn(page) as object), pageErrors }; }
  catch (e) { results[key] = { error: String(e).split("\n")[0].slice(0, 160), pageErrors }; }
  await page.screenshot({ path: `${out}/${key}.png` }).catch(() => {});
  await ctx.close();
}

// student-group-evaluation: syncOpenState
await flow("sc-group-evaluation", "martin.odegaard@test.com", async (page) => {
  await page.goto(`${base}/sc/schools/ARSENAL_SCH/groups`, { waitUntil: "networkidle" });
  await rowMenu(page, /Group/, "View student group evaluation");
  return dialogState(page);
});
// fellow-details-form: loadFellowIntoForm, then change county to exercise the sub-county effect
await flow("hc-edit-fellow", "mikel.arteta@test.com", async (page) => {
  await page.goto(`${base}/hc/fellows`, { waitUntil: "networkidle" });
  await rowMenu(page, "Bukayo Saka", "Edit fellow information");
  const opened = await dialogState(page);
  const county = page.getByRole("dialog").getByRole("combobox").filter({ hasText: /Nairobi|County|Select/ }).first();
  await county.click(); await page.getByRole("option").first().click().catch(() => {});
  await page.waitForTimeout(400);
  return { opened, afterCountyChange: await dialogState(page) };
});
// student-details-form: resetFormForStudent
await flow("sc-edit-student", "martin.odegaard@test.com", async (page) => {
  await page.goto(`${base}/sc/schools/ARSENAL_SCH/students`, { waitUntil: "networkidle" });
  const row = page.locator("table tbody tr").first(); await row.hover(); await row.locator("svg").last().click();
  await page.getByText("Edit information", { exact: true }).click();
  return dialogState(page);
});
// weekly-hub-report-button-and-form and create-group: open, close, reopen (form reset on close)
await flow("hc-weekly-report-reopen", "mikel.arteta@test.com", async (page) => {
  await page.goto(`${base}/hc/schools`, { waitUntil: "networkidle" });
  const btn = page.getByRole("button", { name: /weekly hub report/i }).first(); await btn.click();
  const first = await dialogState(page);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300); await btn.click();
  return { first, reopened: await dialogState(page) };
});
// schedule list mode for the supervisor: sessions-provider fetchForFilters + calendar syncs
await flow("sc-schedule-list", "martin.odegaard@test.com", async (page) => {
  await page.goto(`${base}/sc/schedule?mode=list`, { waitUntil: "networkidle" }); await page.waitForTimeout(1200);
  const text = norm(await page.evaluate(() => document.body.innerText)).replace(/\d+ Issues?/g, "");
  await page.getByRole("button", { name: /^Week$|^This week$/i }).first().click().catch(() => {});
  await page.waitForTimeout(1200);
  const afterToggle = norm(await page.evaluate(() => document.body.innerText)).replace(/\d+ Issues?/g, "");
  return { text: text.slice(0, 600), afterToggle: afterToggle.slice(0, 600) };
});
writeFileSync(`${out}/metrics.json`, JSON.stringify(results, null, 2));
console.log(Object.entries(results).map(([k, v]) => `${k}: ${(v as { error?: string }).error ? "ERROR " + (v as { error: string }).error : "ok"} pe=${(v as { pageErrors: string[] }).pageErrors.length}`).join("\n"));
await browser.close();
