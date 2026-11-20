import { expect, type Page } from "@playwright/test";

import { getUrl, searchRows } from "#/tests/pages/helpers";

/** Opens the ticket called `subject` from the list at `path`, and returns the ticket's page. */
export async function openTicket(page: Page, path: string, subject: string) {
  await page.goto(getUrl(path));
  await (await searchRows(page, subject)).getByRole("link", { name: subject, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: subject })).toBeVisible();
  return ticketPage(page);
}

/** The ticket's own content, where the holder's next step and the creator's actions both live. */
export function ticketPage(page: Page) {
  return page.getByRole("main");
}

export function activity(page: Page) {
  return page.getByRole("list", { name: "Activity" });
}

/** Opens `action`'s form in the next-step column and writes `reason`, without submitting it. */
export async function fillAction(page: Page, action: string, reason: string) {
  await ticketPage(page).getByRole("button", { name: action, exact: true }).click();
  const form = page.getByRole("form", { name: action });
  await form.getByLabel("Reason").fill(reason);
  return form;
}

export async function submitAction(page: Page, action: string) {
  const form = page.getByRole("form", { name: action });
  await form.getByRole("button", { name: action, exact: true }).click();
  await expect(form).toBeHidden();
}

/** Takes `action` with `reason` on the open ticket page. */
export async function takeAction(page: Page, action: string, reason: string) {
  await fillAction(page, action, reason);
  await submitAction(page, action);
}
