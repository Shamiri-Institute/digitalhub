// usage: npx dotenv -c development -- npx tsx capture.mts <label> <email> <pseudonym> <cookieName>
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { sessionCookie } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/lib/auth/session";
import { generateSessionToken } from "/Users/shadracklilan/Workdir/institute/digitalhub-frontend/tests/helpers";

const [label, email, pseudonym] = process.argv.slice(2);
const cookieName = sessionCookie().name;
const out = `/private/tmp/claude-501/-Users-shadracklilan-Workdir-institute-digitalhub-frontend/7d36f958-aa69-467e-968e-e46f88c181e4/scratchpad/bench/out/${label}`;
mkdirSync(out, { recursive: true });

const token = await generateSessionToken(email!);
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: out, size: { width: 1440, height: 900 } },
});
await context.addCookies([{ name: cookieName, value: token, domain: "localhost", path: "/" }]);
const page = await context.newPage();

// warm the dev server compile so timings are not dominated by first compile
await page.goto("http://localhost:3001/sc/clinical", { waitUntil: "networkidle" });

const responses: { url: string; bytes: number; type: string }[] = [];
page.on("response", async (r) => {
  const ct = r.headers()["content-type"] ?? "";
  if (r.request().resourceType() === "document" || ct.includes("text/x-component") || r.request().method() === "POST") {
    try {
      const body = await r.body();
      responses.push({ url: r.url(), bytes: body.length, type: ct.split(";")[0] ?? "" });
    } catch {}
  }
});

const t0 = performance.now();
await page.goto("http://localhost:3001/sc/clinical", { waitUntil: "networkidle" });
const loadMs = Math.round(performance.now() - t0);
await page.screenshot({ path: `${out}/01-list.png`, fullPage: false });

// open the actions dropdown for the target case and choose Case notes
const row = page.getByRole("row", { name: new RegExp(pseudonym!) }).first();
await row.hover();
await row.locator("svg").last().click();
await page.getByText("Case notes", { exact: true }).click();
await page.getByRole("heading", { name: "Case Notes" }).waitFor();
await page.screenshot({ path: `${out}/02-dialog-open.png` });

// pick the first session that already has notes
await page.getByRole("combobox").filter({ hasText: /Select session|-/ }).first().click();
const option = page.getByRole("option").filter({ hasText: "(View only)" }).first();
const optionText = (await option.textContent())?.trim();
await option.click();
await page.getByText("This session already has notes and cannot be edited").waitFor();
await page.screenshot({ path: `${out}/03-dialog-prefilled.png` });

const documentBytes = responses.filter((r) => r.type === "text/html").reduce((n, r) => n + r.bytes, 0);
const actionBytes = responses.filter((r) => r.url.includes("/sc/clinical") && r.type !== "text/html").map((r) => ({ url: r.url.replace("http://localhost:3001", ""), bytes: r.bytes, type: r.type }));
const result = { label, email, pseudonym, optionText, loadMs, documentBytes, other: actionBytes };
writeFileSync(`${out}/metrics.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));

await context.close();
await browser.close();
