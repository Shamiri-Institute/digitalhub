import { type BrowserContext, expect, type Locator, type Page } from "@playwright/test";

import { TIME_ZONE_COOKIE } from "#/lib/schedule-view";

const siteUrl = `http://localhost:${process.env.PORT ?? 3000}`;

export function getUrl(route: string) {
  return `${siteUrl}${route}`;
}

/**
 * The table rows that contain `text`, after typing it into every table search box on the page.
 * Tables show 10 rows a page, so without the search a row can sit on a later page: a "visible"
 * check then fails and a "not listed" check passes for the wrong reason.
 */
export async function searchRows(page: Page, text: string, scope: Page | Locator = page) {
  const boxes = scope.getByPlaceholder("Search...");
  // Streamed content arrives in a hidden container before it replaces the fallback, so wait until
  // every box on the page is a visible one.
  await expect(async () => {
    const visible = await Promise.all((await boxes.all()).map((box) => box.isVisible()));
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.every(Boolean)).toBe(true);
  }).toPass();
  for (const box of await boxes.all()) {
    await waitForHydration(box);
    await box.fill(text);
  }
  return scope.getByRole("row").filter({ hasText: text });
}

/** Rows that carry data; the empty state renders one row with a single spanning cell. */
export function dataRows(page: Page) {
  return page
    .locator("tbody tr")
    .filter({ hasNot: page.locator("td[colspan]") })
    .filter({ hasNot: page.locator('[data-slot="skeleton"]') });
}

/** A row by the exact text of one of its cells, after searching the table for it. */
export async function rowWithCell(page: Page, scope: Locator, text: string) {
  const rows = await searchRows(page, text, scope);
  return rows.filter({ has: page.getByRole("cell", { name: text, exact: true }) });
}

/**
 * Opens a row's actions menu and chooses `action`. A table can re-render while its data loads,
 * which closes an open menu, so opening and choosing retry together.
 */
export async function chooseRowAction(page: Page, row: Locator, action: string) {
  await expect(async () => {
    await row.getByRole("cell").last().click();
    await page.getByRole("menu").getByText(action, { exact: true }).click({ timeout: 5000 });
  }).toPass({ timeout: 30_000 });
}

/** Expands `row` and returns the cell under it that holds the row's nested table. */
export async function expandRow(page: Page, row: Locator) {
  await row.getByRole("button").first().click();
  return page.locator("td:has(table)");
}

/** The cell of `row` under the column headed `header`. */
export async function cellUnder(page: Page, row: Locator, header: string) {
  const headers = await page.getByRole("columnheader").allInnerTexts();
  const index = headers.findIndex((text) => text.trim() === header);
  if (index === -1) throw new Error(`no column headed "${header}" in ${JSON.stringify(headers)}`);
  return row.getByRole("cell").nth(index);
}

/**
 * A schedule page (`path` with its query) showing the period around `date`. The server reads the
 * viewer's time zone from a cookie, so the test sets it to its own and names the date in it.
 */
export async function scheduleUrl(context: BrowserContext, path: string, date: Date) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  await context.addCookies([
    { name: TIME_ZONE_COOKIE, value: timeZone, domain: "localhost", path: "/" },
  ]);
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
  return getUrl(`${path}${path.includes("?") ? "&" : "?"}date=${localDate}`);
}

/**
 * Waits until React has hydrated `element`. On a production build the HTML arrives before the
 * JavaScript, and text typed into an input before hydration is reset by it. React attaches its
 * props to a DOM node when it hydrates it.
 */
async function waitForHydration(element: Locator) {
  await expect
    .poll(() =>
      element.evaluate((node) => Object.keys(node).some((key) => key.startsWith("__reactProps"))),
    )
    .toBe(true);
}
