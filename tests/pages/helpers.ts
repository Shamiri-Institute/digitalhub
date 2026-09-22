import type { Page } from "@playwright/test";

const siteUrl = `http://localhost:${process.env.PORT ?? 3000}`;

export function getUrl(route: string) {
  return `${siteUrl}${route}`;
}

/** Rows that carry data; the empty state renders one row with a single spanning cell. */
export function dataRows(page: Page) {
  return page.locator("tbody tr").filter({ hasNot: page.locator("td[colspan]") });
}
