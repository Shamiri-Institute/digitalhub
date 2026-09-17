// usage: npx dotenv -c development -- npx tsx capture-attendance.mts <label> <email>
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { sessionCookie } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/lib/auth/session";
import { generateSessionToken } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/tests/helpers";

const [label, email] = process.argv.slice(2);
const out = `/private/tmp/claude-501/-Users-shadracklilan-Workdir-institute-digitalhub-frontend/7d36f958-aa69-467e-968e-e46f88c181e4/scratchpad/bench/out/attendance-${label}`;
mkdirSync(out, { recursive: true });
const base = "http://localhost:3001";

const token = await generateSessionToken(email!);
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: out, size: { width: 1440, height: 900 } },
});
await context.addCookies([{ name: sessionCookie().name, value: token, domain: "localhost", path: "/" }]);
const page = await context.newPage();

await page.goto(`${base}/sc/fellows`, { waitUntil: "networkidle" }); // warm compile
await page.goto(`${base}/sc/fellows`, { waitUntil: "networkidle" });

const fellowRow = page.locator("table tbody tr").first();
const fellowName = (await fellowRow.locator("td").nth(1).textContent())?.trim();
await fellowRow.locator("td").first().click(); // expander
const subRow = page.locator("table table tbody tr").first();
await subRow.waitFor();
const groupName = (await subRow.locator("td").first().textContent())?.trim();
await subRow.hover();
await subRow.locator("svg").last().click();
await page.getByText("Mark attendance", { exact: true }).click();
await page.getByRole("heading", { name: "Mark fellow attendance" }).waitFor();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/01-dialog-default.png` });

const trigger = page.getByRole("dialog").getByRole("combobox").first();
const defaultSessionText = (await trigger.textContent())?.trim();
await trigger.click();
const options = (await page.getByRole("option").allTextContents()).map((o) => o.trim());
await page.screenshot({ path: `${out}/02-options.png` });
await page.keyboard.press("Escape");

const result = { label, email, fellowName, groupName, defaultSessionText, options };
writeFileSync(`${out}/metrics.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
await context.close();
await browser.close();
