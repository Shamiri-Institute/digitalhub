import type { Page } from "@playwright/test";

const siteUrl = `http://localhost:${process.env.PORT ?? 3000}`;

export function getUrl(route: string) {
  return `${siteUrl}${route}`;
}

/**
 * The table rows that contain `text`, after typing it into every table search box on the page.
 * Tables show 10 rows a page, so without the search a row can sit on a later page: a "visible"
 * check then fails and a "not listed" check passes for the wrong reason.
 */
export async function searchRows(page: Page, text: string) {
  await page.getByPlaceholder("Search...").first().waitFor();
  for (const box of await page.getByPlaceholder("Search...").all()) {
    await box.fill(text);
  }
  return page.getByRole("row").filter({ hasText: text });
}

/** Rows that carry data; the empty state renders one row with a single spanning cell. */
export function dataRows(page: Page) {
  return page.locator("tbody tr").filter({ hasNot: page.locator("td[colspan]") });
}
