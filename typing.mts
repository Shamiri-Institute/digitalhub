// usage: npx dotenv -c development -- npx tsx typing.mts <label>
import { chromium, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { sessionCookie } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/lib/auth/session";
import { generateSessionToken } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/tests/helpers";
const [label] = process.argv.slice(2);
const out = `/private/tmp/claude-501/-Users-shadracklilan-Workdir-institute-digitalhub-frontend/88b3163f-2751-4602-98a3-5dd2a244bc66/scratchpad/bench/out/typing-${label}`;
mkdirSync(out, { recursive: true });
const base = "http://localhost:3001";
const browser = await chromium.launch();
async function login(email: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: sessionCookie().name, value: await generateSessionToken(email), domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 120)));
  return { ctx, page, pageErrors };
}
async function typeAndCheck(page: Page, selector: string, text: string) {
  const el = page.locator(selector);
  await el.click();
  await el.pressSequentially(text, { delay: 50 });
  const value = await el.inputValue();
  const focused = await page.evaluate((s) => document.activeElement === document.querySelector(s), selector);
  return { value, focused, ok: value === text && focused };
}
const results: Record<string, unknown> = {};

// 1. Fellow activity sub-table row menu -> Create clinical case -> type pseudonym
{
  const { ctx, page, pageErrors } = await login("martin.odegaard@test.com");
  try {
    await page.goto(`${base}/sc/triage`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Expand" }).first().click();
    await page.waitForTimeout(500);
    const subRow = page.locator("tbody tr").filter({ has: page.getByText("None", { exact: true }) }).last();
    await subRow.hover(); await subRow.locator("svg").last().click();
    await page.getByText("Create clinical case", { exact: true }).click();
    await page.getByRole("dialog").waitFor();
    results["fellow-activity:create-case:pseudonym"] = await typeAndCheck(page, "#pseudonym", "Blue Lion");
    await page.screenshot({ path: `${out}/create-case.png` });
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    // 2. Requires action table -> Mark reviewed -> type note (if any row exists)
    const reviewRows = page.locator("table tbody tr").filter({ hasText: /d$/ });
    const rowCount = await page.locator("table tbody tr").count();
    let found = false;
    for (let i = 0; i < rowCount && !found; i++) {
      const row = page.locator("table tbody tr").nth(i);
      const svg = row.locator("svg").last();
      if (!(await svg.count())) continue;
      await row.hover(); await svg.click().catch(() => {});
      const item = page.getByText("Mark reviewed", { exact: true });
      if (await item.count()) {
        await item.click(); await page.getByRole("dialog").waitFor();
        results["requires-action:mark-reviewed:note"] = await typeAndCheck(page, "textarea", "Assessed student, no concern.");
        await page.screenshot({ path: `${out}/mark-reviewed.png` });
        await page.keyboard.press("Escape");
        found = true;
      } else { await page.keyboard.press("Escape"); }
    }
    if (!found) results["requires-action:mark-reviewed:note"] = { skipped: "no requires-action row for this supervisor", rows: rowCount, reviewRows: await reviewRows.count() };
  } catch (e) { results["triage:error"] = String(e).split("\n")[0].slice(0, 200); await page.screenshot({ path: `${out}/triage-error.png` }).catch(() => {}); }
  results["triage:pageErrors"] = pageErrors;
  await ctx.close();
}
// 3. Calendar: edit fellow -> date of birth picker -> next month chevron
{
  const { ctx, page, pageErrors } = await login("mikel.arteta@test.com");
  try {
    await page.goto(`${base}/hc/fellows`, { waitUntil: "networkidle" });
    const row = page.locator("table tbody tr").filter({ hasText: "Bukayo Saka" }).first();
    await row.hover(); await row.locator("svg").last().click();
    await page.getByText("Edit fellow information", { exact: true }).click();
    const dialog = page.getByRole("dialog"); await dialog.waitFor();
    await dialog.getByText("Date of birth").locator("..").getByRole("button").first().click();
    const grid = page.getByRole("grid"); await grid.waitFor();
    const caption = () => page.locator(".rdp-caption_label, [class*=caption_label]").first().innerText();
    const before = await caption();
    await page.getByRole("button", { name: /next month/i }).click();
    await page.waitForTimeout(200);
    const after = await caption();
    results["calendar:next-month"] = { before, after, ok: before !== after };
    await page.screenshot({ path: `${out}/calendar.png` });
  } catch (e) { results["calendar:error"] = String(e).split("\n")[0].slice(0, 200); await page.screenshot({ path: `${out}/calendar-error.png` }).catch(() => {}); }
  results["calendar:pageErrors"] = pageErrors;
  await ctx.close();
}
console.log(JSON.stringify(results, null, 1));
await browser.close();
