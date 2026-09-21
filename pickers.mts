// usage: npx dotenv -c development -- npx tsx pickers.mts <label>
import { chromium, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { sessionCookie } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/lib/auth/session";
import { generateSessionToken } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/tests/helpers";
const [label] = process.argv.slice(2);
const out = `/private/tmp/claude-501/-Users-shadracklilan-Workdir-institute-digitalhub-frontend/88b3163f-2751-4602-98a3-5dd2a244bc66/scratchpad/bench/out/pickers-${label}`;
mkdirSync(out, { recursive: true });
const base = "http://localhost:3001";
const browser = await chromium.launch();
const results: Record<string, unknown> = {};
async function login(email: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: sessionCookie().name, value: await generateSessionToken(email), domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();
  const pageErrors: string[] = []; page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 120)));
  return { ctx, page, pageErrors };
}
async function pickerState(page: Page) {
  await page.getByRole("grid").first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(300);
  const selects = page.locator("select");
  const years: string[] = []; const months: string[] = [];
  for (const sel of await selects.all()) {
    const opts = await sel.locator("option").allInnerTexts();
    if (opts.every((o) => /^\d{4}$/.test(o.trim()))) years.push(...opts.map((o) => o.trim()));
    else months.push(...opts.map((o) => o.trim()));
  }
  const caption = await page.locator("[class*=caption_label]").first().innerText().catch(() => "");
  const active = await page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName.toLowerCase()}${a.className ? "." + String(a.className).split(" ").slice(0, 2).join(".") : ""}[${a.getAttribute("aria-label") ?? a.textContent?.trim().slice(0, 20) ?? ""}]` : "none"; });
  const dayCount = await page.getByRole("gridcell").count();
  return { caption, years: years.length ? { first: years[0], last: years[years.length - 1], count: years.length } : null, months: months.length, dayCount, activeElement: active };
}
async function flow(key: string, email: string, fn: (page: Page) => Promise<unknown>) {
  const { ctx, page, pageErrors } = await login(email);
  try { results[key] = { ...(await fn(page) as object), pageErrors }; }
  catch (e) { results[key] = { error: String(e).split("\n")[0].slice(0, 160), pageErrors }; }
  await page.screenshot({ path: `${out}/${key}.png` }).catch(() => {});
  await ctx.close();
}
// New clinical case form: date of birth picker with a year dropdown (fromYear/toYear -> startMonth/endMonth)
await flow("sc-new-case-dob", "martin.odegaard@test.com", async (page) => {
  await page.goto(`${base}/sc/clinical`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /new case/i }).first().click();
  const dialog = page.getByRole("dialog"); await dialog.waitFor();
  await dialog.getByText("Add new student", { exact: true }).click();
  await dialog.getByRole("button", { name: /pick a date/i }).first().click();
  return pickerState(page);
});
// Schedule a new session: session date picker (initialFocus -> autoFocus)
await flow("sc-new-session-date", "martin.odegaard@test.com", async (page) => {
  await page.goto(`${base}/sc/schedule`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /schedule a session/i }).first().click();
  const dialog = page.getByRole("dialog"); await dialog.waitFor();
  await dialog.getByRole("button", { name: /pick a date/i }).first().click();
  return pickerState(page);
});
writeFileSync(`${out}/metrics.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
await browser.close();
